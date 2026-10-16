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

/**
 * Lightweight client cache for the footer library so switching pages or
 * reopening a slideover reuses the last result instead of refetching.
 *
 * - `data` holds the last successful payload, served while still fresh.
 * - `inFlight` dedupes concurrent calls into a single network request.
 * - Any mutation (upload/folder/update/default/archive/restore) clears it,
 *   so edits are always reflected on the next read.
 */
const STALE_MS = 30_000;
const libraryCache = { data: null, fetchedAt: 0, inFlight: null };

const invalidateFooterLibrary = () => {
  libraryCache.data = null;
  libraryCache.fetchedAt = 0;
  libraryCache.inFlight = null;
};

/**
 * @param {{ force?: boolean }} [opts] - pass { force: true } to bypass the cache.
 */
export const getFooterLibrary = (opts = {}) => {
  const now = Date.now();
  const isFresh = libraryCache.data && now - libraryCache.fetchedAt < STALE_MS;
  if (!opts.force && isFresh) return Promise.resolve(libraryCache.data);
  if (!opts.force && libraryCache.inFlight) return libraryCache.inFlight;

  const promise = request('')
    .then((data) => {
      libraryCache.data = data;
      libraryCache.fetchedAt = Date.now();
      libraryCache.inFlight = null;
      return data;
    })
    .catch((err) => {
      libraryCache.inFlight = null;
      throw err;
    });

  libraryCache.inFlight = promise;
  return promise;
};

export { invalidateFooterLibrary };

const mutate = (promise) => promise.then((result) => {
  invalidateFooterLibrary();
  return result;
});

export const createFooterFolder = (name) => mutate(request('/folders', { method: 'POST', body: JSON.stringify({ name }) }));
export const presignFooterAsset = (data) => request('/assets/presign', { method: 'POST', body: JSON.stringify(data) });
export const completeFooterAsset = (id) => mutate(request(`/assets/${id}/complete`, { method: 'POST' }));
export const updateFooterAsset = (id, data) => mutate(request(`/assets/${id}`, { method: 'PATCH', body: JSON.stringify(data) }));
export const setDefaultFooterAsset = (id) => mutate(request(`/assets/${id}/default`, { method: 'POST' }));
export const archiveFooterAsset = (id) => mutate(request(`/assets/${id}/archive`, { method: 'POST' }));
export const restoreFooterAsset = (id) => mutate(request(`/assets/${id}/restore`, { method: 'POST' }));
