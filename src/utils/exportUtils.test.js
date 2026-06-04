import { flattenInvoiceData } from './exportUtils';

describe('flattenInvoiceData', () => {
  it('keeps common title prefixes with the first name column', () => {
    const rows = flattenInvoiceData({
      invoiceNumber: 'MJ/60/26-27',
      invoiceDate: '2026-05-05',
      buyerSnapshot: {
        data: {
          name: 'MR. MANOJ SINGH',
          address: 'LAIN',
          phone: '7069121539',
        },
      },
      items: [
        {
          slNo: 1,
          description: 'CHOKAR',
          hsnSac: '711319',
          metalType: 'GOLD',
          netWeight: 1.96,
          metalRate: 13000,
        },
      ],
    });

    expect(rows[0]['Customer Name']).toBe('MR. MANOJ');
    expect(rows[0]['Last Name']).toBe('SINGH');
  });
});
