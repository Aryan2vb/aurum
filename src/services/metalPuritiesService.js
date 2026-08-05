import { buildApiUrl } from '../config/api';
import { parseResponse } from './authService';

const defaultHeaders = {
  'Content-Type': 'application/json',
};

const authHeaders = () => ({
  ...defaultHeaders,
  Authorization: `Bearer ${localStorage.getItem('authToken')}`,
});

export const getMetalPurities = async (includeInactive = false) => {
  const query = includeInactive ? '?includeInactive=1' : '';
  const response = await fetch(buildApiUrl(`/stock/purities${query}`), {
    method: 'GET',
    headers: authHeaders(),
  });
  return parseResponse(response);
};

export const createMetalPurity = async ({ metalType, label }) => {
  const response = await fetch(buildApiUrl('/stock/purities'), {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ metalType, label }),
  });
  return parseResponse(response);
};

export const updateMetalPurity = async (id, data) => {
  const response = await fetch(buildApiUrl(`/stock/purities/${encodeURIComponent(id)}`), {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return parseResponse(response);
};

export const hideMetalPurity = async (id) => {
  const response = await fetch(buildApiUrl(`/stock/purities/${encodeURIComponent(id)}`), {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return parseResponse(response);
};
