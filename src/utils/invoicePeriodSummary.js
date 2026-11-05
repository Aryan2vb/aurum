import autoTable from 'jspdf-autotable';
import {
  getSalesReport,
  getGstReport,
  getCollectionsReport,
  getInventoryFlowReport,
} from '../services/reportsService';

const METHOD_LABELS = {
  CASH: 'Cash',
  UPI: 'UPI',
  BANK_TRANSFER: 'Bank Transfer',
  CHEQUE: 'Cheque',
  CARD: 'Swipe / Card',
  OTHER: 'Other',
  NEFT: 'NEFT',
  RTGS: 'RTGS',
  IMPS: 'IMPS',
  OLD_GOLD: 'Old Gold',
  CREDIT: 'Credit',
};

const fmtAmt = (v) =>
  `Rs ${(parseFloat(v) || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const fmtWt = (v) => `${(parseFloat(v) || 0).toFixed(2)}g`;

const toIsoDate = (value) => {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const formatDisplayDate = (iso) => {
  if (!iso) return '';
  const [y, m, day] = iso.split('-');
  if (!y || !m || !day) return iso;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day} ${months[Number(m) - 1]} ${y}`;
};

export const formatPeriodLabel = (dateFrom, dateTo, { derived = false } = {}) => {
  const from = formatDisplayDate(dateFrom);
  const to = formatDisplayDate(dateTo);
  let label;
  if (from && to) label = from === to ? from : `${from} – ${to}`;
  else if (from) label = `From ${from}`;
  else if (to) label = `Through ${to}`;
  else label = 'All time';
  return derived ? `Derived from exported invoices: ${label}` : label;
};

export const deriveDateRangeFromInvoices = (invoices = []) => {
  let min = null;
  let max = null;
  invoices.forEach((inv) => {
    const iso = toIsoDate(inv.invoiceDate);
    if (!iso) return;
    if (!min || iso < min) min = iso;
    if (!max || iso > max) max = iso;
  });
  return { dateFrom: min || '', dateTo: max || '' };
};

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

const summarizeValues = (values = []) => {
  if (!values.length) return { low: 0, high: 0, avg: 0, n: 0 };
  let low = values[0];
  let high = values[0];
  let sum = 0;
  values.forEach((v) => {
    if (v < low) low = v;
    if (v > high) high = v;
    sum += v;
  });
  return { low, high, avg: sum / values.length, n: values.length };
};

const labourPerGram = (item) => {
  const netWt = num(item.netWeight);
  const labourTotal = num(item.makingChargesAmount);
  const labourPg = num(item.makingCharges);
  const type = item.makingChargesType || 'PER_GRAM';
  if (type === 'PER_GRAM' && labourPg > 0) return labourPg;
  if (netWt > 0 && labourTotal > 0) return labourTotal / netWt;
  return labourPg > 0 ? labourPg : 0;
};

/**
 * Low / high / avg metal rate (Rs/g) and labour (Rs/g) by metal+purity,
 * plus period totals for labour and hallmark — from exported invoice items.
 */
export const buildItemRateStats = (invoices = []) => {
  const rateMap = new Map();
  const labourMap = new Map();
  const labourByType = {
    PER_GRAM: 0,
    FLAT_PER_ITEM: 0,
    PERCENTAGE_ON_METAL: 0,
  };
  let totalLabour = 0;
  let totalHallmark = 0;
  let lineItems = 0;
  let invoiceCount = 0;
  let salesSum = 0;
  let maxInvoice = 0;

  invoices.forEach((inv) => {
    if (String(inv.status || '').toUpperCase() === 'DRAFT') return;
    invoiceCount += 1;
    const invTotal = num(inv.totalAmount);
    salesSum += invTotal;
    if (invTotal > maxInvoice) maxInvoice = invTotal;

    (inv.items || []).forEach((item) => {
      lineItems += 1;
      const metal = String(item.metalType || 'GOLD').toUpperCase();
      const purity = String(item.purityLabel || item.purity || 'UNKNOWN').trim() || 'UNKNOWN';
      const key = `${metal}|${purity}`;

      const rate = num(item.effectiveRate ?? item.metalRate);
      if (rate > 0) {
        if (!rateMap.has(key)) rateMap.set(key, []);
        rateMap.get(key).push(rate);
      }

      const labourPg = labourPerGram(item);
      if (labourPg > 0) {
        if (!labourMap.has(key)) labourMap.set(key, []);
        labourMap.get(key).push(labourPg);
      }

      const labourAmt = num(item.makingChargesAmount);
      totalLabour += labourAmt;
      totalHallmark += num(item.hallmarkingCharge);
      const type = item.makingChargesType || 'PER_GRAM';
      if (labourByType[type] != null) labourByType[type] += labourAmt;
      else labourByType.FLAT_PER_ITEM += labourAmt;
    });
  });

  const toRows = (map) =>
    [...map.entries()]
      .map(([key, values]) => {
        const [metal, purity] = key.split('|');
        const stats = summarizeValues(values);
        return {
          metal,
          purity,
          ...stats,
        };
      })
      .sort((a, b) => a.metal.localeCompare(b.metal) || a.purity.localeCompare(b.purity));

  return {
    metalRates: toRows(rateMap),
    labourRates: toRows(labourMap),
    totalLabour,
    totalHallmark,
    labourByType,
    lineItems,
    invoiceCount,
    avgInvoice: invoiceCount ? salesSum / invoiceCount : 0,
    maxInvoice,
  };
};

export const fetchInvoicePeriodSummary = async (filters = {}, invoices = []) => {
  let dateFrom = filters.dateFrom || '';
  let dateTo = filters.dateTo || '';
  let derived = false;

  if (!dateFrom && !dateTo && invoices.length) {
    const range = deriveDateRangeFromInvoices(invoices);
    dateFrom = range.dateFrom;
    dateTo = range.dateTo;
    derived = Boolean(dateFrom || dateTo);
  }

  const params = {
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    customerId: filters.customerId || undefined,
  };

  const [sales, gst, collections, inventory] = await Promise.all([
    getSalesReport(params).catch(() => null),
    getGstReport(params).catch(() => null),
    getCollectionsReport(params).catch(() => null),
    getInventoryFlowReport(params).catch(() => null),
  ]);

  return {
    sales,
    gst,
    collections,
    inventory,
    itemStats: buildItemRateStats(invoices),
    periodLabel: formatPeriodLabel(dateFrom, dateTo, { derived }),
  };
};

const MARGIN = 28;
const GAP = 14;
const SECTION_GAP = 16;

const tableDefaults = {
  theme: 'grid',
  styles: {
    fontSize: 8,
    cellPadding: 3,
    halign: 'center',
    valign: 'middle',
    textColor: [0, 0, 0],
    fillColor: false,
    lineColor: [100, 100, 100],
    lineWidth: 0.3,
    overflow: 'linebreak',
  },
  headStyles: {
    fillColor: [50, 50, 50],
    textColor: [255, 255, 255],
    fontStyle: 'bold',
    halign: 'center',
    fontSize: 8,
    cellPadding: 3,
  },
};

const drawCaption = (doc, text, x, y) => {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(text, x, y);
};

const metalLabel = (metal) => (String(metal).toUpperCase() === 'SILVER' ? 'Silver' : 'Gold');

/** Fixed-width table at absolute (left, startY). Returns finalY. */
const drawFixedTable = (doc, {
  left,
  startY,
  tableWidth,
  head,
  body,
  columnWidths,
  boldLastRow = false,
}) => {
  const pageW = doc.internal.pageSize.getWidth();
  const colStyles = {};
  if (columnWidths) {
    columnWidths.forEach((w, i) => {
      colStyles[i] = { cellWidth: w };
    });
  }
  autoTable(doc, {
    ...tableDefaults,
    startY,
    margin: { left, right: Math.max(MARGIN, pageW - left - tableWidth) },
    tableWidth,
    head,
    body,
    columnStyles: colStyles,
    didParseCell: (data) => {
      if (boldLastRow && data.section === 'body' && data.row.index === body.length - 1) {
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });
  return doc.lastAutoTable?.finalY || startY;
};

const purityRowsForMetal = (inventory, metal) => {
  const info = inventory?.[metal];
  if (!info?.purities || !Object.keys(info.purities).length) {
    return { body: [['-', '-', '-', '-']], totals: null };
  }
  const entries = Object.entries(info.purities).sort(([a], [b]) => a.localeCompare(b));
  const body = entries.map(([label, stats]) => {
    const row = stats && typeof stats === 'object' ? stats : { count: stats, grossWeight: 0, netWeight: 0 };
    return [
      label,
      String(row.count ?? 0),
      fmtWt(row.grossWeight),
      fmtWt(row.netWeight),
    ];
  });
  return {
    body,
    totals: [
      'Total',
      String(info.count ?? 0),
      fmtWt(info.totalGrossWeight),
      fmtWt(info.totalNetWeight),
    ],
  };
};

const fmtRate = (v) =>
  (parseFloat(v) || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtPct = (part, whole) => {
  const w = parseFloat(whole) || 0;
  if (w <= 0) return '0%';
  return `${(((parseFloat(part) || 0) / w) * 100).toFixed(0)}%`;
};

const CALCULATION_NOTES = [
  [
    'Invoices, Sales, Taxable, Collected, GST',
    'Taken from the sales, GST and collections reports for the period above (and the selected customer, if any). They are not re-added from the invoice table.',
  ],
  [
    'Avg bill / Max bill',
    'Avg bill = total amount of all exported invoices divided by their count; Max bill = the largest single invoice. Draft invoices are left out of both.',
  ],
  [
    'Line items',
    'Number of item rows across the exported invoices (drafts excluded).',
  ],
  [
    'Metal rate Rs/gm',
    'One rate per item row: the effective rate charged, or the metal rate on the row if none. Rows are grouped by metal and purity. Low and High are the smallest and largest rate; Avg is the plain average of those rates, so every item row counts once whatever its weight. Rows with no rate are skipped.',
  ],
  [
    'Labour Rs/gm (effective)',
    'One value per item row: the Rs/gm entered if labour is charged per gram, otherwise labour amount divided by net weight (flat and % labour). Grouped by metal and purity; Low, High and Avg work as for the metal rate. Rows with no labour are skipped.',
  ],
  [
    'Labour by type',
    'Labour amounts added up by how they were charged (per gram, flat per item, % on metal). Total is all labour in the exported invoices.',
  ],
  [
    'Total Hallmark',
    'Sum of hallmarking charges on every item row of the exported invoices.',
  ],
  [
    'Collections',
    'Payments received in the period, grouped by payment mode. % is that mode divided by total collected.',
  ],
  [
    'Gold / Silver by purity',
    'Item count, gross weight and net weight per purity from the inventory-flow report for the period.',
  ],
];

// Conservative height (pt) of the caption plus the notes table at 7pt, used to decide on a page break.
const CALCULATION_NOTES_HEIGHT = 170;

/**
 * Append a PERIOD SUMMARY page on A4 landscape with comfortable spacing.
 */
export const appendInvoicePeriodSummaryPage = (doc, periodSummary) => {
  if (!periodSummary) return;

  const {
    sales,
    gst,
    collections,
    inventory,
    itemStats,
    periodLabel = 'All time',
  } = periodSummary;

  doc.addPage('a4', 'landscape');
  const pageW = doc.internal.pageSize.getWidth();
  const contentW = pageW - MARGIN * 2;

  doc.setFillColor(0, 0, 0);
  doc.rect(0, 0, pageW, 36, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('PERIOD SUMMARY', MARGIN, 23);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(periodLabel, pageW - MARGIN, 23, { align: 'right' });
  doc.setTextColor(0, 0, 0);

  const stats = itemStats || {
    metalRates: [],
    labourRates: [],
    totalLabour: 0,
    totalHallmark: 0,
    labourByType: {},
    lineItems: 0,
    invoiceCount: 0,
    avgInvoice: 0,
    maxInvoice: 0,
  };

  const totalCollected = parseFloat(collections?.totalCollected ?? sales?.totalCollections) || 0;
  const gstSummary = gst?.summary || {};

  // ── Row 1: Sales | GST | Snapshot ──
  const c1 = contentW * 0.34;
  const c2 = contentW * 0.34;
  const c3 = contentW - c1 - c2 - GAP * 2;
  const x1 = MARGIN;
  const x2 = MARGIN + c1 + GAP;
  const x3 = x2 + c2 + GAP;
  let y = 48;

  drawCaption(doc, 'Sales', x1, y);
  drawCaption(doc, 'GST', x2, y);
  drawCaption(doc, 'Snapshot', x3, y);
  y += 6;

  const y1 = drawFixedTable(doc, {
    left: x1,
    startY: y,
    tableWidth: c1,
    head: [['Invoices', 'Sales', 'Taxable', 'Collected']],
    body: [[
      String(sales?.totalCount ?? stats.invoiceCount ?? 0),
      fmtAmt(sales?.totalSales),
      fmtAmt(sales?.totalTaxable),
      fmtAmt(sales?.totalCollections),
    ]],
    columnWidths: [c1 * 0.18, c1 * 0.28, c1 * 0.27, c1 * 0.27],
  });

  const y2 = drawFixedTable(doc, {
    left: x2,
    startY: y,
    tableWidth: c2,
    head: [['Taxable', 'CGST', 'SGST', 'IGST', 'Tax']],
    body: [[
      fmtAmt(gstSummary.totalTaxable),
      fmtAmt(gstSummary.totalCgst),
      fmtAmt(gstSummary.totalSgst),
      fmtAmt(gstSummary.totalIgst),
      fmtAmt(gstSummary.totalTax),
    ]],
    columnWidths: [c2 * 0.24, c2 * 0.19, c2 * 0.19, c2 * 0.19, c2 * 0.19],
  });

  const y3 = drawFixedTable(doc, {
    left: x3,
    startY: y,
    tableWidth: c3,
    head: [['Avg bill', 'Max bill', 'Line items']],
    body: [[
      fmtAmt(stats.avgInvoice),
      fmtAmt(stats.maxInvoice),
      String(stats.lineItems ?? 0),
    ]],
    columnWidths: [c3 * 0.36, c3 * 0.36, c3 * 0.28],
  });

  y = Math.max(y1, y2, y3) + SECTION_GAP;

  // ── Row 2: Collections | Gold | Silver ──
  const colW = contentW * 0.30;
  const metalW = (contentW - colW - GAP * 2) / 2;
  const colX = MARGIN;
  const goldX = MARGIN + colW + GAP;
  const silverX = goldX + metalW + GAP;

  drawCaption(doc, 'Collections', colX, y);
  drawCaption(doc, 'Gold by purity', goldX, y);
  drawCaption(doc, 'Silver by purity', silverX, y);
  y += 6;

  const modeEntries = Object.entries(collections?.groupedByMode || {})
    .filter(([, amt]) => parseFloat(amt) > 0);
  const modeRows = modeEntries.map(([mode, amt]) => [
    METHOD_LABELS[mode] || mode,
    fmtAmt(amt),
    fmtPct(amt, totalCollected),
  ]);
  if (!modeRows.length) modeRows.push(['-', fmtAmt(0), '0%']);
  modeRows.push(['Total', fmtAmt(totalCollected), '100%']);

  const collectionsFinalY = drawFixedTable(doc, {
    left: colX,
    startY: y,
    tableWidth: colW,
    head: [['Mode', 'Amount', '%']],
    body: modeRows,
    columnWidths: [colW * 0.42, colW * 0.38, colW * 0.20],
    boldLastRow: true,
  });

  const drawMetal = (left, metalKey) => {
    const rows = purityRowsForMetal(inventory, metalKey);
    const body = rows.totals ? [...rows.body, rows.totals] : rows.body;
    return drawFixedTable(doc, {
      left,
      startY: y,
      tableWidth: metalW,
      head: [['Purity', 'Qty', 'Gross', 'Net']],
      body,
      columnWidths: [metalW * 0.30, metalW * 0.16, metalW * 0.27, metalW * 0.27],
      boldLastRow: Boolean(rows.totals),
    });
  };

  const goldFinalY = drawMetal(goldX, 'GOLD');
  const silverFinalY = drawMetal(silverX, 'SILVER');

  y = Math.max(collectionsFinalY, goldFinalY, silverFinalY) + SECTION_GAP;

  // ── Row 3: Metal rate | Labour Rs/g | Labour by type ──
  const r1 = contentW * 0.38;
  const r2 = contentW * 0.38;
  const r3 = contentW - r1 - r2 - GAP * 2;
  const rx1 = MARGIN;
  const rx2 = MARGIN + r1 + GAP;
  const rx3 = rx2 + r2 + GAP;

  drawCaption(doc, 'Metal rate Rs/gm', rx1, y);
  drawCaption(doc, 'Labour Rs/gm (effective)', rx2, y);
  drawCaption(doc, 'Labour by type', rx3, y);
  y += 6;

  const rateBody = stats.metalRates.length
    ? stats.metalRates.map((r) => [
      metalLabel(r.metal),
      r.purity,
      fmtRate(r.low),
      fmtRate(r.high),
      fmtRate(r.avg),
    ])
    : [['-', '-', '-', '-', '-']];

  const labourBody = stats.labourRates.length
    ? stats.labourRates.map((r) => [
      metalLabel(r.metal),
      r.purity,
      fmtRate(r.low),
      fmtRate(r.high),
      fmtRate(r.avg),
    ])
    : [['-', '-', '-', '-', '-']];

  const byType = stats.labourByType || {};
  const labourTypeBody = [
    ['Per gm', fmtAmt(byType.PER_GRAM)],
    ['Flat', fmtAmt(byType.FLAT_PER_ITEM)],
    ['%', fmtAmt(byType.PERCENTAGE_ON_METAL)],
    ['Total', fmtAmt(stats.totalLabour)],
  ];

  const rateFinalY = drawFixedTable(doc, {
    left: rx1,
    startY: y,
    tableWidth: r1,
    head: [['Metal', 'Purity', 'Low', 'High', 'Avg']],
    body: rateBody,
    columnWidths: [r1 * 0.20, r1 * 0.20, r1 * 0.20, r1 * 0.20, r1 * 0.20],
  });

  const labourFinalY = drawFixedTable(doc, {
    left: rx2,
    startY: y,
    tableWidth: r2,
    head: [['Metal', 'Purity', 'Low', 'High', 'Avg']],
    body: labourBody,
    columnWidths: [r2 * 0.20, r2 * 0.20, r2 * 0.20, r2 * 0.20, r2 * 0.20],
  });

  const typeFinalY = drawFixedTable(doc, {
    left: rx3,
    startY: y,
    tableWidth: r3,
    head: [['Type', 'Amount']],
    body: labourTypeBody,
    columnWidths: [r3 * 0.40, r3 * 0.60],
    boldLastRow: true,
  });

  y = Math.max(rateFinalY, labourFinalY, typeFinalY) + SECTION_GAP;

  // ── Bottom totals ──
  drawFixedTable(doc, {
    left: MARGIN,
    startY: y,
    tableWidth: contentW,
    head: [['Total Labour', 'Total Hallmark']],
    body: [[
      fmtAmt(stats.totalLabour),
      fmtAmt(stats.totalHallmark),
    ]],
    columnWidths: [contentW / 2, contentW / 2],
  });
  y = (doc.lastAutoTable?.finalY || y) + SECTION_GAP;

  // ── How the figures are calculated ──
  // Keep the notes in one piece: if they would not fit under the tables, start a fresh page.
  const pageH = doc.internal.pageSize.getHeight();
  if (y + CALCULATION_NOTES_HEIGHT > pageH - 30) {
    doc.addPage('a4', 'landscape');
    y = 40;
  }
  drawCaption(doc, 'How these figures are calculated', MARGIN, y);
  y += 6;
  autoTable(doc, {
    ...tableDefaults,
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    tableWidth: contentW,
    head: [['Figure', 'How it is calculated']],
    body: CALCULATION_NOTES,
    styles: { ...tableDefaults.styles, fontSize: 7, cellPadding: 2, halign: 'left' },
    headStyles: { ...tableDefaults.headStyles, fontSize: 7, cellPadding: 2, halign: 'left' },
    columnStyles: { 0: { cellWidth: contentW * 0.16, fontStyle: 'bold' } },
  });
};

/** Rewrite page footers so totals include the summary page. */
export const stampPdfPageFooters = (doc) => {
  const total = doc.internal.getNumberOfPages();
  for (let i = 1; i <= total; i += 1) {
    doc.setPage(i);
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFillColor(255, 255, 255);
    doc.rect(0, pageH - 22, pageW, 22, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80);
    doc.text(`Page ${i} of ${total}`, pageW / 2, pageH - 12, { align: 'center' });
  }
};
