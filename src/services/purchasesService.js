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

export const getPurchases = async () => {
  const response = await fetch(buildApiUrl('/purchases'), {
    method: 'GET',
    headers: authHeaders(),
  });
  return parseResponse(response);
};
