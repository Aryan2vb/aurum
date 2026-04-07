import { buildApiUrl } from '../config/api';
import { parseResponse } from './authService';

const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('authToken')}`,
});

const buildUrl = (path, params = {}) => {
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))
  ).toString();
  return buildApiUrl(`${path}${query ? `?${query}` : ''}`);
};

export const getSalesReport       = (p) => fetch(buildUrl('/reports/sales', p),           { headers: getAuthHeaders() }).then(parseResponse);
export const getGstReport         = (p) => fetch(buildUrl('/reports/gst', p),             { headers: getAuthHeaders() }).then(parseResponse);
export const getCollectionsReport = (p) => fetch(buildUrl('/reports/collections', p),     { headers: getAuthHeaders() }).then(parseResponse);
export const getOutstandingReport = (p) => fetch(buildUrl('/reports/outstanding', p),     { headers: getAuthHeaders() }).then(parseResponse);
export const getInventoryFlowReport = (p) => fetch(buildUrl('/reports/inventory-flow', p), { headers: getAuthHeaders() }).then(parseResponse);
