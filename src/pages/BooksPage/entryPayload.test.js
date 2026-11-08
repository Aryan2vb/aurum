import { buildManualEntryPayload, ledgerTypeLabel } from './entryPayload';

const accounts = [
  { id: 'cash', type: 'CASH' },
  { id: 'bank', type: 'BANK' },
  { id: 'bank2', type: 'BANK' },
  { id: 'other', type: 'EXPENSE' },
];
const form = (overrides) => ({ entryDate: '2026-08-19', amount: '500', ...overrides });

describe('buildManualEntryPayload', () => {
  it('signs money in / money out on one account', () => {
    expect(buildManualEntryPayload(form({ category: 'MONEY_IN', accountId: 'cash' }))).toMatchObject({
      type: 'ADJUSTMENT',
      accountId: 'cash',
      amount: 500,
    });
    expect(
      buildManualEntryPayload(form({ category: 'MONEY_OUT', accountId: 'cash' })).amount,
    ).toBe(-500);
    expect(
      buildManualEntryPayload(form({ category: 'MONEY_IN', accountId: 'cash', reason: 'LOAN' }))
        .description,
    ).toBe('Loan');
  });

  it('picks the transfer type from the account pair', () => {
    expect(
      buildManualEntryPayload(
        form({ category: 'TRANSFER', fromAccountId: 'bank', toAccountId: 'bank2' }),
        accounts,
      ).type,
    ).toBe('BANK_BANK_TRANSFER');
    expect(
      buildManualEntryPayload(
        form({ category: 'CASH_DEPOSIT', fromAccountId: 'cash', toAccountId: 'bank' }),
        accounts,
      ),
    ).toMatchObject({ type: 'CASH_BANK_TRANSFER', description: 'Cash deposit' });
  });

  it('rejects bad amounts, accounts and deposit directions', () => {
    expect(() => buildManualEntryPayload(form({ amount: '0', accountId: 'cash' }))).toThrow(
      /greater than 0/,
    );
    expect(() => buildManualEntryPayload(form({ category: 'MONEY_IN' }))).toThrow(/Choose an account/);
    expect(() =>
      buildManualEntryPayload(
        form({ category: 'TRANSFER', fromAccountId: 'cash', toAccountId: 'other' }),
        accounts,
      ),
    ).toThrow(/cash or bank/);
    expect(() =>
      buildManualEntryPayload(
        form({ category: 'TRANSFER', fromAccountId: 'cash', toAccountId: 'cash' }),
        accounts,
      ),
    ).toThrow(/different source/);
    expect(() =>
      buildManualEntryPayload(
        form({ category: 'CASH_DEPOSIT', fromAccountId: 'bank', toAccountId: 'cash' }),
        accounts,
      ),
    ).toThrow(/Cash deposit moves cash/);
  });
});

describe('ledgerTypeLabel', () => {
  it('labels manual and automatic ledger rows', () => {
    expect(ledgerTypeLabel({ type: 'CASH_BANK_TRANSFER', description: 'Cash deposit' })).toBe(
      'Cash deposit',
    );
    expect(ledgerTypeLabel({ type: 'CASH_BANK_TRANSFER', description: 'Petty cash' })).toBe(
      'Transfer',
    );
    expect(ledgerTypeLabel({ type: 'ADJUSTMENT', in: 500 })).toBe('Money In');
    expect(ledgerTypeLabel({ type: 'ADJUSTMENT', out: 500 })).toBe('Money Out');
    expect(ledgerTypeLabel({ type: 'ADJUSTMENT', description: 'Loan', in: 500 })).toBe('Loan');
    expect(ledgerTypeLabel({ type: 'SALE_RECEIPT' })).toBe('Sale');
    expect(ledgerTypeLabel({ type: 'PURCHASE_PAYMENT' })).toBe('Purchase');
    expect(ledgerTypeLabel({ type: 'SOMETHING_NEW' })).toBe('Something New');
  });
});
