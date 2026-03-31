import { buildApiUrl } from '../config/api';
import { parseResponse } from './authService';

const defaultHeaders = {
  'Content-Type': 'application/json',
};

export const addOrganizationMember = async (data) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(buildApiUrl('/organizations/members'), {
    method: 'POST',
    headers: {
      ...defaultHeaders,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  return parseResponse(response);
};

export const getOrganizationMembers = async () => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(buildApiUrl('/organizations/members'), {
    method: 'GET',
    headers: {
      ...defaultHeaders,
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse(response);
};

export const updateOrganizationMemberRole = async (userId, role) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(buildApiUrl(`/organizations/members/${userId}/role`), {
    method: 'PATCH',
    headers: {
      ...defaultHeaders,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ role }),
  });

  return parseResponse(response);
};

export const removeOrganizationMember = async (userId) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(buildApiUrl(`/organizations/members/${userId}`), {
    method: 'DELETE',
    headers: {
      ...defaultHeaders,
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 204) {
    return { success: true };
  }
  return parseResponse(response);
};
