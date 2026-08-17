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

export const AMOUNT_TOLERANCE = 1;

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
  if (credit > remaining + AMOUNT_TOLERANCE) return null;
  if (Math.abs(amount - credit) <= AMOUNT_TOLERANCE) return 'Exact';
  if (Math.abs(remaining - credit) <= AMOUNT_TOLERANCE) return 'Completes';
  return 'Split';
};

/** Payments whose remaining ≈ selectedCreditsSum (±₹1). */
export const paymentsMatchingCreditSum = (payments, sum) =>
  (payments || []).filter((payment) => {
    const remaining = Number(payment.remaining ?? payment.amount);
    return Math.abs(remaining - Number(sum)) <= AMOUNT_TOLERANCE;
  });

/**
 * Same-day payments with enough remaining for a bulk credit sum.
 * Exact-remaining matches (completes) first, then partial fits.
 */
export const bulkMatchOptions = (payments, sum, txnDate) => {
  const day = dayKey(txnDate);
  const amount = Number(sum || 0);
  const fits = (payments || []).filter((payment) => {
    if (day && dayKey(payment.paidAt) !== day) return false;
    const remaining = Number(payment.remaining ?? payment.amount);
    return amount <= remaining + AMOUNT_TOLERANCE;
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
 * Only payments booked on the same day as the bank credit, with enough remaining.
 * Suggestions first, then other same-day unmatched payments.
 */
export const bankMatchOptions = (txnDate, credit, suggestions = [], unmatchedPayments = []) => {
  const day = dayKey(txnDate);
  const amount = Number(credit || 0);
  const fits = (p) => {
    if (dayKey(p.paidAt) !== day) return false;
    const remaining = Number(p.remaining ?? p.amount);
    return amount <= remaining + AMOUNT_TOLERANCE;
  };
  const sameDaySuggestions = suggestions.filter(fits);
  const suggestionIds = new Set(sameDaySuggestions.map((s) => s.paymentId));
  return [
    ...sameDaySuggestions.map((s) => ({ ...s, suggested: true, fit: matchFitTag(amount, s) })),
    ...unmatchedPayments
      .filter((p) => fits(p) && !suggestionIds.has(p.paymentId))
      .map((p) => ({ ...p, suggested: false, fit: matchFitTag(amount, p) })),
  ];
};

export const paymentOptionLabel = (option, lineAmount) => {
  const remaining = Number(option.remaining ?? option.amount);
  const amount = Number(option.amount);
  const isPartial = remaining + 0.001 < amount;
  const fit = option.fit || matchFitTag(lineAmount, option);
  return [
    fit,
    option.suggested && !fit ? 'Suggested' : null,
    option.invoiceNumber,
    option.customerName,
    option.mode,
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
