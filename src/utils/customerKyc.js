export const HIGH_VALUE_INVOICE_KYC_THRESHOLD = 200000;

export const HIGH_VALUE_INVOICE_KYC_MESSAGE =
  'Invoices above ₹2,00,000 require customer Aadhaar and PAN. Please add them in the customer profile before finalizing.';

export const normalizeAadhaarNumber = (value = '') =>
  String(value || '').replace(/\s+/g, '');

export const normalizePanNumber = (value = '') =>
  String(value || '').trim().toUpperCase();

export const validateAadhaarNumber = (value = '') => {
  const normalized = normalizeAadhaarNumber(value);
  if (!normalized) return '';
  if (!/^\d+$/.test(normalized)) return 'Aadhaar must contain digits only';
  if (normalized.length !== 12) return 'Aadhaar must be exactly 12 digits';
  return '';
};

export const validatePanNumber = (value = '') => {
  const normalized = normalizePanNumber(value);
  if (!normalized) return '';
  if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(normalized)) {
    return 'PAN must be in the format ABCDE1234F';
  }
  return '';
};

export const formatAadhaarNumber = (aadharNumber = '') => {
  const normalized = normalizeAadhaarNumber(aadharNumber);
  if (normalized.length === 12) {
    return `${normalized.slice(0, 4)} ${normalized.slice(4, 8)} ${normalized.slice(8, 12)}`;
  }
  return 'Not added';
};

export const hasRequiredCustomerKyc = (documents = []) =>
  documents.some((doc) => {
    const aadhaarError = validateAadhaarNumber(doc?.aadharNumber);
    const panError = validatePanNumber(doc?.panNumber);
    return Boolean(doc?.aadharNumber && doc?.panNumber && !aadhaarError && !panError);
  });

export const getHighValueInvoiceKycError = (invoiceTotal, documents = []) => {
  if (Number(invoiceTotal || 0) <= HIGH_VALUE_INVOICE_KYC_THRESHOLD) return '';
  return hasRequiredCustomerKyc(documents) ? '' : HIGH_VALUE_INVOICE_KYC_MESSAGE;
};
