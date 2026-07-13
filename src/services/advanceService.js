import { buildApiUrl } from '../config/api';
import { parseResponse } from './authService';

const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
};

/**
 * Get the available advance balance for a customer.
 * @returns {{ availableAdvance: string }}
 */
export const getAdvanceBalance = async (customerId) => {
  const url = buildApiUrl(`/customers/${customerId}/advance-balance`);
  const res = await fetch(url, { headers: getAuthHeaders() });
  return parseResponse(res);
};

/**
 * Get the full advance ledger history for a customer (with running balance).
 * @returns {Array<LedgerEntry & { runningBalance: string }>}
 */
export const getAdvanceLedger = async (customerId) => {
  const url = buildApiUrl(`/customers/${customerId}/advance-ledger`);
  const res = await fetch(url, { headers: getAuthHeaders() });
  return parseResponse(res);
};

/**
 * Record an advance payment received from a customer.
 * @param {string} customerId
 * @param {{ amount: number, paymentMethod: string, receivedAt?: string, reference?: string, notes?: string }} dto
 */
export const receiveAdvance = async (customerId, dto) => {
  const url = buildApiUrl(`/customers/${customerId}/advance`);
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
  return parseResponse(res);
};

/**
 * Refund advance balance back to the customer.
 * @param {string} customerId
 * @param {{ amount: number, paymentMethod: string, reference?: string, notes?: string }} dto
 */
export const refundAdvance = async (customerId, dto) => {
  const url = buildApiUrl(`/customers/${customerId}/advance/refund`);
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
  return parseResponse(res);
};

/**
 * Transfer advance balance from one customer to another.
 * @param {string} fromCustomerId
 * @param {{ toCustomerId: string, amount: number, notes?: string }} dto
 */
export const transferAdvance = async (fromCustomerId, dto) => {
  const url = buildApiUrl(`/customers/${fromCustomerId}/advance/transfer`);
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
  return parseResponse(res);
};

/**
 * Delete (soft-delete) a single ADVANCE_RECEIVED ledger entry.
 * Only owners can do this. Only received entries can be deleted.
 * @param {string} customerId
 * @param {string} ledgerEntryId
 */
export const deleteAdvanceEntry = async (customerId, ledgerEntryId) => {
  const url = buildApiUrl(`/customers/${customerId}/advance/${ledgerEntryId}`);
  const res = await fetch(url, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return parseResponse(res);
};

/**
 * Apply advance balance to reduce an invoice's outstanding amount.
 * @param {string} invoiceId
 * @param {{ amount: number, paidAt?: string, notes?: string }} dto
 */
export const applyAdvanceToInvoice = async (invoiceId, dto) => {
  const url = buildApiUrl(`/invoices/${invoiceId}/apply-advance`);
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
  return parseResponse(res);
};
