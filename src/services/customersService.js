import { buildApiUrl } from '../config/api';
import { parseResponse } from './authService';

// ============================================
// CUSTOMER OPERATIONS
// ============================================

export const getCustomers = async (page = 1, limit = 10) => {
  const token = localStorage.getItem('authToken');
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  const response = await fetch(buildApiUrl(`/customers?${queryParams}`), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return parseResponse(response);
};

export const getCustomerById = async (customerId) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(buildApiUrl(`/customers/${customerId}`), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return parseResponse(response);
};

export const getCustomerByCode = async (customerCode) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(buildApiUrl(`/customers/code/${customerCode}`), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return parseResponse(response);
};

export const createCustomer = async (customerData) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(buildApiUrl('/customers'), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(customerData),
  });
  return parseResponse(response);
};

export const updateCustomer = async (customerId, updateData) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(buildApiUrl(`/customers/${customerId}`), {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updateData),
  });
  return parseResponse(response);
};

// ============================================
// CONTACT DETAIL OPERATIONS
// ============================================

export const addContactDetail = async (customerId, contactData) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(buildApiUrl(`/customers/${customerId}/contact-details`), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(contactData),
  });
  return parseResponse(response);
};

export const updateContactDetail = async (customerId, contactDetailId, updateData) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(buildApiUrl(`/customers/${customerId}/contact-details/${contactDetailId}`), {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updateData),
  });
  return parseResponse(response);
};

// ============================================
// LOCATION OPERATIONS
// ============================================

export const addLocation = async (customerId, locationData) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(buildApiUrl(`/customers/${customerId}/locations`), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(locationData),
  });
  return parseResponse(response);
};

export const updateLocation = async (customerId, locationId, updateData) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(buildApiUrl(`/customers/${customerId}/locations/${locationId}`), {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updateData),
  });
  return parseResponse(response);
};

export const deleteLocation = async (customerId, locationId) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(buildApiUrl(`/customers/${customerId}/locations/${locationId}`), {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return parseResponse(response);
};

// ============================================
// SEARCH & STATS
// ============================================

export const searchCustomers = async (searchParams = {}) => {
  const token = localStorage.getItem('authToken');
  const queryString = new URLSearchParams(searchParams).toString();
  const response = await fetch(buildApiUrl(`/customers/search?${queryString}`), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return parseResponse(response);
};

export const getCustomerStats = async () => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(buildApiUrl('/customers/stats'), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return parseResponse(response);
};

// ============================================
// CUSTOMER CREDITS
// ============================================

/**
 * Get all credits for a specific customer
 * @param {string} customerId - Customer ID
 * @returns {Promise<Array>} Array of credits
 */
export const getCustomerCredits = async (customerId) => {
  const { getCredits } = await import('./creditsService');
  return getCredits({ customerId });
};

// ============================================
// BULK OPERATIONS
// ============================================

export const bulkUpdateCustomerStatus = async (customerIds, status) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(buildApiUrl('/customers/bulk/status'), {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ customerIds, status }),
  });
  return parseResponse(response);
};

/**
 * Bulk create customers
 * @param {Array} customers - Array of customer objects
 * @returns {Promise<object>} Response with created customers
 */
export const bulkCreateCustomers = async (customers) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(buildApiUrl('/customers/bulk'), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ customers }),
  });
  return parseResponse(response);
};

export const softDeleteCustomer = async (customerId) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(buildApiUrl(`/customers/${customerId}`), {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return parseResponse(response);
};

export const restoreCustomer = async (customerId) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(buildApiUrl(`/customers/${customerId}/restore`), {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return parseResponse(response);
};

// ============================================
// CONTACT DETAIL OPERATIONS (continued)
// ============================================

export const deleteContactDetail = async (customerId, contactDetailId) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(buildApiUrl(`/customers/${customerId}/contact-details/${contactDetailId}`), {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return parseResponse(response);
};

// ============================================
// SOCIAL CONTEXT OPERATIONS
// ============================================

export const getSocialContexts = async (customerId) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(buildApiUrl(`/customers/${customerId}/social-contexts`), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return parseResponse(response);
};

export const addSocialContext = async (customerId, socialContextData) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(buildApiUrl(`/customers/${customerId}/social-contexts`), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(socialContextData),
  });
  return parseResponse(response);
};

export const updateSocialContext = async (customerId, socialContextId, updateData) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(buildApiUrl(`/customers/${customerId}/social-contexts/${socialContextId}`), {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updateData),
  });
  return parseResponse(response);
};

export const deleteSocialContext = async (customerId, socialContextId) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(buildApiUrl(`/customers/${customerId}/social-contexts/${socialContextId}`), {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return parseResponse(response);
};

// ============================================
// DOCUMENT OPERATIONS
// ============================================

export const getDocuments = async (customerId) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(buildApiUrl(`/customers/${customerId}/documents`), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return parseResponse(response);
};

export const addDocument = async (customerId, documentData) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(buildApiUrl(`/customers/${customerId}/documents`), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(documentData),
  });
  return parseResponse(response);
};

export const updateDocument = async (customerId, documentId, updateData) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(buildApiUrl(`/customers/${customerId}/documents/${documentId}`), {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updateData),
  });
  return parseResponse(response);
};

export const deleteDocument = async (customerId, documentId) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(buildApiUrl(`/customers/${customerId}/documents/${documentId}`), {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return parseResponse(response);
};

// ============================================
// ACCOUNT OPERATIONS
// ============================================

export const getAccounts = async (customerId) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(buildApiUrl(`/customers/${customerId}/accounts`), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return parseResponse(response);
};

export const addAccount = async (customerId, accountData) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(buildApiUrl(`/customers/${customerId}/accounts`), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(accountData),
  });
  return parseResponse(response);
};

export const updateAccount = async (customerId, accountId, updateData) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(buildApiUrl(`/customers/${customerId}/accounts/${accountId}`), {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updateData),
  });
  return parseResponse(response);
};

export const deleteAccount = async (customerId, accountId) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(buildApiUrl(`/customers/${customerId}/accounts/${accountId}`), {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return parseResponse(response);
};

// ============================================
// META TRACKING OPERATIONS
// ============================================

export const getMetaTrackings = async (customerId) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(buildApiUrl(`/customers/${customerId}/meta-tracking`), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return parseResponse(response);
};

export const addMetaTracking = async (customerId, metaTrackingData) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(buildApiUrl(`/customers/${customerId}/meta-tracking`), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metaTrackingData),
  });
  return parseResponse(response);
};

export const updateMetaTracking = async (customerId, metaTrackingId, updateData) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(buildApiUrl(`/customers/${customerId}/meta-tracking/${metaTrackingId}`), {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updateData),
  });
  return parseResponse(response);
};

export const deleteMetaTracking = async (customerId, metaTrackingId) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(buildApiUrl(`/customers/${customerId}/meta-tracking/${metaTrackingId}`), {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return parseResponse(response);
};
