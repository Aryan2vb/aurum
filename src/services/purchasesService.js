import { buildApiUrl } from '../config/api';
import { parseResponse } from './authService';

const defaultHeaders = {
  'Content-Type': 'application/json',
};

const authHeaders = () => ({
  ...defaultHeaders,
  Authorization: `Bearer ${localStorage.getItem('authToken')}`,
});

export const createPurchase = async (data) => {
  const response = await fetch(buildApiUrl('/purchases'), {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return parseResponse(response);
};

export const updatePurchase = async (id, data) => {
  const response = await fetch(buildApiUrl(`/purchases/${id}`), {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return parseResponse(response);
};

/** Attachment-only — does not revalidate bill line items */
export const updatePurchaseAttachment = async (id, data) => {
  const response = await fetch(buildApiUrl(`/purchases/${id}/attachment`), {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return parseResponse(response);
};

export const getPurchases = async () => {
  const response = await fetch(buildApiUrl('/purchases'), {
    method: 'GET',
    headers: authHeaders(),
  });
  return parseResponse(response);
};

export const getPurchase = async (id) => {
  const response = await fetch(buildApiUrl(`/purchases/${id}`), {
    method: 'GET',
    headers: authHeaders(),
  });
  return parseResponse(response);
};

export const recordPurchasePayment = async (id, data) => {
  const response = await fetch(buildApiUrl(`/purchases/${id}/payments`), {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return parseResponse(response);
};

export const deletePurchase = async (id) => {
  const response = await fetch(buildApiUrl(`/purchases/${id}`), {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return parseResponse(response);
};

export const getPurchaseBillBookHtml = async (request) => {
  const response = await fetch(buildApiUrl('/purchases/bill-book'), {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    let message = `Failed to prepare Bill Book (${response.status})`;
    try {
      const payload = await response.json();
      message = payload?.message || payload?.error || message;
    } catch (error) {
      // Keep the status-based fallback when the server does not return JSON.
    }
    throw new Error(message);
  }

  return response.text();
};
