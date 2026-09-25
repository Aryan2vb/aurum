import { buildApiUrl } from '../config/api';
import { parseResponse } from './authService';

const defaultHeaders = {
  'Content-Type': 'application/json',
};

const authHeaders = () => ({
  ...defaultHeaders,
  Authorization: `Bearer ${localStorage.getItem('authToken')}`,
});

export const createVendor = async (data) => {
  const response = await fetch(buildApiUrl('/vendors'), {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return parseResponse(response);
};

export const getVendors = async () => {
  const response = await fetch(buildApiUrl('/vendors'), {
    method: 'GET',
    headers: authHeaders(),
  });
  return parseResponse(response);
};

export const updateVendor = async (id, data) => {
  const response = await fetch(buildApiUrl(`/vendors/${id}`), {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return parseResponse(response);
};
