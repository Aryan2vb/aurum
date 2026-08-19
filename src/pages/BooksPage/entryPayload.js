export const ENTRY_TYPES = [
  ['MONEY_IN', 'Money In'],
  ['MONEY_OUT', 'Money Out'],
  ['CASH_DEPOSIT', 'Cash deposit'],
  ['TRANSFER', 'Transfer'],
];

export const MONEY_IN_REASONS = [
  ['LOAN', 'Loan'],
  ['OTHER', 'Other'],
];

const isCashOrBank = (account) => account?.type === 'CASH' || account?.type === 'BANK';

const accountById = (accounts, id) => accounts.find((account) => account.id === id);

export function buildManualEntryPayload(form, accounts = []) {
  const amount = Math.abs(Number(form.amount));
  if (!Number.isFinite(amount) || amount === 0) {
    throw new Error('Amount must be greater than 0');
  }
  const base = {
    amount,
    occurredAt: form.entryDate,
    reference: form.reference || undefined,
    description: form.notes || undefined,
  };

  if (form.category === 'CASH_DEPOSIT' || form.category === 'TRANSFER') {
    const fromAccount = accountById(accounts, form.fromAccountId);
    const toAccount = accountById(accounts, form.toAccountId);
    if (!isCashOrBank(fromAccount) || !isCashOrBank(toAccount)) {
      throw new Error('Transfers require cash or bank accounts');
    }
    if (fromAccount.id === toAccount.id) {
      throw new Error('Choose different source and destination accounts');
    }
    if (form.category === 'CASH_DEPOSIT') {
      if (fromAccount.type !== 'CASH' || toAccount.type !== 'BANK') {
        throw new Error('Cash deposit moves cash into a bank account');
      }
      return {
        ...base,
        type: 'CASH_BANK_TRANSFER',
        fromAccountId: form.fromAccountId,
        toAccountId: form.toAccountId,
        description: form.notes || 'Cash deposit',
      };
    }
    const type = fromAccount.type === 'BANK' && toAccount.type === 'BANK'
      ? 'BANK_BANK_TRANSFER'
      : 'CASH_BANK_TRANSFER';
    return { ...base, type, fromAccountId: form.fromAccountId, toAccountId: form.toAccountId };
  }

  if (!form.accountId) throw new Error('Choose an account');
  const isLoan = form.category === 'MONEY_IN' && form.reason === 'LOAN';
  return {
    ...base,
    type: 'ADJUSTMENT',
    accountId: form.accountId,
    amount: form.category === 'MONEY_OUT' ? -amount : amount,
    description: form.notes || (isLoan ? 'Loan' : undefined),
  };
}

export function ledgerTypeLabel(row) {
  const type = row.category || row.type || 'Entry';
  const particulars = String(row.particulars || row.description || '');
  const incoming = Number(row.in ?? row.credit ?? (row.direction === 'IN' ? row.amount : 0)) || 0;
  if (type === 'CASH_BANK_TRANSFER' || type === 'BANK_BANK_TRANSFER') {
    return /^cash deposit$/i.test(particulars.trim()) ? 'Cash deposit' : 'Transfer';
  }
  if (type === 'ADJUSTMENT') {
    if (/^loan$/i.test(particulars.trim())) return 'Loan';
    return incoming > 0 ? 'Money In' : 'Money Out';
  }
  if (type === 'OPENING_BALANCE') return 'Opening';
  if (type === 'SALE_RECEIPT') return 'Sale';
  if (type === 'UDHAR_COLLECTION') return 'Udhar';
  if (type === 'ADVANCE_RECEIPT') return 'Advance';
  if (type === 'ADVANCE_REFUND') return 'Advance refund';
  if (type === 'PURCHASE_PAYMENT') return 'Purchase';
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
