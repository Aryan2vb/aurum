export const PAYMENT_MODES = [
  'CASH',
  'UPI',
  'CARD',
  'BANK_TRANSFER',
  'CHEQUE',
  'NEFT',
  'RTGS',
  'IMPS',
  'OLD_GOLD',
  'CREDIT',
  'OTHER',
];

const ACCOUNT_FREE_MODES = new Set(['CASH', 'CREDIT', 'OLD_GOLD']);

export const paymentNeedsBankAccount = (mode) =>
  Boolean(mode) && !ACCOUNT_FREE_MODES.has(mode);

export const paymentAllowsAccount = (mode) => paymentNeedsBankAccount(mode);

export const bankAccounts = (accounts = []) =>
  accounts.filter((account) => account.type === 'BANK' && account.isActive !== false);

export const withFinancialAccount = (payment) => {
  const { financialAccountId, ...rest } = payment;
  return paymentAllowsAccount(payment.mode || payment.paymentMethod || payment.modeOfPayment) && financialAccountId
    ? { ...rest, accountId: financialAccountId }
    : rest;
};
