import { normalizeWhatsAppPhone, buildInvoiceWhatsAppMessage, buildWhatsAppUrl } from './invoiceWhatsApp';

describe('invoiceWhatsApp', () => {
  test('normalizes Indian numbers', () => {
    expect(normalizeWhatsAppPhone('98765 43210')).toBe('919876543210');
    expect(normalizeWhatsAppPhone('+91 98765-43210')).toBe('919876543210');
    expect(normalizeWhatsAppPhone('09876543210')).toBe('919876543210');
    expect(normalizeWhatsAppPhone('')).toBe('');
  });

  test('builds a short message with the invoice link', () => {
    const msg = buildInvoiceWhatsAppMessage({
      customerName: 'Mrs. Shah', invoiceNumber: 'RK/200/26-27', amount: 12500, firmName: 'RK Jewellers', invoiceUrl: 'https://api.example.com/invoices/1/html?signature=abc',
    });
    expect(msg).toContain('Hi Mrs. Shah, please find your invoice RK/200/26-27 of ₹12,500 from RK Jewellers.');
    expect(msg).toContain('View your invoice: https://api.example.com/invoices/1/html?signature=abc');
  });

  test('omits optional parts', () => {
    const msg = buildInvoiceWhatsAppMessage({ invoiceNumber: 'INV-1' });
    expect(msg).toBe('Hello, please find your invoice INV-1.\n\nThank you!');
  });

  test('wa.me url falls back to the contact picker without a phone', () => {
    expect(buildWhatsAppUrl('9876543210', 'hi')).toBe('https://wa.me/919876543210?text=hi');
    expect(buildWhatsAppUrl('', 'hi')).toBe('https://wa.me/?text=hi');
  });
});
