import {
  sortPaymentsByDate,
  buildMergedInvoicePayments,
  getTotalPaidWithAdvances,
  getTotalAdvanceApplied,
  buildAdvanceAllocations,
} from './invoicePayments';

describe('sortPaymentsByDate', () => {
  test('orders by date, earliest first, keeping same-day entry order', () => {
    const rows = [
      { mode: 'UPI', amount: 1, paidAt: '2026-11-05' },
      { mode: 'CASH', amount: 2, paidAt: '2026-11-01' },
      { mode: 'CARD', amount: 3, paidAt: '2026-11-03' },
      { mode: 'CASH', amount: 4, paidAt: '2026-11-01' },
    ];
    expect(sortPaymentsByDate(rows).map((p) => p.amount)).toEqual([2, 4, 3, 1]);
    expect(rows.map((p) => p.amount)).toEqual([1, 2, 3, 4]);
  });

  test('puts rows without a date last', () => {
    const rows = [{ amount: 1 }, { amount: 2, paidAt: '2026-11-01' }];
    expect(sortPaymentsByDate(rows).map((p) => p.amount)).toEqual([2, 1]);
  });

  test('handles empty input', () => {
    expect(sortPaymentsByDate()).toEqual([]);
    expect(sortPaymentsByDate([])).toEqual([]);
  });
});

describe('buildMergedInvoicePayments', () => {
  const directPayments = [
    { mode: 'CASH', amount: 25000, paidAt: '2026-11-10' },
  ];

  const selectedAdvances = [
    {
      advanceEntryId: 'adv-1',
      sourceCustomerId: 'cust-1',
      sourceCustomerName: 'Sita Devi',
      transactionDate: '2026-01-10',
      paymentMethod: 'UPI',
      reference: 'UTR-001',
      applyAmount: 10000,
    },
    {
      advanceEntryId: 'adv-2',
      sourceCustomerId: 'cust-1',
      transactionDate: '2026-02-10',
      paymentMethod: 'CASH',
      applyAmount: 10000,
    },
    {
      advanceEntryId: 'adv-3',
      sourceCustomerId: 'cust-1',
      transactionDate: '2026-03-10',
      paymentMethod: 'UPI',
      applyAmount: 6000, // partial split
    },
  ];

  test('merges direct payments and advance receipts into a sorted list', () => {
    const merged = buildMergedInvoicePayments(directPayments, selectedAdvances);
    expect(merged).toHaveLength(4);
    // Sorted chronologically: Jan, Feb, Mar, Nov
    expect(merged.map((p) => p.paidAt)).toEqual([
      '2026-01-10',
      '2026-02-10',
      '2026-03-10',
      '2026-11-10',
    ]);
  });

  test('advance entries carry source=ADVANCE and original mode/date', () => {
    const merged = buildMergedInvoicePayments(directPayments, selectedAdvances);
    const advRows = merged.filter((p) => p.source === 'ADVANCE');
    expect(advRows).toHaveLength(3);
    expect(advRows[0]).toEqual(expect.objectContaining({
      mode: 'UPI',
      amount: 10000,
      paidAt: '2026-01-10',
      reference: 'UTR-001',
      source: 'ADVANCE',
      sourceCustomerName: 'Sita Devi',
    }));
  });

  test('direct entries carry source=DIRECT', () => {
    const merged = buildMergedInvoicePayments(directPayments, selectedAdvances);
    const directRows = merged.filter((p) => p.source === 'DIRECT');
    expect(directRows).toHaveLength(1);
    expect(directRows[0].mode).toBe('CASH');
  });

  test('filters out zero-amount advance entries', () => {
    const withZero = [
      ...selectedAdvances,
      { advanceEntryId: 'adv-4', sourceCustomerId: 'cust-1', paymentMethod: 'UPI', applyAmount: 0 },
    ];
    const merged = buildMergedInvoicePayments(directPayments, withZero);
    expect(merged).toHaveLength(4); // adv-4 excluded
  });

  test('handles empty inputs', () => {
    expect(buildMergedInvoicePayments()).toEqual([]);
    expect(buildMergedInvoicePayments([], [])).toEqual([]);
  });
});

describe('getTotalPaidWithAdvances', () => {
  test('sums direct payments and advance apply amounts', () => {
    const direct = [{ amount: 25000 }, { amount: 5000 }];
    const advances = [{ applyAmount: 10000 }, { applyAmount: 6000 }];
    expect(getTotalPaidWithAdvances(direct, advances)).toBe(46000);
  });

  test('handles string amounts', () => {
    const direct = [{ amount: '25000' }];
    const advances = [{ applyAmount: '10000' }];
    expect(getTotalPaidWithAdvances(direct, advances)).toBe(35000);
  });

  test('handles empty inputs', () => {
    expect(getTotalPaidWithAdvances()).toBe(0);
    expect(getTotalPaidWithAdvances([], [])).toBe(0);
  });
});

describe('getTotalAdvanceApplied', () => {
  test('sums only advance apply amounts', () => {
    const advances = [{ applyAmount: 10000 }, { applyAmount: 6000 }];
    expect(getTotalAdvanceApplied(advances)).toBe(16000);
  });

  test('handles empty input', () => {
    expect(getTotalAdvanceApplied()).toBe(0);
  });
});

describe('buildAdvanceAllocations', () => {
  test('builds backend-ready allocation array from selected advances', () => {
    const selected = [
      { advanceEntryId: 'adv-1', sourceCustomerId: 'cust-1', applyAmount: 10000 },
      { advanceEntryId: 'adv-2', sourceCustomerId: 'cust-1', applyAmount: 6000 },
    ];
    expect(buildAdvanceAllocations(selected)).toEqual([
      { advanceEntryId: 'adv-1', sourceCustomerId: 'cust-1', amount: 10000 },
      { advanceEntryId: 'adv-2', sourceCustomerId: 'cust-1', amount: 6000 },
    ]);
  });

  test('filters out zero-amount entries', () => {
    const selected = [
      { advanceEntryId: 'adv-1', sourceCustomerId: 'cust-1', applyAmount: 10000 },
      { advanceEntryId: 'adv-2', sourceCustomerId: 'cust-1', applyAmount: 0 },
    ];
    expect(buildAdvanceAllocations(selected)).toHaveLength(1);
  });

  test('handles empty input', () => {
    expect(buildAdvanceAllocations()).toEqual([]);
  });
});
