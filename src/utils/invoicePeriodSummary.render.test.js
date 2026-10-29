import { TextEncoder, TextDecoder } from 'util';

// jsdom has no TextEncoder/TextDecoder, which jsPDF needs; load it only after the polyfill is in place.
global.TextEncoder = global.TextEncoder || TextEncoder;
global.TextDecoder = global.TextDecoder || TextDecoder;
const jsPDF = require('jspdf').default || require('jspdf').jsPDF;
const {
  appendInvoicePeriodSummaryPage,
  buildItemRateStats,
  stampPdfPageFooters,
} = require('./invoicePeriodSummary');

describe('appendInvoicePeriodSummaryPage', () => {
  const summary = {
    sales: { totalCount: 2, totalSales: 1000, totalTaxable: 970, totalCollections: 1000 },
    gst: { summary: { totalCgst: 15, totalSgst: 15, totalIgst: 0 } },
    collections: { totalCollected: 1000, groupedByMode: { CASH: 500, UPI: 500 } },
    inventory: null,
    itemStats: buildItemRateStats([]),
    periodLabel: '12 Oct 2026 – 18 Oct 2026',
  };

  test('adds one page after the table and stamps the final page count', () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt' });
    doc.text('table', 20, 20);
    expect(doc.internal.getNumberOfPages()).toBe(1);

    appendInvoicePeriodSummaryPage(doc, summary);
    stampPdfPageFooters(doc);

    expect(doc.internal.getNumberOfPages()).toBe(2);
  });

  test('does nothing without a summary (fetch failed)', () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt' });
    appendInvoicePeriodSummaryPage(doc, null);
    expect(doc.internal.getNumberOfPages()).toBe(1);
  });
});
