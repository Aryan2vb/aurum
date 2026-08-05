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

/** Hydrate UI field from API `accountId` (or legacy `financialAccountId`). */
export const financialAccountIdFrom = (payment = {}) =>
  payment.accountId || payment.financialAccountId || '';

export const withFinancialAccount = (payment) => {
  const { financialAccountId, ...rest } = payment;
  return paymentAllowsAccount(payment.mode || payment.paymentMethod || payment.modeOfPayment) && financialAccountId
    ? { ...rest, accountId: financialAccountId }
    : rest;
};

export const getPaymentAccountError = (payments = []) => {
  const missing = payments.filter(
    (payment) =>
      Number(payment.amount) > 0 &&
      paymentNeedsBankAccount(payment.mode || payment.paymentMethod) &&
      !(payment.financialAccountId || payment.accountId),
  );
  if (!missing.length) return '';
  return 'Select a bank account for UPI, card, cheque, and other non-cash payments';
};
