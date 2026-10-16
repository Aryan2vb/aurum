import { buildApiUrl } from '../config/api';
import { parseResponse } from './authService';

/**
 * Upload Service
 * 
 * Handles the two-step direct-to-R2 upload process:
 * 1. Get a presigned PUT URL from our backend
 * 2. Upload the file binary directly to Cloudflare R2
 */

/**
 * Gets a presigned URL for a specific asset type and file
 * 
 * @param {string} assetType - One of 'ORG_LOGO', 'ORG_BIS_LOGO', 'ORG_QR_CODE', 'ORG_SIGNATURE', etc.
 * @param {File} file - The file object from the browser
 * @param {string} [entityId] - Optional ID for non-singleton assets
 * @returns {Promise<{ presignedUrl: string, publicUrl: string, key: string, maxBytes: number }>}
 */
export const getPresignedUrl = async (assetType, file, entityId = null) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(buildApiUrl('/uploads/presign'), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      assetType,
      contentType: file.type,
      entityId,
    }),
  });
  
  return parseResponse(response);
};

/**
 * Uploads a file directly to the presigned URL
 * 
 * @param {string} presignedUrl - The URL obtained from getPresignedUrl
 * @param {File} file - The file object to upload
 */
export const uploadToR2 = async (presignedUrl, file) => {
  const response = await fetch(presignedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type,
    },
    body: file,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('R2 Upload Error:', errorText);
    throw new Error('Failed to upload file to storage');
  }
  
  return true;
};

/**
 * Deletes an asset from storage
 * 
 * @param {string} key - The R2 object key
 */
export const deleteAsset = async (key) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(buildApiUrl('/uploads'), {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ key }),
  });

  if (response.status === 204) return true;
  return parseResponse(response);
};
