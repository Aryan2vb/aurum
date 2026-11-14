import { drawCaption, drawFixedTable } from './invoicePeriodSummary';
import { getAdvanceTotalIn } from './advanceTotals';

/**
 * Advance report: TOTAL row for the exported table and an "ADVANCE SUMMARY"
 * KPI page for the PDF, styled like the invoice report's PERIOD SUMMARY page.
 */

const MARGIN = 28;
const GAP = 14;
const SECTION_GAP = 16;

export const ADVANCE_AMOUNT_COLUMNS = [
  'Total Received',
  'Applied to Invoices',
  'Refunded',
  'Transferred Out',
  'Transferred In',
  'Corrections',
  'Available Balance',
];

const METHOD_LABELS = {
  CASH: 'Cash', UPI: 'UPI', BANK_TRANSFER: 'Bank transfer', CHEQUE: 'Cheque', NEFT: 'NEFT',
  RTGS: 'RTGS', IMPS: 'IMPS', OLD_GOLD: 'Old gold', CREDIT: 'Credit', OTHER: 'Other',
};

const n = (v) => {
  const x = parseFloat(v);
  return Number.isFinite(x) ? x : 0;
};

const fmtAmt = (v) =>
  `Rs. ${n(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtPct = (part, whole) => (whole > 0 ? `${((part / whole) * 100).toFixed(1)}%` : '-');

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

/** Append a TOTAL row (sums of the amount columns present) to flattened advance rows. */
export const appendAdvanceTotalsRow = (flattened = []) => {
  if (!flattened.length) return flattened;
  const keys = Object.keys(flattened[0]);
  const totals = Object.fromEntries(keys.map((k) => [k, '']));
  const labelKey = keys.includes('Customer Name') ? 'Customer Name' : keys[0];
  totals[labelKey] = 'TOTAL';
  if (keys.includes('Customer Code')) {
    totals['Customer Code'] = `${flattened.length} customer${flattened.length !== 1 ? 's' : ''}`;
  }
  ADVANCE_AMOUNT_COLUMNS.filter((c) => keys.includes(c)).forEach((col) => {
    totals[col] = flattened.reduce((sum, row) => sum + n(row[col]), 0).toFixed(2);
  });
  return [...flattened, totals];
};

export const isAdvanceTotalsRow = (row) => row && row['Customer Name'] === 'TOTAL';

const lastActivityOf = (row) => {
  const dates = (row.transactions || row.deposits || [])
    .map((t) => t.date || t.createdAt)
    .filter(Boolean)
    .map((d) => new Date(d).getTime())
    .filter(Number.isFinite);
  if (dates.length) return new Date(Math.max(...dates));
  return row.lastReceivedAt ? new Date(row.lastReceivedAt) : null;
};

const AGE_BUCKETS = [
  { label: '0-30 days', max: 30 },
  { label: '31-90 days', max: 90 },
  { label: '91-180 days', max: 180 },
  { label: 'Over 180 days', max: Infinity },
];

/** KPIs for the advance report, computed from the raw report rows. */
export const buildAdvanceSummary = (rows = [], now = new Date()) => {
  const withBalance = rows.filter((r) => n(r.availableBalance) > 0);
  const held = withBalance.reduce((s, r) => s + n(r.availableBalance), 0);
  const largest = withBalance.reduce((m, r) => Math.max(m, n(r.availableBalance)), 0);

  const flow = {
    deposits: rows.reduce((s, r) => s + n(r.totalReceived), 0),
    transfersIn: rows.reduce((s, r) => s + n(r.totalTransferIn), 0),
    corrections: rows.reduce((s, r) => s + n(r.totalCorrectionCredit) - n(r.totalCorrectionDebit), 0),
    applied: rows.reduce((s, r) => s + n(r.totalApplied), 0),
    refunded: rows.reduce((s, r) => s + n(r.totalRefunded), 0),
    transfersOut: rows.reduce((s, r) => s + n(r.totalTransferOut), 0),
  };
  flow.totalIn = rows.reduce((s, r) => s + getAdvanceTotalIn(r), 0);
  flow.totalOut = flow.applied + flow.refunded + flow.transfersOut;
  flow.net = flow.totalIn - flow.totalOut;

  const modes = {};
  rows.forEach((r) => {
    (r.deposits || []).forEach((d) => {
      const key = d.paymentMethod || 'OTHER';
      modes[key] = modes[key] || { count: 0, amount: 0 };
      modes[key].count += 1;
      modes[key].amount += n(d.amount);
    });
  });
  const byMode = Object.entries(modes)
    .map(([mode, v]) => ({ mode: METHOD_LABELS[mode] || mode, ...v }))
    .sort((a, b) => b.amount - a.amount);

  const ageing = AGE_BUCKETS.map((b) => ({ label: b.label, count: 0, amount: 0 }));
  withBalance.forEach((r) => {
    const last = lastActivityOf(r);
    const days = last ? Math.floor((now.getTime() - last.getTime()) / 86400000) : Infinity;
    const idx = AGE_BUCKETS.findIndex((b) => days <= b.max);
    ageing[idx].count += 1;
    ageing[idx].amount += n(r.availableBalance);
  });

  const top = [...withBalance]
    .sort((a, b) => n(b.availableBalance) - n(a.availableBalance))
    .slice(0, 5)
    .map((r) => ({
      name: r.customerName || '-',
      code: r.customerCode || '',
      balance: n(r.availableBalance),
      lastActivity: lastActivityOf(r),
    }));

  return {
    customers: rows.length,
    customersWithBalance: withBalance.length,
    settled: rows.length - withBalance.length,
    held,
    average: withBalance.length ? held / withBalance.length : 0,
    largest,
    flow,
    byMode,
    ageing,
    top,
  };
};

/** Adds the ADVANCE SUMMARY page to a jsPDF document. */
export const appendAdvanceSummaryPage = (doc, rows = [], { label } = {}) => {
  const s = buildAdvanceSummary(rows);

  doc.addPage('a4', 'landscape');
  const pageW = doc.internal.pageSize.getWidth();
  const contentW = pageW - MARGIN * 2;

  doc.setFillColor(0, 0, 0);
  doc.rect(0, 0, pageW, 36, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('ADVANCE SUMMARY', MARGIN, 23);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(label || `As of ${fmtDate(new Date())}`, pageW - MARGIN, 23, { align: 'right' });
  doc.setTextColor(0, 0, 0);

  // ── Row 1: Balance | Money in | Money out ──
  const c1 = contentW * 0.36;
  const c2 = contentW * 0.32;
  const c3 = contentW - c1 - c2 - GAP * 2;
  const x1 = MARGIN;
  const x2 = x1 + c1 + GAP;
  const x3 = x2 + c2 + GAP;
  let y = 48;

  drawCaption(doc, 'Balance held', x1, y);
  drawCaption(doc, 'Money in', x2, y);
  drawCaption(doc, 'Money out', x3, y);
  y += 6;

  const y1 = drawFixedTable(doc, {
    left: x1,
    startY: y,
    tableWidth: c1,
    head: [['Customers', 'With balance', 'Total held', 'Average', 'Largest']],
    body: [[
      String(s.customers),
      String(s.customersWithBalance),
      fmtAmt(s.held),
      fmtAmt(s.average),
      fmtAmt(s.largest),
    ]],
    columnWidths: [c1 * 0.18, c1 * 0.18, c1 * 0.22, c1 * 0.21, c1 * 0.21],
  });

  const y2 = drawFixedTable(doc, {
    left: x2,
    startY: y,
    tableWidth: c2,
    head: [['Deposits', 'Transfers in', 'Corrections', 'Total in']],
    body: [[fmtAmt(s.flow.deposits), fmtAmt(s.flow.transfersIn), fmtAmt(s.flow.corrections), fmtAmt(s.flow.totalIn)]],
    columnWidths: [c2 * 0.25, c2 * 0.25, c2 * 0.25, c2 * 0.25],
    boldLastRow: false,
  });

  const y3 = drawFixedTable(doc, {
    left: x3,
    startY: y,
    tableWidth: c3,
    head: [['Applied', 'Refunded', 'Sent out', 'Total out']],
    body: [[fmtAmt(s.flow.applied), fmtAmt(s.flow.refunded), fmtAmt(s.flow.transfersOut), fmtAmt(s.flow.totalOut)]],
    columnWidths: [c3 * 0.25, c3 * 0.25, c3 * 0.25, c3 * 0.25],
  });

  y = Math.max(y1, y2, y3) + SECTION_GAP;

  // ── Row 2: Balance age | Deposits by mode | Largest balances ──
  const d1 = contentW * 0.28;
  const d2 = contentW * 0.26;
  const d3 = contentW - d1 - d2 - GAP * 2;
  const z1 = MARGIN;
  const z2 = z1 + d1 + GAP;
  const z3 = z2 + d2 + GAP;

  drawCaption(doc, 'Balance by last activity', z1, y);
  drawCaption(doc, 'Deposits by payment mode', z2, y);
  drawCaption(doc, 'Largest balances', z3, y);
  y += 6;

  const ageBody = s.ageing.map((a) => [a.label, String(a.count), fmtAmt(a.amount), fmtPct(a.amount, s.held)]);
  ageBody.push(['Total', String(s.customersWithBalance), fmtAmt(s.held), s.held > 0 ? '100.0%' : '-']);
  const yA = drawFixedTable(doc, {
    left: z1,
    startY: y,
    tableWidth: d1,
    head: [['Last activity', 'Count', 'Balance', 'Share']],
    body: ageBody,
    columnWidths: [d1 * 0.3, d1 * 0.2, d1 * 0.32, d1 * 0.18],
    boldLastRow: true,
  });

  const modeBody = s.byMode.length
    ? s.byMode.map((m) => [m.mode, String(m.count), fmtAmt(m.amount)])
    : [['-', '-', '-']];
  if (s.byMode.length) {
    modeBody.push([
      'Total',
      String(s.byMode.reduce((t, m) => t + m.count, 0)),
      fmtAmt(s.byMode.reduce((t, m) => t + m.amount, 0)),
    ]);
  }
  const yB = drawFixedTable(doc, {
    left: z2,
    startY: y,
    tableWidth: d2,
    head: [['Mode', 'Receipts', 'Amount']],
    body: modeBody,
    columnWidths: [d2 * 0.36, d2 * 0.24, d2 * 0.4],
    boldLastRow: s.byMode.length > 0,
  });

  const topBody = s.top.length
    ? s.top.map((t, i) => [
        String(i + 1),
        t.code ? `${t.name} (${t.code})` : t.name,
        fmtAmt(t.balance),
        fmtPct(t.balance, s.held),
        fmtDate(t.lastActivity),
      ])
    : [['-', 'No balances held', '-', '-', '-']];
  const yC = drawFixedTable(doc, {
    left: z3,
    startY: y,
    tableWidth: d3,
    head: [['#', 'Customer', 'Balance', 'Share', 'Last activity']],
    body: topBody,
    columnWidths: [d3 * 0.07, d3 * 0.39, d3 * 0.2, d3 * 0.12, d3 * 0.22],
  });

  y = Math.max(yA, yB, yC) + SECTION_GAP;

  // ── Notes ──
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(60, 60, 60);
  const notes = [
    'Total in = deposits + transfers in + corrections. Total out = applied to invoices + refunded + sent to other customers.',
    'Total held is the sum of positive available balances; it equals Total in minus Total out when no customer is overdrawn.',
    'Balance by last activity groups customers holding a balance by days since their last advance movement.',
  ];
  notes.forEach((line, i) => doc.text(line, MARGIN, y + i * 11));
  doc.setTextColor(0, 0, 0);
};
