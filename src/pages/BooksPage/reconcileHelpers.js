/** Bank / payment calendar day (YYYY-MM-DD) — not invoice date. */
export const dayKey = (value) => {
  const raw = String(value || '');
  const m = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : raw.slice(0, 10);
};

/** Display day only, e.g. 20 Jul 2026 */
export const dayLabel = (value) => {
  const key = dayKey(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return key || '—';
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

export const indexByDay = (rows, dateField) => {
  const map = new Map();
  for (const row of rows || []) {
    const key = dayKey(row[dateField]);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return map;
};

/** Newest day first. */
export const groupByDay = (rows, dateField) =>
  [...indexByDay(rows, dateField).entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0))
    .map(([key, dayRows]) => ({ dayKey: key, label: dayLabel(key), rows: dayRows }));

const money = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Max the bank line may fall short of booked remaining. Extra has no cap. */
export const AMOUNT_TOLERANCE = 10;

/** Line covers target: extra OK, shortfall ≤ ₹10. */
export const coversAmount = (lineAmount, target) =>
  Number(lineAmount) + AMOUNT_TOLERANCE >= Number(target);

/** Covers target without going over — Exact / Completes, not extra. */
export const nearAmount = (lineAmount, target) => {
  const line = Number(lineAmount);
  const dest = Number(target);
  return line <= dest && coversAmount(line, dest);
};

export const CREATE_LOAN = '__create_loan__';
export const CREATE_CASH_DEPOSIT = '__create_cash_deposit__';
export const CREATE_ADVANCE = '__create_advance__';
export const CREATE_MONEY_OUT = '__create_money_out__';
export const CREATE_MATCH_OPTIONS = [
  { paymentId: CREATE_LOAN, label: 'Loan', hint: 'Generic money in — not customer advance' },
  { paymentId: CREATE_CASH_DEPOSIT, label: 'Cash deposit', hint: 'Cash → this bank account' },
  { paymentId: CREATE_ADVANCE, label: 'Customer advance', hint: 'Customer paid before invoice' },
];
export const CREATE_DEBIT_OPTIONS = [
  { paymentId: CREATE_MONEY_OUT, label: 'Money out', hint: 'Book this debit as a bank money-out' },
  { paymentId: CREATE_LOAN, label: 'Loan return', hint: 'Loan repayment / return' },
];

export const RECONCILE_SIDES = {
  credit: {
    key: 'credit',
    label: 'Money in',
    shortLabel: 'In',
    hint: 'Credits on the bank statement — sales, advances, loans, deposits.',
    amountField: 'credit',
    amountClass: 'in',
    matchLabel: 'Receipt / entry',
    emptyTitle: 'No unmatched credits',
    emptyBody: 'Upload an HDFC delimited statement or switch to Money out.',
    linkedHint: 'Credits matched to invoices, advances, loans, or deposits.',
    openTitle: 'Open receipts',
    openHint: 'Booked payments with room left to link statement credits.',
  },
  debit: {
    key: 'debit',
    label: 'Money out',
    shortLabel: 'Out',
    hint: 'Debits on the bank statement — supplier payments, transfers out.',
    amountField: 'debit',
    amountClass: 'out',
    matchLabel: 'Match / create',
    emptyTitle: 'No unmatched debits',
    emptyBody: 'Debits from imported statements appear here. Create money out or book a purchase payment.',
    linkedHint: 'Debits matched to purchases, loans, or money-out entries.',
    openTitle: 'Open money out',
    openHint: 'Booked purchase payments and money-out entries waiting for a bank debit.',
  },
};

export const customerDisplayName = (customer) =>
  customer?.fullName || customer?.phone || 'Customer';

export const isCreateMatchId = (value) =>
  value === CREATE_LOAN || value === CREATE_CASH_DEPOSIT || value === CREATE_ADVANCE || value === CREATE_MONEY_OUT;

export const matchKindOf = (option) => {
  if (option?.kind === 'PURCHASE') return 'PURCHASE_PAYMENT';
  if (option?.kind && option.kind !== 'INVOICE') return 'FINANCIAL_TRANSACTION';
  return 'INVOICE_PAYMENT';
};

const paymentIdOf = (payment) => payment.paymentId || payment.id;

/**
 * Why this payment ranks for a credit (or selected-credit sum).
 * Exact = full booked amount, Completes = fills remaining, Split = partial.
 */
export const matchFitTag = (lineAmount, payment) => {
  if (!payment) return null;
  const credit = Number(lineAmount || 0);
  const amount = Number(payment.amount);
  const remaining = Number(payment.remaining ?? amount);
  if (nearAmount(credit, amount)) return 'Exact';
  if (nearAmount(credit, remaining)) return 'Completes';
  if (credit < remaining) return 'Split';
  return null;
};

/** Payments whose remaining is covered by selectedCreditsSum (extra OK, shortfall ≤ ₹10). */
export const paymentsMatchingCreditSum = (payments, sum) =>
  (payments || []).filter((payment) => {
    const remaining = Number(payment.remaining ?? payment.amount);
    return coversAmount(sum, remaining);
  });

/**
 * Same-day payments with remaining > 0. Extra over remaining is allowed.
 * Completes (covers remaining) first, then splits.
 */
export const bulkMatchOptions = (payments, sum, txnDate) => {
  const day = dayKey(txnDate);
  const amount = Number(sum || 0);
  const fits = (payments || []).filter((payment) => {
    if (day && dayKey(payment.paidAt) !== day) return false;
    return Number(payment.remaining ?? payment.amount) > 0;
  });
  const exactIds = new Set(paymentsMatchingCreditSum(fits, amount).map(paymentIdOf));
  return [...fits]
    .sort((a, b) => Number(exactIds.has(paymentIdOf(b))) - Number(exactIds.has(paymentIdOf(a))))
    .map((payment) => ({
      ...payment,
      paymentId: paymentIdOf(payment),
      fit: matchFitTag(amount, payment),
      completes: exactIds.has(paymentIdOf(payment)),
    }));
};

/**
 * Same-day payments with remaining > 0. Extra over remaining is allowed.
 * Suggestions first, then other same-day unmatched payments.
 */
export const bankMatchOptions = (txnDate, credit, suggestions = [], unmatchedPayments = []) => {
  const day = dayKey(txnDate);
  const amount = Number(credit || 0);
  const fits = (p) => dayKey(p.paidAt) === day && Number(p.remaining ?? p.amount) > 0;
  const sameDaySuggestions = suggestions.filter(fits);
  const suggestionIds = new Set(sameDaySuggestions.map(paymentIdOf));
  return [
    ...sameDaySuggestions.map((s) => ({
      ...s,
      paymentId: paymentIdOf(s),
      suggested: true,
      fit: matchFitTag(amount, s),
    })),
    ...unmatchedPayments
      .filter((p) => fits(p) && !suggestionIds.has(paymentIdOf(p)))
      .map((p) => ({
        ...p,
        paymentId: paymentIdOf(p),
        suggested: false,
        fit: matchFitTag(amount, p),
      })),
  ];
};

export const paymentOptionLabel = (option, lineAmount) => {
  const remaining = Number(option.remaining ?? option.amount);
  const amount = Number(option.amount);
  const isPartial = remaining + 0.001 < amount;
  const fit = option.fit || matchFitTag(lineAmount, option);
  const fitLabel = fit && fit !== 'Exact' ? fit : null;
  const kind = option.kind && option.kind !== 'INVOICE' ? option.kind : null;
  const title = kind
    ? option.invoiceNumber
      || (kind === 'CASH_DEPOSIT'
        ? 'Cash deposit'
        : kind === 'LOAN'
          ? 'Loan'
          : kind === 'ADVANCE'
            ? 'Advance'
            : kind === 'PURCHASE'
              ? 'Purchase'
              : kind === 'MONEY_OUT'
                ? 'Money Out'
              : 'Money In')
    : option.invoiceNumber;
  const createLabel = CREATE_MATCH_OPTIONS.find((item) => item.paymentId === option?.paymentId)
    || CREATE_DEBIT_OPTIONS.find((item) => item.paymentId === option?.paymentId);
  if (createLabel) return [createLabel.label, createLabel.hint].filter(Boolean).join(' — ');
  return [
    fitLabel,
    option.suggested && !fitLabel ? 'Suggested' : null,
    title,
    option.customerName,
    kind ? null : option.mode,
    money(amount),
    isPartial ? `left ${money(remaining)}` : null,
    option.invoiceStatus,
  ]
    .filter(Boolean)
    .join(' · ');
};

export const paymentFillPct = (amount, remaining) => {
  const amt = Number(amount || 0);
  const left = Number(remaining ?? amt);
  const linked = Math.max(0, amt - left);
  return {
    linked,
    amount: amt,
    pct: amt > 0 ? Math.min(100, (linked / amt) * 100) : 0,
  };
};

export const monthKey = (value) => dayKey(value).slice(0, 7);

export const shiftMonth = (yyyyMm, delta) => {
  const [year, month] = String(yyyyMm || '').split('-').map(Number);
  if (!year || !month) return yyyyMm;
  const next = new Date(Date.UTC(year, month - 1 + Number(delta || 0), 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`;
};

export const daysInMonth = (yyyyMm) => {
  const [year, month] = String(yyyyMm || '').split('-').map(Number);
  if (!year || !month) return [];
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const pad = String(month).padStart(2, '0');
  return Array.from({ length: last }, (_, i) => `${year}-${pad}-${String(i + 1).padStart(2, '0')}`);
};

const countByDay = (rows, dateField) => {
  const map = new Map();
  for (const row of rows || []) {
    const key = dayKey(row[dateField]);
    if (!key) continue;
    map.set(key, (map.get(key) || 0) + 1);
  }
  return map;
};

/** empty | action | done */
export const reconcileDayStatus = (unmatchedCount, linkedCount) => {
  if (Number(unmatchedCount) > 0) return 'action';
  if (Number(linkedCount) > 0) return 'done';
  return 'empty';
};

export const addUtcDays = (value, delta) => {
  const key = dayKey(value);
  const [year, month, day] = key.split('-').map(Number);
  if (!year || !month || !day) return key;
  const next = new Date(Date.UTC(year, month - 1, day + Number(delta || 0)));
  return next.toISOString().slice(0, 10);
};

/** Monday of the UTC week containing value. */
export const weekStartKey = (value) => {
  const key = dayKey(value);
  const [year, month, day] = key.split('-').map(Number);
  if (!year || !month || !day) return key;
  const dt = new Date(Date.UTC(year, month - 1, day));
  const dow = dt.getUTCDay();
  return addUtcDays(key, dow === 0 ? -6 : 1 - dow);
};

export const inPeriod = (value, period) => {
  if (!period?.start || !period?.end) return true;
  const key = dayKey(value);
  return Boolean(key) && key >= period.start && key <= period.end;
};

const shortDay = (value) => {
  const key = dayKey(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return key;
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
};

const periodLabel = (grain, start, end) => {
  if (grain === 'month') {
    return new Date(`${start}T00:00:00.000Z`).toLocaleDateString('en-IN', {
      month: 'short',
      timeZone: 'UTC',
    });
  }
  if (grain === 'week') return `${shortDay(start)} – ${shortDay(end)}`;
  return String(Number(start.slice(8, 10)));
};

export const periodsForGrain = (grain, anchorYm) => {
  const [year, month] = String(anchorYm || '').split('-').map(Number);
  if (!year || !month) return [];
  if (grain === 'month') {
    return Array.from({ length: 12 }, (_, i) => {
      const start = `${year}-${String(i + 1).padStart(2, '0')}-01`;
      const days = daysInMonth(`${year}-${String(i + 1).padStart(2, '0')}`);
      const end = days[days.length - 1];
      return { id: start.slice(0, 7), grain, start, end, label: periodLabel('month', start, end), sub: String(year) };
    });
  }
  if (grain === 'week') {
    const monthDays = daysInMonth(anchorYm);
    const seen = new Set();
    const weeks = [];
    for (const day of monthDays) {
      const start = weekStartKey(day);
      if (seen.has(start)) continue;
      seen.add(start);
      const end = addUtcDays(start, 6);
      weeks.push({
        id: start,
        grain,
        start,
        end,
        label: periodLabel('week', start, end),
        sub: 'Week',
      });
    }
    return weeks;
  }
  return daysInMonth(anchorYm).map((start) => {
    const [y, m, d] = start.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return {
      id: start,
      grain: 'day',
      start,
      end: start,
      label: String(d),
      sub: dt.toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'UTC' }),
    };
  });
};

export const shiftTimelineAnchor = (anchorYm, grain, delta) => {
  if (grain === 'month') {
    const year = Number(String(anchorYm || '').slice(0, 4)) + Number(delta || 0);
    return `${year}-01`;
  }
  return shiftMonth(anchorYm, delta);
};

export const timelineAnchorTitle = (anchorYm, grain) => {
  const [year, month] = String(anchorYm || '').split('-').map(Number);
  if (!year || !month) return anchorYm || '';
  if (grain === 'month') return String(year);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-IN', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

export const reconcileTimeline = (grain, anchorYm, unmatchedCredits = [], linkedCredits = []) => {
  const unmatched = countByDay(unmatchedCredits, 'txnDate');
  const linked = countByDay(linkedCredits, 'txnDate');
  return periodsForGrain(grain, anchorYm).map((period) => {
    let unmatchedCount = 0;
    let linkedCount = 0;
    for (let key = period.start; key <= period.end; key = addUtcDays(key, 1)) {
      unmatchedCount += unmatched.get(key) || 0;
      linkedCount += linked.get(key) || 0;
    }
    return {
      ...period,
      unmatchedCount,
      linkedCount,
      status: reconcileDayStatus(unmatchedCount, linkedCount),
    };
  });
};

export const reconcileMonthTimeline = (yyyyMm, unmatchedCredits = [], linkedCredits = []) =>
  reconcileTimeline('day', yyyyMm, unmatchedCredits, linkedCredits).map((period) => ({
    dayKey: period.start,
    day: Number(period.label),
    weekday: period.sub,
    unmatchedCount: period.unmatchedCount,
    linkedCount: period.linkedCount,
    status: period.status,
  }));
