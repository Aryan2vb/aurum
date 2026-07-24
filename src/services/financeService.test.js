import {
  assignUnassignedMovements,
  createFinanceTransaction,
  getAccountLedger,
  getFinanceBook,
} from './financeService';

beforeEach(() => {
  localStorage.setItem('authToken', 'test-token');
  global.fetch = jest.fn(() => Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ ok: true }),
  }));
});

afterEach(() => jest.restoreAllMocks());

describe('finance service', () => {
  it('encodes book and ledger filters', async () => {
    await getFinanceBook({ type: 'BANK', dateFrom: '2026-07-01', dateTo: '' });
    await getAccountLedger('account 1', { dateTo: '2026-07-21' });

    expect(global.fetch.mock.calls[0][0]).toContain('/finance/books?type=BANK&dateFrom=2026-07-01');
    expect(global.fetch.mock.calls[1][0]).toContain('/finance/accounts/account%201/ledger?dateTo=2026-07-21');
  });

  it('sends transaction and bulk assignment payloads', async () => {
    await createFinanceTransaction({ type: 'ADJUSTMENT', amount: 25, accountId: 'cash' });
    await assignUnassignedMovements(['one', 'two'], 'bank');

    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({
      type: 'ADJUSTMENT',
      amount: 25,
      accountId: 'cash',
    });
    expect(JSON.parse(global.fetch.mock.calls[1][1].body)).toEqual({
      assignments: [
        { movementId: 'one', accountId: 'bank' },
        { movementId: 'two', accountId: 'bank' },
      ],
    });
  });
});
