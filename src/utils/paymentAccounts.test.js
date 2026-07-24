import {
  bankAccounts,
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
});
