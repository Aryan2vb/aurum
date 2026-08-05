import {
  bankAccounts,
  financialAccountIdFrom,
  getPaymentAccountError,
  paymentNeedsBankAccount,
  withFinancialAccount,
} from './paymentAccounts';

describe('payment account rules', () => {
  it('requires a bank account for every non-cash financial mode', () => {
    expect(paymentNeedsBankAccount('UPI')).toBe(true);
    expect(paymentNeedsBankAccount('CHEQUE')).toBe(true);
    expect(paymentNeedsBankAccount('CASH')).toBe(false);
    expect(paymentNeedsBankAccount('CREDIT')).toBe(false);
    expect(paymentNeedsBankAccount('OLD_GOLD')).toBe(false);
  });

  it('hydrates UI account id from API accountId', () => {
    expect(financialAccountIdFrom({ accountId: 'bank-1' })).toBe('bank-1');
    expect(financialAccountIdFrom({ financialAccountId: 'legacy' })).toBe('legacy');
    expect(financialAccountIdFrom({ accountId: 'bank-1', financialAccountId: 'legacy' })).toBe('bank-1');
  });

  it('maps the selected finance account to the backend accountId', () => {
    expect(withFinancialAccount({ mode: 'UPI', financialAccountId: 'bank-1' }))
      .toEqual({ mode: 'UPI', accountId: 'bank-1' });
    expect(withFinancialAccount({ paymentMethod: 'CASH', financialAccountId: 'bank-1' }))
      .toEqual({ paymentMethod: 'CASH' });
  });

  it('offers active bank accounts only', () => {
    const accounts = [
      { id: 'cash', type: 'CASH' },
      { id: 'active', type: 'BANK' },
      { id: 'inactive', type: 'BANK', isActive: false },
    ];
    expect(bankAccounts(accounts).map((account) => account.id)).toEqual(['active']);
  });

  it('flags non-cash payments missing a bank account', () => {
    expect(getPaymentAccountError([{ mode: 'CASH', amount: 100 }])).toBe('');
    expect(getPaymentAccountError([{ mode: 'UPI', amount: 100 }])).toMatch(/bank account/i);
    expect(
      getPaymentAccountError([{ mode: 'UPI', amount: 100, financialAccountId: 'bank-1' }]),
    ).toBe('');
  });
});
