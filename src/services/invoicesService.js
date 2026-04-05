import { buildApiUrl } from '../config/api';
import { parseResponse } from './authService';

// ============================================
// INVOICE OPERATIONS
// ============================================

export const getInvoices = async (params = {}) => {
  const token = localStorage.getItem('authToken');
  const queryParams = new URLSearchParams();
  
  // Clean up params and add to query string
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null) {
      queryParams.append(key, params[key]);
    }
  });

  const response = await fetch(buildApiUrl(`/invoices?${queryParams.toString()}`), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return parseResponse(response);
};

export const getInvoiceById = async (invoiceId) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(buildApiUrl(`/invoices/${invoiceId}`), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return parseResponse(response);
};

export const createInvoice = async (invoiceData) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(buildApiUrl('/invoices'), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(invoiceData),
  });
  return parseResponse(response);
};

export const createDraft = async (invoiceData) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(buildApiUrl('/invoices/draft'), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(invoiceData),
  });
  return parseResponse(response);
};

export const recordPayment = async (invoiceId, paymentData) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(buildApiUrl(`/invoices/${invoiceId}/payment`), {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(paymentData),
  });
  return parseResponse(response);
};

export const sendInvoice = async (invoiceId, sendData) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(buildApiUrl(`/invoices/${invoiceId}/send`), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(sendData),
  });
  return parseResponse(response);
};

export const cancelInvoice = async (invoiceId) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(buildApiUrl(`/invoices/${invoiceId}`), {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return parseResponse(response);
};

// ============================================
// SETTINGS
// ============================================

export const getInvoiceSettings = async () => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(buildApiUrl('/invoices/settings'), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return parseResponse(response);
};

export const upsertInvoiceSettings = async (settingsData) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(buildApiUrl('/invoices/settings'), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(settingsData),
  });
  return parseResponse(response);
};

export const getInvoiceSettingsPreviewUrl = () => {
  return buildApiUrl('/invoices/settings/preview');
};

// ============================================
// FILE RETRIEVAL URLs
// ============================================

export const getInvoiceHtmlUrl = (invoiceId, signature) => {
  return buildApiUrl(`/invoices/${invoiceId}/html${signature ? `?signature=${signature}` : ''}`);
};

export const getInvoicePdfUrl = (invoiceId, signature) => {
  return buildApiUrl(`/invoices/${invoiceId}/pdf${signature ? `?signature=${signature}` : ''}`);
};

export const getInvoiceViewToken = async (invoiceId) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(buildApiUrl(`/invoices/${invoiceId}/sign`), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return parseResponse(response);
};
