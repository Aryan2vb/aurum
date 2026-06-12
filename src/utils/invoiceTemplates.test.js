import {
  generateInvoiceHtml,
  generateJewelleryInvoiceHtml,
  generateModernInvoiceHtml,
  getInvoiceDocumentTitle,
} from './invoiceTemplates';

describe('getInvoiceDocumentTitle', () => {
  it('includes the customer name before the invoice number', () => {
    expect(getInvoiceDocumentTitle({
      buyer: { name: 'Customer Name' },
      metadata: { invoiceNo: 'RK_13_26-27' },
    })).toBe('Tax Invoice - Customer Name - RK_13_26-27');
  });

  it('keeps the existing title format when the customer name is missing', () => {
    expect(getInvoiceDocumentTitle({
      buyer: {},
      metadata: { invoiceNo: 'RK_13_26-27' },
    })).toBe('Tax Invoice - RK_13_26-27');
  });
});

describe('invoice payment dates', () => {
  const invoiceData = {
    company: {},
    buyer: {},
    metadata: {},
    items: [],
    taxes: { cgstRate: 0, cgstAmount: 0, sgstRate: 0, sgstAmount: 0 },
    hsnSummary: [],
    roundOff: 0,
    totalAmount: 100,
    payments: [{ mode: 'CASH', amount: 100, paidAt: '2026-05-22' }],
  };

  test.each([
    ['classic', generateInvoiceHtml],
    ['modern', generateModernInvoiceHtml],
    ['jewellery', generateJewelleryInvoiceHtml],
  ])('shows the selected payment date in the %s template', (_name, generateHtml) => {
    expect(generateHtml(invoiceData)).toContain('CASH: ₹100.00 · 22/05/26');
  });
});
