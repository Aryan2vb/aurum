import { calcInvoiceTotals, resolveTaxRates } from './invoiceCalc';

const items = [{ rate: 100, grossWeight: 10, stoneWeight: 0, makingCharges: 0 }]; // subtotal 1000

describe('resolveTaxRates', () => {
  const taxes = { cgstRate: 1.5, sgstRate: 1.5, igstRate: 3 };

  test('CGST_SGST applies CGST and SGST only', () => {
    expect(resolveTaxRates({ ...taxes, taxType: 'CGST_SGST' })).toEqual({
      taxType: 'CGST_SGST', cgstRate: 1.5, sgstRate: 1.5, igstRate: 0,
    });
  });

  test('IGST applies IGST only', () => {
    expect(resolveTaxRates({ ...taxes, taxType: 'IGST' })).toEqual({
      taxType: 'IGST', cgstRate: 0, sgstRate: 0, igstRate: 3,
    });
  });

  test('NONE zeroes every rate without needing the stored rates to be 0', () => {
    expect(resolveTaxRates({ ...taxes, taxType: 'NONE' })).toEqual({
      taxType: 'NONE', cgstRate: 0, sgstRate: 0, igstRate: 0,
    });
  });

  test('defaults to CGST_SGST and tolerates missing or string rates', () => {
    expect(resolveTaxRates({ cgstRate: '2', sgstRate: undefined })).toEqual({
      taxType: 'CGST_SGST', cgstRate: 2, sgstRate: 0, igstRate: 0,
    });
  });
});

describe('calcInvoiceTotals', () => {
  test('adds CGST and SGST', () => {
    const t = calcInvoiceTotals(items, 1.5, 1.5);
    expect([t.cgst, t.sgst, t.igst, t.total]).toEqual([15, 15, 0, 1030]);
  });

  test('adds IGST when given', () => {
    const t = calcInvoiceTotals(items, 0, 0, 0, 3);
    expect([t.cgst, t.sgst, t.igst, t.total]).toEqual([0, 0, 30, 1030]);
  });

  test('no tax leaves the total at the subtotal', () => {
    const t = calcInvoiceTotals(items, 0, 0);
    expect(t.total).toBe(1000);
  });
});
