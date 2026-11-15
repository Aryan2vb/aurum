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
 * @param {{ amount: number, paymentMethod: string, transactionDate?: string, reference?: string, notes?: string }} dto
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

export const updateAdvanceEntry = async (customerId, ledgerEntryId, dto) => {
  const url = buildApiUrl(`/customers/${customerId}/advance/${ledgerEntryId}`);
  const res = await fetch(url, { method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify(dto) });
  return parseResponse(res);
};

export const correctAdvanceEntry = async (customerId, ledgerEntryId, dto) => {
  const url = buildApiUrl(`/customers/${customerId}/advance/${ledgerEntryId}/correction`);
  const res = await fetch(url, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(dto) });
  return parseResponse(res);
};

/**
 * Transfer advance balance from one customer to another.
 * @param {string} fromCustomerId
 * @param {{ toCustomerId: string, amount: number, transactionDate?: string, notes?: string }} dto
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
 * Get available advance receipts for a customer (with remaining amounts).
 * Returns receipts where remainingAmount > 0, each carrying original date, mode, ref.
 * @param {string} customerId
 * @returns {Promise<Array<{
 *   id: string,
 *   transactionDate: string,
 *   paymentMethod: string,
 *   reference?: string,
 *   description?: string,
 *   originalAmount: number,
 *   allocatedAmount: number,
 *   remainingAmount: number,
 *   customerId: string,
 *   customerName?: string,
 * }>>}
 */
export const getAvailableAdvances = async (customerId) => {
  const url = buildApiUrl(`/customers/${customerId}/available-advances`);
  const res = await fetch(url, { headers: getAuthHeaders() });
  const data = await parseResponse(res);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.receipts)) return data.receipts;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

/**
 * Apply advance balance to reduce an invoice's outstanding amount.
 *
 * Supports two payload shapes:
 *   - **Legacy (lump-sum):** `{ amount, paidAt?, notes? }`
 *   - **Receipt-level:** `{ allocations: Array<{ advanceEntryId, sourceCustomerId, amount }> }`
 *
 * @param {string} invoiceId
 * @param {{ amount?: number, paidAt?: string, notes?: string, allocations?: Array<{ advanceEntryId: string, sourceCustomerId: string, amount: number }> }} dto
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
