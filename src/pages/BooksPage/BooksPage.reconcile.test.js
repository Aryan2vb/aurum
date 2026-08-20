import {
  bankMatchOptions,
  bulkMatchOptions,
  dayKey,
  dayLabel,
  groupByDay,
  indexByDay,
  matchFitTag,
  paymentFillPct,
  paymentOptionLabel,
  paymentsMatchingCreditSum,
  reconcileDayStatus,
  reconcileMonthTimeline,
  reconcileTimeline,
  shiftMonth,
  weekStartKey,
} from './reconcileHelpers';

describe('reconcileHelpers', () => {
  it('groups rows by calendar day, newest first, with day-only labels', () => {
    const blocks = groupByDay(
      [
        { id: 'a', txnDate: '2026-07-19T00:00:00.000Z' },
        { id: 'b', txnDate: '2026-07-20' },
        { id: 'c', txnDate: '2026-07-20T12:00:00.000Z' },
      ],
      'txnDate',
    );
    expect(blocks.map((b) => b.dayKey)).toEqual(['2026-07-20', '2026-07-19']);
    expect(blocks[0].rows.map((r) => r.id)).toEqual(['b', 'c']);
    expect(dayLabel('2026-07-20')).toBe('20 Jul 2026');
    expect(dayKey('2026-07-20T15:30:00.000Z')).toBe('2026-07-20');
    expect([...indexByDay(
      [
        { id: 'a', txnDate: '2026-07-19T00:00:00.000Z' },
        { id: 'b', txnDate: '2026-07-20' },
      ],
      'txnDate',
    ).keys()]).toEqual(['2026-07-19', '2026-07-20']);
  });

  it('labels suggested split payments and only offers same-day fits', () => {
    const suggestions = [
      {
        paymentId: 'pay-1',
        invoiceNumber: 'INV-1',
        customerName: 'Aryan',
        mode: 'UPI',
        amount: 50000,
        remaining: 40000,
        paidAt: '2026-07-20',
        split: true,
        invoiceStatus: 'PAID',
      },
    ];
    const options = bankMatchOptions(
      '2026-07-20',
      10000,
      suggestions,
      [{ ...suggestions[0], paymentId: 'pay-other', paidAt: '2026-07-21', remaining: 50000 }],
    );
    expect(options).toHaveLength(1);
    expect(options[0].suggested).toBe(true);
    expect(options[0].fit).toBe('Split');
    expect(paymentOptionLabel(options[0], 10000)).toContain('Split');
    expect(paymentOptionLabel(options[0], 10000)).toContain('left');
  });

  it('labels loan and cash-deposit book entries without invoice fields', () => {
    expect(
      paymentOptionLabel(
        {
          kind: 'LOAN',
          invoiceNumber: 'Loan',
          amount: 50000,
          remaining: 50000,
          paidAt: '2026-07-20',
        },
        50000,
      ),
    ).toContain('Loan');
    expect(
      paymentOptionLabel(
        {
          kind: 'CASH_DEPOSIT',
          invoiceNumber: 'Cash deposit',
          amount: 20000,
          remaining: 20000,
        },
        20000,
      ),
    ).toContain('Cash deposit');
  });

  it('tags exact full amount vs remaining-completes vs split', () => {
    const payment = { amount: 50000, remaining: 50000 };
    expect(matchFitTag(50000, payment)).toBe('Exact');
    expect(matchFitTag(49990, payment)).toBe('Exact');
    expect(matchFitTag(49989, payment)).toBe('Split');
    expect(matchFitTag(60000, payment)).toBe(null);
    expect(matchFitTag(10000, { amount: 50000, remaining: 10000 })).toBe('Completes');
    expect(matchFitTag(9990, { amount: 50000, remaining: 10000 })).toBe('Completes');
    expect(matchFitTag(10000, { amount: 50000, remaining: 40000 })).toBe('Split');
    expect(matchFitTag(50000, { amount: 50000, remaining: 10000 })).toBe('Exact');
    expect(matchFitTag(18000, { amount: 10000, remaining: 10000 })).toBe(null);
    expect(
      paymentOptionLabel({ invoiceNumber: 'MJ/197/26-27', amount: 10000, remaining: 10000 }, 18000),
    ).not.toContain('Exact');
    expect(
      paymentOptionLabel({ invoiceNumber: 'MJ/1', amount: 10000, remaining: 10000 }, 10000),
    ).not.toContain('Exact');
  });

  it('bulk options include partial fits and prefer exact remaining', () => {
    const payments = [
      { paymentId: 'partial', amount: 80000, remaining: 80000, paidAt: '2026-07-20' },
      { paymentId: 'exact', amount: 50000, remaining: 30000, paidAt: '2026-07-20' },
      { paymentId: 'other-day', amount: 30000, remaining: 30000, paidAt: '2026-07-21' },
      { paymentId: 'too-small', amount: 20000, remaining: 20000, paidAt: '2026-07-20' },
    ];
    const options = bulkMatchOptions(payments, 30000, '2026-07-20');
    expect(options.map((p) => p.paymentId)).toEqual(['exact', 'too-small', 'partial']);
    expect(options[0].completes).toBe(true);
    expect(options[0].fit).toBe('Completes');
    expect(options[1].fit).toBe(null);
    expect(options[2].fit).toBe('Split');
    expect(paymentsMatchingCreditSum(options, 30000).map((p) => p.paymentId)).toEqual([
      'exact',
      'too-small',
    ]);
  });

  it('computes fill progress for partial and empty payments', () => {
    expect(paymentFillPct(50000, 40000)).toEqual({ linked: 10000, amount: 50000, pct: 20 });
    expect(paymentFillPct(50000, 50000).pct).toBe(0);
    expect(paymentFillPct(50000, 0).pct).toBe(100);
  });

  it('builds a month timeline with traffic-light day status', () => {
    expect(shiftMonth('2026-07', 1)).toBe('2026-08');
    expect(reconcileDayStatus(3, 1)).toBe('action');
    expect(reconcileDayStatus(0, 2)).toBe('done');
    expect(reconcileDayStatus(0, 0)).toBe('empty');
    const days = reconcileMonthTimeline(
      '2026-07',
      [{ id: 'u1', txnDate: '2026-07-20' }, { id: 'u2', txnDate: '2026-07-20' }],
      [{ id: 'l1', txnDate: '2026-07-04' }],
    );
    expect(days).toHaveLength(31);
    expect(days[3]).toMatchObject({ dayKey: '2026-07-04', status: 'done', linkedCount: 1 });
    expect(days[19]).toMatchObject({ dayKey: '2026-07-20', status: 'action', unmatchedCount: 2 });
    expect(days[0].status).toBe('empty');
    expect(weekStartKey('2026-07-20')).toBe('2026-07-20'); // Monday
    const weeks = reconcileTimeline('week', '2026-07', [{ id: 'u1', txnDate: '2026-07-20' }], []);
    expect(weeks.some((w) => w.status === 'action' && w.start === '2026-07-20')).toBe(true);
    const months = reconcileTimeline('month', '2026-07', [], [{ id: 'l1', txnDate: '2026-07-04' }]);
    expect(months).toHaveLength(12);
    expect(months[6]).toMatchObject({ id: '2026-07', status: 'done' });
  });
});
