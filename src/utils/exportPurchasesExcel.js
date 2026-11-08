import * as XLSX from 'xlsx';
import { buildExportFilename } from './exportFilename';

/**
 * Exports Purchase Invoices to Excel matching the exact grouped header format.
 * Kept separate from exportUtils so xlsx is not pulled into invoice/customer table bundles.
 *
 * Format:
 * Row 1: "Purchase" (merged)
 * Row 2: [empty], [empty], "PLACE OF SUPPLY", "INVOICE DETAILS", "AMOUNT OF TAX", "WEIGHT"
 * Row 3: "NAME", "GSTIN", "STATE CODE", "STATE NAME", "INVOICE NO", "INVOICE DATE", "INVOICE VALUE", "TAXABLE VALUE", "SGST", "CGST", "IGST", "TOTAL TAX", "GOLD (GM)", "SILVER (GM)"
 */
export const exportPurchasesToExcel = (purchases, filename = 'Purchases') => {
  const headRow1 = [
    'Purchase', '', '', '', '', '', '', '', '', '', '', '', '', '',
  ];

  const headRow2 = [
    '', '',
    'PLACE OF SUPPLY', '',
    'INVOICE DETAILS', '', '',
    'AMOUNT OF TAX', '', '', '', '',
    'WEIGHT', '',
  ];

  const headRow3 = [
    'NAME', 'GSTIN',
    'STATE CODE', 'STATE NAME',
    'INVOICE NO', 'INVOICE DATE', 'INVOICE VALUE',
    'TAXABLE VALUE', 'SGST', 'CGST', 'IGST', 'TOTAL TAX',
    'GOLD (GM)', 'SILVER (GM)',
  ];

  const dataRows = purchases.map((p) => {
    const name = p.vendorName || p.vendor?.name || '-';
    const gstin = p.vendorGstin || p.vendor?.gstin || '-';
    const stateCode = p.vendorStateCode || p.vendor?.stateCode || '-';
    const stateName = p.vendorStateName || p.vendor?.stateName || '-';

    const invoiceNo = p.invoiceNumber || '-';
    const invoiceDate = p.purchaseDate ? new Date(p.purchaseDate).toLocaleDateString('en-GB') : '-';
    const invoiceValue = Number(p.grandTotal || p.totalAmount || 0);
    const taxableValue = Number(p.taxableAmount || 0);
    const sgst = Number(p.sgstAmount || 0);
    const cgst = Number(p.cgstAmount || 0);
    const igst = Number(p.igstAmount || 0);
    const totalTax = sgst + cgst + igst;

    const goldGm = Number(p.totalGoldWeight || 0);
    const silverGm = Number(p.totalSilverWeight || 0);

    return [
      name,
      gstin,
      stateCode,
      stateName,
      invoiceNo,
      invoiceDate,
      invoiceValue,
      taxableValue,
      sgst,
      cgst,
      igst,
      totalTax,
      goldGm,
      silverGm,
    ];
  });

  const worksheet = XLSX.utils.aoa_to_sheet([headRow1, headRow2, headRow3, ...dataRows]);

  worksheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 13 } },
    { s: { r: 1, c: 2 }, e: { r: 1, c: 3 } },
    { s: { r: 1, c: 4 }, e: { r: 1, c: 6 } },
    { s: { r: 1, c: 7 }, e: { r: 1, c: 11 } },
    { s: { r: 1, c: 12 }, e: { r: 1, c: 13 } },
  ];

  worksheet['!cols'] = [
    { wch: 20 },
    { wch: 15 },
    { wch: 12 },
    { wch: 15 },
    { wch: 15 },
    { wch: 12 },
    { wch: 15 },
    { wch: 15 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Purchases');

  XLSX.writeFile(workbook, buildExportFilename(filename, 'xlsx'));
};
