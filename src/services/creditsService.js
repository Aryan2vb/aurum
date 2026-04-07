import { buildApiUrl } from '../config/api';
import { parseResponse } from './authService';

/**
 * Credits Service - API calls for Udhar/Credit management
 */

const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
};

/**
 * Get all credits with filters
 */
export const getCredits = async (filters = {}) => {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, value);
    }
  });

  const url = buildApiUrl(`/credits${params.toString() ? `?${params.toString()}` : ''}`);
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  return parseResponse(response);
};

/**
 * Get credit by ID
 */
export const getCreditById = async (creditId) => {
  const url = buildApiUrl(`/credits/${creditId}`);
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  return parseResponse(response);
};

/**
 * Create new credit
 */
export const createCredit = async (creditData) => {
  const url = buildApiUrl('/credits');
  const response = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(creditData),
  });

  return parseResponse(response);
};

/**
 * Update credit
 */
export const updateCredit = async (creditId, updateData) => {
  const url = buildApiUrl(`/credits/${creditId}`);
  const response = await fetch(url, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(updateData),
  });

  return parseResponse(response);
};

/**
 * Delete credit (soft delete)
 */
export const deleteCredit = async (creditId) => {
  const url = buildApiUrl(`/credits/${creditId}`);
  const response = await fetch(url, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (response.status === 204) {
    return null;
  }
  return parseResponse(response);
};

/**
 * Get credit statistics
 */
export const getCreditStats = async () => {
  const url = buildApiUrl('/credits/stats');
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  return parseResponse(response);
};

/**
 * Get due reminders
 */
export const getDueReminders = async (days = 7) => {
  const url = buildApiUrl(`/credits/due-reminders?days=${days}`);
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  return parseResponse(response);
};

/**
 * Get customer statement
 */
export const getCustomerStatement = async (customerId) => {
  const url = buildApiUrl(`/reports/customer-statement/${customerId}`);
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return parseResponse(response);
};

/**
 * Get customer ledger entries
 */
export const getCustomerLedger = async (customerId) => {
  const url = buildApiUrl(`/credits/customer/${customerId}/ledger`);
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return parseResponse(response);
};

/**
 * Get customer udhar entries
 */
export const getCustomerUdhar = async (customerId) => {
  const url = buildApiUrl(`/credits/customer/${customerId}/udhar`);
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return parseResponse(response);
};

/**
 * Get customer credit summary
 */
export const getCustomerCreditSummary = async (customerId) => {
  const url = buildApiUrl(`/credits/customer/${customerId}/summary`);
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  return parseResponse(response);
};

/**
 * Get credit transactions (payments)
 */
export const getCreditTransactions = async (creditId) => {
  const url = buildApiUrl(`/credits/${creditId}/transactions`);
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  return parseResponse(response);
};

/**
 * Add payment transaction
 */
export const addPaymentTransaction = async (creditId, paymentData) => {
  const url = buildApiUrl(`/credits/${creditId}/transactions`);
  const response = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(paymentData),
  });

  return parseResponse(response);
};

/**
 * Update payment transaction
 */
export const updatePaymentTransaction = async (creditId, transactionId, updateData) => {
  const url = buildApiUrl(`/credits/${creditId}/transactions/${transactionId}`);
  const response = await fetch(url, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(updateData),
  });

  return parseResponse(response);
};

/**
 * Delete payment transaction
 */
export const deletePaymentTransaction = async (creditId, transactionId) => {
  const url = buildApiUrl(`/credits/${creditId}/transactions/${transactionId}`);
  const response = await fetch(url, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (response.status === 204) {
    return null;
  }
  return parseResponse(response);
};

/**
 * Update reminder date for a credit
 * @param {string} creditId - Credit ID
 * @param {Date|string} newDate - New reminder date
 * @returns {Promise<object>} Updated credit
 */
export const updateReminderDate = async (creditId, newDate) => {
  const url = buildApiUrl(`/credits/${creditId}`);
  const response = await fetch(url, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      nextReminderDate: newDate instanceof Date ? newDate.toISOString() : newDate,
    }),
  });

  return parseResponse(response);
};

/**
 * Get reminder impact preview for a given date
 * This simulates what credits would be due if reminders are scheduled for the given date
 * NOTE: This is a frontend simulation. A real backend endpoint can be added later.
 * @param {Date|string} targetDate - Target reminder date
 * @param {Array} reminders - Current list of reminders to calculate from
 * @returns {object} Impact preview data
 */
export const getReminderImpact = (targetDate, reminders = []) => {
  // Frontend simulation of impact calculation
  // In production, this would be a real API call:
  // const url = buildApiUrl(`/credits/reminder-impact?date=${targetDate}`);

  const target = targetDate instanceof Date ? targetDate : new Date(targetDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Calculate days from now
  const daysFromNow = Math.ceil((target - now) / (1000 * 60 * 60 * 24));

  // For a single credit context, return that credit's info
  // For multiple credits, aggregate
  if (reminders.length === 0) {
    return {
      daysFromNow,
      creditsCount: 1,
      totalAmount: 0,
    };
  }

  // Aggregate amounts from reminders that would be affected
  const totalAmount = reminders.reduce((sum, r) => {
    return sum + (r.remainingAmount || r.remainingBalance || 0);
  }, 0);

  return {
    daysFromNow,
    creditsCount: reminders.length,
    totalAmount,
  };
};

/**
 * Generate WhatsApp message URL for a reminder
 * @param {object} reminder - Reminder object with customer info
 * @returns {string} WhatsApp URL with pre-filled message
 */
export const generateWhatsAppUrl = (reminder) => {
  const { customer, remainingAmount, remainingBalance, expectedDueDate } = reminder;
  const amount = remainingAmount || remainingBalance || 0;
  const phone = customer?.phone || customer?.contactDetails?.[0]?.primaryPhone || '';
  const name = customer?.name || customer?.fullName || 'Customer';

  // Format date
  const dueDate = expectedDueDate
    ? new Date(expectedDueDate).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
    : 'soon';

  // Format amount
  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);

  const message = `Hi ${name}, this is a reminder regarding your pending amount of ${formattedAmount} due on ${dueDate}. Please let us know when you can make the payment. Thank you!`;

  // Clean phone number (remove spaces, dashes, etc.)
  const cleanPhone = phone.replace(/[\s\-()]/g, '');
  // Add country code if not present
  const formattedPhone = cleanPhone.startsWith('+')
    ? cleanPhone.replace('+', '')
    : (cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`);

  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
};
