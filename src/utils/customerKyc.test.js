import {
  HIGH_VALUE_INVOICE_KYC_THRESHOLD,
  getHighValueInvoiceKycError,
  hasRequiredCustomerKyc,
  formatAadhaarNumber,
  normalizeAadhaarNumber,
  normalizePanNumber,
  validateAadhaarNumber,
  validatePanNumber,
} from './customerKyc';

describe('customer KYC helpers', () => {
  it('normalizes and validates a 12 digit Aadhaar number', () => {
    expect(normalizeAadhaarNumber('1234 5678 9012')).toBe('123456789012');
    expect(validateAadhaarNumber('123456789012')).toBe('');
    expect(validateAadhaarNumber('1234')).toBe('Aadhaar must be exactly 12 digits');
    expect(validateAadhaarNumber('12345678901A')).toBe('Aadhaar must contain digits only');
  });

  it('normalizes and validates PAN in uppercase format', () => {
    expect(normalizePanNumber(' abcde1234f ')).toBe('ABCDE1234F');
    expect(validatePanNumber('ABCDE1234F')).toBe('');
    expect(validatePanNumber('ABCDE12345')).toBe('PAN must be in the format ABCDE1234F');
  });

  it('formats full Aadhaar correctly', () => {
    expect(formatAadhaarNumber('123456789012')).toBe('1234 5678 9012');
  });

  it('requires both Aadhaar and PAN only for invoices over two lakhs', () => {
    const completeDocs = [{ aadharNumber: '123456789012', panNumber: 'ABCDE1234F' }];
    const missingPanDocs = [{ aadharNumber: '123456789012' }];

    expect(HIGH_VALUE_INVOICE_KYC_THRESHOLD).toBe(200000);
    expect(getHighValueInvoiceKycError(200000, [])).toBe('');
    expect(getHighValueInvoiceKycError(200000.01, completeDocs)).toBe('');
    expect(getHighValueInvoiceKycError(200000.01, missingPanDocs)).toBe(
      'Invoices above ₹2,00,000 require customer Aadhaar and PAN. Please add them in the customer profile before finalizing.',
    );
    expect(hasRequiredCustomerKyc(completeDocs)).toBe(true);
  });
});
