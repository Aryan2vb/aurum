import { normalizeWhatsAppPhone, buildInvoiceWhatsAppMessage, buildWhatsAppUrl, isMobileDevice } from './invoiceWhatsApp';

describe('invoiceWhatsApp', () => {
  test('normalizes Indian numbers', () => {
    expect(normalizeWhatsAppPhone('98765 43210')).toBe('919876543210');
    expect(normalizeWhatsAppPhone('+91 98765-43210')).toBe('919876543210');
    expect(normalizeWhatsAppPhone('09876543210')).toBe('919876543210');
    expect(normalizeWhatsAppPhone('')).toBe('');
  });

  test('builds a short message with the pdf link', () => {
    const msg = buildInvoiceWhatsAppMessage({
      customerName: 'Mrs. Shah', invoiceNumber: 'RK/200/26-27', amount: 12500, firmName: 'RK Jewellers', pdfUrl: 'https://x/pdf',
    });
    expect(msg).toContain('Hi Mrs. Shah, please find your invoice RK/200/26-27 of ₹12,500 from RK Jewellers.');
    expect(msg).toContain('Download PDF: https://x/pdf');
  });

  test('can say the pdf is attached instead of linking it', () => {
    const msg = buildInvoiceWhatsAppMessage({ invoiceNumber: 'INV-1', attachedNote: true });
    expect(msg).toContain('The invoice PDF is attached.');
    expect(msg).not.toContain('Download PDF');
  });

  test('omits optional parts', () => {
    const msg = buildInvoiceWhatsAppMessage({ invoiceNumber: 'INV-1' });
    expect(msg).toBe('Hello, please find your invoice INV-1.\n\nThank you!');
  });

  test('wa.me url falls back to the contact picker without a phone', () => {
    expect(buildWhatsAppUrl('9876543210', 'hi')).toBe('https://wa.me/919876543210?text=hi');
    expect(buildWhatsAppUrl('', 'hi')).toBe('https://wa.me/?text=hi');
  });

  test('detects mobile devices but not a Mac', () => {
    expect(isMobileDevice({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' })).toBe(true);
    expect(isMobileDevice({ userAgent: 'Mozilla/5.0 (Linux; Android 14)' })).toBe(true);
    expect(isMobileDevice({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', maxTouchPoints: 5 })).toBe(true);
    expect(isMobileDevice({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', maxTouchPoints: 0 })).toBe(false);
    expect(isMobileDevice({ userAgent: 'Mozilla/5.0 (Windows NT 10.0)' })).toBe(false);
  });
});
