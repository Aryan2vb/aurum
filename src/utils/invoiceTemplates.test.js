import { getInvoiceDocumentTitle } from './invoiceTemplates';

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
