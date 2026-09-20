import { buildApiUrl } from '../config/api';
import { parseResponse } from './authService';

const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  return {
    Authorization: `Bearer ${token}`,
  };
};

/**
 * Downloads the organization backup JSON file directly to user's computer.
 */
export const downloadOrganizationBackup = async () => {
  const response = await fetch(buildApiUrl('/backup/organization'), {
    method: 'GET',
    headers: {
      ...getAuthHeaders(),
    },
  });

  if (!response.ok) {
    const errorData = await parseResponse(response);
    throw new Error(errorData.message || 'Failed to generate organization backup');
  }

  // Extract filename from header if present
  let filename = 'aurum_org_backup.json';
  const disposition = response.headers.get('Content-Disposition');
  if (disposition && disposition.includes('filename=')) {
    const match = disposition.match(/filename="?([^"]+)"?/);
    if (match && match[1]) {
      filename = match[1];
    }
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoking synchronously can cancel the download in Safari
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);

  return { success: true, filename };
};

/**
 * Uploads and imports an organization JSON backup file.
 */
export const importOrganizationBackup = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(buildApiUrl('/backup/organization/import'), {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
    },
    body: formData,
  });

  return parseResponse(response);
};

/**
 * Fetches backup permissions/status (whether current user is Super Admin).
 */
export const getBackupStatus = async () => {
  const response = await fetch(buildApiUrl('/backup/status'), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  });

  return parseResponse(response);
};

/**
 * Fetches organization backup history logs.
 */
export const getOrgBackupHistory = async () => {
  const response = await fetch(buildApiUrl('/backup/organization/history'), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  });

  return parseResponse(response);
};

/**
 * Triggers full system backup (Super Admin / Owner).
 */
export const triggerFullSystemBackup = async () => {
  const response = await fetch(buildApiUrl('/backup/admin/full'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  });

  return parseResponse(response);
};

/**
 * Lists stored server dumps.
 */
export const getStoredBackups = async () => {
  const response = await fetch(buildApiUrl('/backup/admin/stored'), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  });

  return parseResponse(response);
};

/**
 * Downloads a stored server dump file.
 */
export const downloadStoredBackup = async (filename) => {
  const response = await fetch(buildApiUrl(`/backup/admin/download/${encodeURIComponent(filename)}`), {
    method: 'GET',
    headers: {
      ...getAuthHeaders(),
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download backup file ${filename}`);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoking synchronously can cancel the download in Safari
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);

  return { success: true };
};
