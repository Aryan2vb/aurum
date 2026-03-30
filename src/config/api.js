const DEFAULT_BASE_URL = process.env.REACT_APP_API_BASE_URL || '/api';

// const DEFAULT_BASE_URL = 'http://10.7.16.238:3000';
// Remove trailing slashes so paths can be concatenated safely.
export const API_BASE_URL = DEFAULT_BASE_URL.replace(/\/+$/, '');

export const buildApiUrl = (path = '') => {
  if (!path) {
    return API_BASE_URL;
  }

  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

