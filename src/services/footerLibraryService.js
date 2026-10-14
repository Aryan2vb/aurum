import { buildApiUrl } from '../config/api';
import { parseResponse } from './authService';

const request = async (path, options = {}) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(buildApiUrl(`/invoice-footers${path}`), {
    ...options,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  return parseResponse(response);
};

export const getFooterLibrary = () => request('');
export const createFooterFolder = (name) => request('/folders', { method: 'POST', body: JSON.stringify({ name }) });
export const presignFooterAsset = (data) => request('/assets/presign', { method: 'POST', body: JSON.stringify(data) });
export const completeFooterAsset = (id) => request(`/assets/${id}/complete`, { method: 'POST' });
export const updateFooterAsset = (id, data) => request(`/assets/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const setDefaultFooterAsset = (id) => request(`/assets/${id}/default`, { method: 'POST' });
export const archiveFooterAsset = (id) => request(`/assets/${id}/archive`, { method: 'POST' });
export const restoreFooterAsset = (id) => request(`/assets/${id}/restore`, { method: 'POST' });
