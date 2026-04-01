import { buildApiUrl } from '../config/api';

const defaultHeaders = {
  'Content-Type': 'application/json',
};

export const clearSession = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userFullName');
  localStorage.removeItem('userRole');
  localStorage.removeItem('organizationName');
};

export const parseResponse = async (response) => {
  let payload = null;

  try {
    payload = await response.json();
  } catch (error) {
    // Some endpoints may not return JSON on error (e.g., 204 logouts).
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      clearSession();
    }
    const message =
      payload?.message ||
      payload?.error ||
      `Request failed with status ${response.status}`;

    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
};

export const login = async ({ email, password }) => {
  const response = await fetch(buildApiUrl('/auth/login'), {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify({ email, password }),
  });

  return parseResponse(response);
};

export const logout = async (token) => {
  if (!token) {
    return;
  }

  const response = await fetch(buildApiUrl('/auth/logout'), {
    method: 'POST',
    headers: {
      ...defaultHeaders,
      Authorization: `Bearer ${token}`,
    },
  });

  // Some APIs return 204 (no content) on logout; parsing handles that gracefully.
  try {
    await parseResponse(response);
  } catch (error) {
    // If the session is already invalid, treat it as a successful logout.
    if (error.status !== 401 && error.status !== 403) {
      throw error;
    }
  }
};

export const whoami = async () => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(buildApiUrl('/auth/whoami'), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const payload = await parseResponse(response);
  const organizationName = payload?.organization?.name;

  if (organizationName) {
    localStorage.setItem('organizationName', organizationName);
  }
  
  if (payload?.fullName) {
    localStorage.setItem('userFullName', payload.fullName);
  }

  if (payload?.organization?.role) {
    localStorage.setItem('userRole', payload.organization.role);
  }

  return payload;
};

