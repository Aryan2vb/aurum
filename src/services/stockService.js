import { buildApiUrl } from '../config/api';
import { parseResponse } from './authService';

const defaultHeaders = {
  'Content-Type': 'application/json',
};

const authHeaders = () => ({
  ...defaultHeaders,
  Authorization: `Bearer ${localStorage.getItem('authToken')}`,
});

export const getStockBalances = async () => {
  const response = await fetch(buildApiUrl('/stock/balances'), {
    method: 'GET',
    headers: authHeaders(),
  });
  return parseResponse(response);
};

export const getStockLedger = async (metalType = '', purity = '') => {
  const queryParams = new URLSearchParams();
  if (metalType) queryParams.append('metalType', metalType);
  if (purity) queryParams.append('purity', purity);
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

  const response = await fetch(buildApiUrl(`/stock/ledger${queryString}`), {
    method: 'GET',
    headers: authHeaders(),
  });
  return parseResponse(response);
};

export const initializeOpeningBalance = async (data) => {
  const response = await fetch(buildApiUrl('/stock/opening-balance'), {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return parseResponse(response);
};

export const getStockGroupSummary = async (startDate = '', endDate = '') => {
  const queryParams = new URLSearchParams();
  if (startDate) queryParams.append('startDate', startDate);
  if (endDate) queryParams.append('endDate', endDate);
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

  const response = await fetch(buildApiUrl(`/stock/group-summary${queryString}`), {
    method: 'GET',
    headers: authHeaders(),
  });
  return parseResponse(response);
};
