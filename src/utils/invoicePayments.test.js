import { sortPaymentsByDate } from './invoicePayments';

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
