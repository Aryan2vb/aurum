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

export const getDashboardSummary = (p) =>
  fetch(buildUrl('/analytics/dashboard/summary', p), { headers: getAuthHeaders() }).then(parseResponse);

export const getSalesTrend = (p) =>
  fetch(buildUrl('/analytics/sales/trend', p), { headers: getAuthHeaders() }).then(parseResponse);

export const getMetalAnalytics = (p) =>
  fetch(buildUrl('/analytics/metal', p), { headers: getAuthHeaders() }).then(parseResponse);

export const getPaymentAnalytics = (p) =>
  fetch(buildUrl('/analytics/payments', p), { headers: getAuthHeaders() }).then(parseResponse);

export const getGstHsnAnalytics = (p) =>
  fetch(buildUrl('/analytics/gst-hsn', p), { headers: getAuthHeaders() }).then(parseResponse);

export const getTopCustomers = (p) =>
  fetch(buildUrl('/analytics/customers', p), { headers: getAuthHeaders() }).then(parseResponse);

export const getTopItems = (p) =>
  fetch(buildUrl('/analytics/items', p), { headers: getAuthHeaders() }).then(parseResponse);

export const getLocationAnalytics = (p) =>
  fetch(buildUrl('/analytics/locations', p), { headers: getAuthHeaders() }).then(parseResponse);

export const getLabourAnalytics = (p) =>
  fetch(buildUrl('/analytics/labour', p), { headers: getAuthHeaders() }).then(parseResponse);

export const getRateAnalytics = (p) =>
  fetch(buildUrl('/analytics/rates', p), { headers: getAuthHeaders() }).then(parseResponse);

export const getInventoryMovement = (p) =>
  fetch(buildUrl('/analytics/inventory-movement', p), { headers: getAuthHeaders() }).then(parseResponse);

export const getDataQuality = (p) =>
  fetch(buildUrl('/analytics/data-quality', p), { headers: getAuthHeaders() }).then(parseResponse);

export const getUserAnalytics = (p) =>
  fetch(buildUrl('/analytics/users', p), { headers: getAuthHeaders() }).then(parseResponse);
