import {
  buildItemRateStats,
  deriveDateRangeFromInvoices,
  formatPeriodLabel,
} from './invoicePeriodSummary';

describe('invoicePeriodSummary helpers', () => {
  test('formatPeriodLabel covers from/to/all-time', () => {
    expect(formatPeriodLabel('2026-04-01', '2026-04-30')).toBe('01 Apr 2026 – 30 Apr 2026');
    expect(formatPeriodLabel('2026-04-01', '2026-04-01')).toBe('01 Apr 2026');
    expect(formatPeriodLabel('2026-04-01', '')).toBe('From 01 Apr 2026');
    expect(formatPeriodLabel('', '2026-04-30')).toBe('Through 30 Apr 2026');
    expect(formatPeriodLabel('', '')).toBe('All time');
    expect(formatPeriodLabel('2026-04-01', '2026-04-30', { derived: true }))
      .toBe('Derived from exported invoices: 01 Apr 2026 – 30 Apr 2026');
  });

  test('deriveDateRangeFromInvoices uses min/max invoiceDate', () => {
    expect(deriveDateRangeFromInvoices([
      { invoiceDate: '2026-04-15T10:00:00.000Z' },
      { invoiceDate: '2026-04-01T10:00:00.000Z' },
      { invoiceDate: '2026-04-20T10:00:00.000Z' },
    ])).toEqual({ dateFrom: '2026-04-01', dateTo: '2026-04-20' });
  });

  test('buildItemRateStats computes low/high/avg and totals', () => {
    const stats = buildItemRateStats([
      {
        status: 'FINALIZED',
        totalAmount: 10000,
        items: [
          {
            metalType: 'GOLD',
            purityLabel: '20K',
            metalRate: 5000,
            makingCharges: 100,
            makingChargesType: 'PER_GRAM',
            makingChargesAmount: 500,
            hallmarkingCharge: 45,
            netWeight: 5,
          },
          {
            metalType: 'GOLD',
            purityLabel: '20K',
            metalRate: 5200,
            makingCharges: 120,
            makingChargesType: 'PER_GRAM',
            makingChargesAmount: 240,
            hallmarkingCharge: 45,
            netWeight: 2,
          },
          {
            metalType: 'SILVER',
            purityLabel: 'F',
            metalRate: 90,
            makingCharges: 10,
            makingChargesType: 'FLAT_PER_ITEM',
            makingChargesAmount: 100,
            hallmarkingCharge: 0,
            netWeight: 10,
          },
        ],
      },
      { status: 'DRAFT', totalAmount: 1, items: [{ metalType: 'GOLD', purityLabel: '22K', metalRate: 9999, makingChargesAmount: 999, hallmarkingCharge: 99 }] },
    ]);

    expect(stats.totalLabour).toBe(840);
    expect(stats.totalHallmark).toBe(90);
    expect(stats.lineItems).toBe(3);
    expect(stats.avgInvoice).toBe(10000);
    expect(stats.maxInvoice).toBe(10000);
    expect(stats.labourByType.PER_GRAM).toBe(740);
    expect(stats.labourByType.FLAT_PER_ITEM).toBe(100);

    const gold20 = stats.metalRates.find((r) => r.metal === 'GOLD' && r.purity === '20K');
    expect(gold20.low).toBe(5000);
    expect(gold20.high).toBe(5200);
    expect(gold20.avg).toBe(5100);

    const labour20 = stats.labourRates.find((r) => r.metal === 'GOLD' && r.purity === '20K');
    expect(labour20.low).toBe(100);
    expect(labour20.high).toBe(120);
    expect(labour20.avg).toBe(110);

    const silver = stats.metalRates.find((r) => r.metal === 'SILVER' && r.purity === 'F');
    expect(silver.avg).toBe(90);
  });
});
