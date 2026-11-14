import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = global.TextEncoder || TextEncoder;
global.TextDecoder = global.TextDecoder || TextDecoder;
const jsPDF = require('jspdf').default || require('jspdf').jsPDF;
const {
  appendAdvanceTotalsRow,
  buildAdvanceSummary,
  appendAdvanceSummaryPage,
} = require('./advanceReportSummary');
const { flattenAdvanceData } = require('./exportUtils');

const aryan = {
  customerName: 'Aryan Soni',
  customerCode: 'C-000006',
  totalReceived: '10000',
  totalApplied: '1000',
  totalTransferOut: '0',
  totalTransferIn: '1000',
  totalRefunded: '0',
  totalCorrectionCredit: '90',
  totalCorrectionDebit: '0',
  availableBalance: '10090',
  deposits: [{ amount: '10000', date: '2026-11-12T00:00:00.000Z', paymentMethod: 'CASH' }],
  transactions: [
    { type: 'ADVANCE_RECEIVED', amount: '10000', date: '2026-11-12T00:00:00.000Z' },
    { type: 'ADVANCE_APPLIED', amount: '1000', date: '2026-11-14T00:00:00.000Z' },
  ],
};
const sita = {
  customerName: 'Sita Devi',
  customerCode: 'C-000002',
  totalReceived: '5000',
  totalApplied: '2000',
  totalRefunded: '500',
  totalTransferOut: '0',
  totalTransferIn: '0',
  availableBalance: '2500',
  deposits: [
    { amount: '3000', date: '2026-01-05T00:00:00.000Z', paymentMethod: 'UPI' },
    { amount: '2000', date: '2026-02-05T00:00:00.000Z', paymentMethod: 'CASH' },
  ],
  transactions: [{ type: 'ADVANCE_RECEIVED', amount: '3000', date: '2026-02-05T00:00:00.000Z' }],
};
const settled = { customerName: 'Ravi', totalReceived: '100', totalApplied: '100', availableBalance: '0' };

describe('advance report', () => {
  it('adds a TOTAL row summing every amount column', () => {
    const rows = appendAdvanceTotalsRow([aryan, sita, settled].map(flattenAdvanceData));
    const total = rows[rows.length - 1];
    expect(rows).toHaveLength(4);
    expect(total['Customer Name']).toBe('TOTAL');
    expect(total['Customer Code']).toBe('3 customers');
    expect(total['Total Received']).toBe('15100.00');
    expect(total['Transferred In']).toBe('1000.00');
    expect(total['Corrections']).toBe('90.00');
    expect(total['Applied to Invoices']).toBe('3100.00');
    expect(total['Refunded']).toBe('500.00');
    expect(total['Available Balance']).toBe('12590.00');
    expect(total['Phone']).toBe('');
  });

  it('computes KPIs that reconcile', () => {
    const s = buildAdvanceSummary([aryan, sita, settled], new Date('2026-11-15T00:00:00.000Z'));
    expect(s.customers).toBe(3);
    expect(s.customersWithBalance).toBe(2);
    expect(s.settled).toBe(1);
    expect(s.held).toBe(12590);
    expect(s.largest).toBe(10090);
    expect(s.average).toBe(6295);
    expect(s.flow.totalIn).toBe(16190); // 15,100 deposits + 1,000 in + 90 corrections
    expect(s.flow.totalOut).toBe(3600); // 3,100 applied + 500 refunded
    expect(s.flow.net).toBe(s.held);
    expect(s.byMode).toEqual([
      { mode: 'Cash', count: 2, amount: 12000 },
      { mode: 'UPI', count: 1, amount: 3000 },
    ]);
    // Aryan: last activity 1 day ago; Sita: Feb → over 180 days
    expect(s.ageing[0]).toEqual({ label: '0-30 days', count: 1, amount: 10090 });
    expect(s.ageing[3]).toEqual({ label: 'Over 180 days', count: 1, amount: 2500 });
    expect(s.top.map((t) => t.name)).toEqual(['Aryan Soni', 'Sita Devi']);
  });

  it('adds one ADVANCE SUMMARY page to the PDF', () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt' });
    doc.text('table', 20, 20);
    appendAdvanceSummaryPage(doc, [aryan, sita, settled]);
    expect(doc.internal.getNumberOfPages()).toBe(2);
  });

  it('still renders the page with no rows', () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt' });
    appendAdvanceSummaryPage(doc, []);
    expect(doc.internal.getNumberOfPages()).toBe(2);
  });
});
