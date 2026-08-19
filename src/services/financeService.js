import { buildApiUrl } from '../config/api';
import { parseResponse } from './authService';

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('authToken')}`,
});

const request = async (path, options = {}) => {
  const response = await fetch(buildApiUrl(path), {
    ...options,
    headers: authHeaders(),
  });
  return parseResponse(response);
};

const withQuery = (path, params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, value);
  });
  const queryString = query.toString();
  return `${path}${queryString ? `?${queryString}` : ''}`;
};

export const getFinancialAccounts = () => request('/finance/accounts');

export const createFinancialAccount = (data) =>
  request('/finance/accounts', { method: 'POST', body: JSON.stringify(data) });

export const updateFinancialAccount = (id, data) =>
  request(`/finance/accounts/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) });

export const getAccountLedger = (id, filters = {}) =>
  request(withQuery(`/finance/accounts/${encodeURIComponent(id)}/ledger`, filters));

export const getFinanceBook = (filters = {}) =>
  request(withQuery('/finance/books', filters));

export const createFinanceTransaction = (data) =>
  request('/finance/transactions', { method: 'POST', body: JSON.stringify(data) });

export const deleteFinanceTransaction = (id) =>
  request(`/finance/transactions/${encodeURIComponent(id)}/reverse`, { method: 'POST' });

export const getUnassignedMovements = () => request('/finance/unassigned');

export const backfillFinanceBooks = () =>
  request('/finance/backfill', { method: 'POST' });

export const assignUnassignedMovements = (movementIds, accountId) =>
  request('/finance/movements/assign-bulk', {
    method: 'POST',
    body: JSON.stringify({
      assignments: movementIds.map((movementId) => ({ movementId, accountId })),
    }),
  });

export const uploadBankStatement = async (accountId, file) => {
  const body = new FormData();
  body.append('file', file);
  const response = await fetch(
    buildApiUrl(`/finance/bank-statements/accounts/${encodeURIComponent(accountId)}/upload`),
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
      body,
    },
  );
  return parseResponse(response);
};

export const getBankStatementInbox = (accountId) =>
  request(withQuery('/finance/bank-statements/inbox', { accountId }));

export const getUnmatchedBankCredits = (accountId) =>
  request(withQuery('/finance/bank-statements/unmatched', { accountId }));

export const getUnmatchedBankPayments = (accountId) =>
  request(withQuery('/finance/bank-statements/unmatched-payments', { accountId }));

export const getMatchedBankCredits = (accountId) =>
  request(withQuery('/finance/bank-statements/matched', { accountId }));

export const ignoreBankStatementLine = (lineId) =>
  request(`/finance/bank-statements/lines/${encodeURIComponent(lineId)}/ignore`, {
    method: 'POST',
  });

export const unmatchBankStatementLine = (lineId) =>
  request(`/finance/bank-statements/lines/${encodeURIComponent(lineId)}/unmatch`, {
    method: 'POST',
  });

export const deleteBankStatementLine = (lineId) =>
  request(`/finance/bank-statements/lines/${encodeURIComponent(lineId)}`, {
    method: 'DELETE',
  });

export const deleteBankStatementLinesBulk = (lineIds) =>
  request('/finance/bank-statements/delete-bulk', {
    method: 'POST',
    body: JSON.stringify({ lineIds }),
  });

export const matchBankStatementLine = (lineId, paymentId, kind) =>
  request(`/finance/bank-statements/lines/${encodeURIComponent(lineId)}/match`, {
    method: 'POST',
    body: JSON.stringify({ paymentId, ...(kind ? { kind } : {}) }),
  });

export const matchBankStatementLinesBulk = (lineIds, paymentId, kind) =>
  request('/finance/bank-statements/match-bulk', {
    method: 'POST',
    body: JSON.stringify({ lineIds, paymentId, ...(kind ? { kind } : {}) }),
  });

export const createAndMatchBankStatementLine = (lineId, payload) =>
  request(`/finance/bank-statements/lines/${encodeURIComponent(lineId)}/create-and-match`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
