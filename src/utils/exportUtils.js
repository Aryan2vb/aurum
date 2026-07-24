import * as XLSX from 'xlsx';
import { buildExportFilename } from './exportFilename';

/**
 * Utility functions for flattening nested objects for CSV/Excel export
 */

/**
 * Flatten nested customer object into a single-level object
 */
export const flattenCustomerData = (customer) => {
  const flattened = {
    // Basic info
    id: customer.id || '',
    customerCode: customer.customerCode || '',
    fullName: customer.fullName || '',
    gender: customer.gender || '',
    dateOfBirth: customer.dateOfBirth || '',
    status: customer.status || '',
    createdAt: customer.createdAt || '',
    updatedAt: customer.updatedAt || '',
    
    // Created by
    createdById: customer.createdBy?.id || '',
    createdByEmail: customer.createdBy?.email || '',
    createdByName: customer.createdBy?.name || '',
    
    // Updated by
    updatedById: customer.updatedBy?.id || '',
    updatedByEmail: customer.updatedBy?.email || '',
    updatedByName: customer.updatedBy?.name || '',
  };

  // Contact details (flatten first contact)
  const contact = customer.contactDetails?.[0] || {};
  flattened.contactDetailId = contact.id || '';
  flattened.primaryPhone = contact.primaryPhone || '';
  flattened.secondaryPhone = contact.secondaryPhone || '';
  flattened.preferredContactMethod = contact.preferredContactMethod || '';
  flattened.contactNotes = contact.notes || '';

  // Locations (flatten all locations with numbered prefix)
  const locations = customer.locations || [];
  locations.forEach((loc, idx) => {
    const prefix = `location${idx + 1}_`;
    flattened[`${prefix}id`] = loc.id || '';
    flattened[`${prefix}type`] = loc.type || '';
    flattened[`${prefix}addressLine1`] = loc.addressLine1 || '';
    flattened[`${prefix}addressLine2`] = loc.addressLine2 || '';
    flattened[`${prefix}city`] = loc.city || '';
    flattened[`${prefix}state`] = loc.state || '';
    flattened[`${prefix}postalCode`] = loc.postalCode || '';
    flattened[`${prefix}country`] = loc.country || '';
    flattened[`${prefix}isPrimary`] = loc.isPrimary ? 'Yes' : 'No';
    flattened[`${prefix}landmark`] = loc.landmark || '';
  });

  return flattened;
};

/**
 * Flatten nested invoice object into a single-level object (including line items)
 */
const NAME_TITLES = new Set([
  'MR',
  'MRS',
  'MS',
  'MISS',
  'DR',
  'SHRI',
  'SMT',
  'SRI',
]);

export const splitCustomerExportName = (fullName = '') => {
  const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return { firstName: parts[0] || '', lastName: '' };
  }

  const firstToken = parts[0].replace(/\./g, '').toUpperCase();
  const hasTitlePrefix = NAME_TITLES.has(firstToken);
  if (hasTitlePrefix && parts.length >= 3) {
    return {
      firstName: parts.slice(0, -1).join(' '),
      lastName: parts[parts.length - 1],
    };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
};

export const flattenInvoiceData = (invoice) => {
  const formatDate = (dateStr) => {
    if (!dateStr) return '';

    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

    // Detect date-only strings (YYYY-MM-DD format)
    const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (dateOnlyRegex.test(dateStr)) {
      const parts = dateStr.split('-');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);

      // Validate month (1-12)
      if (month < 1 || month > 12) return '';

      // Validate day within month's max days
      const daysInMonth = [31, (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      if (day < 1 || day > daysInMonth[month - 1]) return '';

      const monthName = months[month - 1];
      return `${String(day).padStart(2, '0')} ${monthName} ${year}`;
    }

    // For non-date-only inputs, use existing Date parsing
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const buyer = invoice.buyerSnapshot?.data || invoice.buyerSnapshot || {};
  const customerFullName = invoice.customer?.fullName || buyer.name || '';
  const { firstName, lastName } = splitCustomerExportName(customerFullName);

  const items = invoice.items || [];
  
  const cashSum = (invoice.payments || [])
    .filter(p => p.mode === 'CASH')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const upiSum = (invoice.payments || [])
    .filter(p => p.mode === 'UPI')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const swipeSum = (invoice.payments || [])
    .filter(p => p.mode === 'CARD')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const chequeSum = (invoice.payments || [])
    .filter(p => p.mode === 'CHEQUE')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const bankTransferSum = (invoice.payments || [])
    .filter(p => ['BANK_TRANSFER', 'NEFT', 'RTGS', 'IMPS'].includes(p.mode))
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const otherSum = (invoice.payments || [])
    .filter(p => !['CASH', 'UPI', 'CARD', 'CHEQUE', 'BANK_TRANSFER', 'NEFT', 'RTGS', 'IMPS'].includes(p.mode))
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const totalCash = (invoice.payments && invoice.payments.length)
    ? cashSum
    : (invoice.modeOfPayment === 'CASH' ? Number(invoice.paidAmount || 0) : 0);

  const totalUpi = (invoice.payments && invoice.payments.length)
    ? upiSum
    : (invoice.modeOfPayment === 'UPI' ? Number(invoice.paidAmount || 0) : 0);

  const totalSwipe = (invoice.payments && invoice.payments.length)
    ? swipeSum
    : (invoice.modeOfPayment === 'CARD' ? Number(invoice.paidAmount || 0) : 0);

  const totalCheque = (invoice.payments && invoice.payments.length)
    ? chequeSum
    : (invoice.modeOfPayment === 'CHEQUE' ? Number(invoice.paidAmount || 0) : 0);

  const totalBankTransfer = (invoice.payments && invoice.payments.length)
    ? bankTransferSum
    : (['BANK_TRANSFER', 'NEFT', 'RTGS', 'IMPS'].includes(invoice.modeOfPayment) ? Number(invoice.paidAmount || 0) : 0);

  const totalOther = (invoice.payments && invoice.payments.length)
    ? otherSum
    : (!['CASH', 'UPI', 'CARD', 'CHEQUE', 'BANK_TRANSFER', 'NEFT', 'RTGS', 'IMPS'].includes(invoice.modeOfPayment) && invoice.modeOfPayment ? Number(invoice.paidAmount || 0) : 0);

  // If no items, return at least one row with basic info
  if (items.length === 0) {
    const totalCgst = Number(invoice.cgstAmount || 0);
    const totalSgst = Number(invoice.sgstAmount || 0);

    return [{
      'Serial No.': 1,
      'Invoice No.': invoice.invoiceNumber || 'DRAFT',
      'Date': formatDate(invoice.invoiceDate),
      'Customer Name': firstName,
      'Last Name': lastName,
      'Address': buyer.address || '',
      'Contact No.': buyer.phone || '',
      'Metal': '',
      'Hsn': '',
      'Item Name': '',
      'Purity': '',
      'Net Wt. Gold': '',
      'Net Wt. Silver': '',
      'Metel Rate PG': '',
      'Amount': 0,
      'Labour PG': '',
      'Labour Total': 0,
      'Hallmark Chrgs': 0,
      'CGST': totalCgst.toFixed(2),
      'SGST': totalSgst.toFixed(2),
      'Round off': invoice.roundOff || 0,
      'Total': invoice.totalAmount || 0,
      'UPI': totalUpi,
      'Swipe': totalSwipe,
      'Cheque': totalCheque,
      'Bank Transfer': totalBankTransfer,
      'Cash': totalCash,
      'Other': totalOther,
      'Gst No': buyer.gstin || ''
    }];
  }

  // Map each item to a row
  return items.map((item, idx) => {
    const itemAmount = Number(item.taxableAmount || item.totalAmount || 0);
    const itemLabour = Number(item.makingChargesAmount || 0);
    const itemHallmark = Number(item.hallmarkingCharge || 0);
    
    // Proportional GST for the item (allocated based on item amount only, not labour)
    const subtotal = Number(invoice.subtotal || invoice.taxableAmount || 0);
    const ratio = subtotal > 0 ? itemAmount / subtotal : (1 / items.length);

    const totalCgst = Number(invoice.cgstAmount || 0);
    const totalSgst = Number(invoice.sgstAmount || 0);

    const itemCgst = totalCgst * ratio;
    const itemSgst = totalSgst * ratio;

    // We only put the full round-off on the first item to keep the total matching
    const itemRoundOff = idx === 0 ? Number(invoice.roundOff || 0) : 0;

    return {
      'Serial No.': item.slNo || (idx + 1),
      'Invoice No.': invoice.invoiceNumber || 'DRAFT',
      'Date': formatDate(invoice.invoiceDate),
      'Customer Name': firstName,
      'Last Name': lastName,
      'Address': buyer.address || '',
      'Contact No.': buyer.phone || '',
      'Metal': item.metalType === 'SILVER' ? 'Silver' : 'Gold',
      'Hsn': item.hsnSac || '',
      'Item Name': item.description || '',
      'Purity': item.purityLabel || item.purity || '',
      'Net Wt. Gold': item.metalType !== 'SILVER' ? (Number(item.netWeight) || 0).toFixed(3) : '',
      'Net Wt. Silver': item.metalType === 'SILVER' ? (Number(item.netWeight) || 0).toFixed(3) : '',
      'Metel Rate PG': (Number(item.metalRate) || 0).toFixed(2),
      'Labour PG': (Number(item.makingCharges) || 0).toFixed(2),
      'Labour Total': itemLabour.toFixed(2),
      'Hallmark Chrgs': itemHallmark.toFixed(2),
      'Amount': itemAmount.toFixed(2),
      'CGST': itemCgst.toFixed(2),
      'SGST': itemSgst.toFixed(2),
      'Round off': itemRoundOff.toFixed(2),
      'Total': (itemAmount + itemCgst + itemSgst + itemRoundOff).toFixed(2),
      'UPI': idx === 0 ? totalUpi.toFixed(2) : '',
      'Swipe': idx === 0 ? totalSwipe.toFixed(2) : '',
      'Cheque': idx === 0 ? totalCheque.toFixed(2) : '',
      'Bank Transfer': idx === 0 ? totalBankTransfer.toFixed(2) : '',
      'Cash': idx === 0 ? totalCash.toFixed(2) : '',
      'Other': idx === 0 ? totalOther.toFixed(2) : '',
      'Gst No': buyer.gstin || ''
    };
  });
}

/**
 * Payment-date-aware flattening: produces ONE ROW PER PAYMENT per invoice.
 * If an invoice has 3 payments on different dates, it returns 3 rows
 * (each repeating the invoice/item base data).
 *
 * Payment columns added:
 *   'Payment Date'   — paidAt formatted the same way as 'Date'
 *   'Payment Mode'   — Cash / UPI / Swipe/Card / Cheque / Bank Transfer / etc.
 *   'Payment Amount' — amount of that individual payment
 *   'Payment Ref'    — reference / cheque number (optional)
 *
 * When there are no payments recorded, one row per item is returned with
 * those columns left blank (or legacy modeOfPayment fallback for row 0).
 */
export const flattenInvoiceDataByPayment = (invoice) => {
  // Re-use the existing flattener to get item-level rows (one per item)
  const itemRows = flattenInvoiceData(invoice);

  const formatDateLocal = (dateStr) => {
    if (!dateStr) return '';
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (dateOnlyRegex.test(dateStr)) {
      const parts = dateStr.split('-');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      if (month < 1 || month > 12) return '';
      return `${String(day).padStart(2, '0')} ${months[month - 1]} ${year}`;
    }
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return `${String(date.getDate()).padStart(2, '0')} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const MODE_LABELS = {
    CASH: 'Cash', UPI: 'UPI', CARD: 'Swipe/Card',
    CHEQUE: 'Cheque', BANK_TRANSFER: 'Bank Transfer',
    NEFT: 'NEFT', RTGS: 'RTGS', IMPS: 'IMPS',
    CREDIT: 'Credit/Advance',
  };

  const payments = invoice.payments || [];

  // Strip the already-collapsed payment columns from item rows —
  // they will be replaced by the per-payment breakdown below.
  const PAYMENT_COLS_TO_STRIP = ['UPI', 'Swipe', 'Cheque', 'Bank Transfer', 'Cash', 'Other'];

  const baseRows = itemRows.map(row => {
    const stripped = { ...row };
    PAYMENT_COLS_TO_STRIP.forEach(col => { delete stripped[col]; });
    stripped['Payment Date']   = '';
    stripped['Payment Mode']   = '';
    stripped['Payment Amount'] = '';
    stripped['Payment Ref']    = '';
    return stripped;
  });

  if (payments.length === 0) {
    // No payments recorded — use legacy modeOfPayment fallback on first row
    const mode = invoice.modeOfPayment;
    const paid = Number(invoice.paidAmount || 0);
    baseRows.forEach((row, idx) => {
      if (idx === 0 && mode && paid > 0) {
        row['Payment Date']   = formatDateLocal(invoice.updatedAt || invoice.invoiceDate);
        row['Payment Mode']   = MODE_LABELS[mode] || mode;
        row['Payment Amount'] = paid.toFixed(2);
      }
    });
    return baseRows;
  }

  // Expand: for each payment → replicate all item rows with that payment's data
  const result = [];
  payments.forEach((payment) => {
    const payDate   = formatDateLocal(payment.paidAt || payment.createdAt);
    const payMode   = MODE_LABELS[payment.mode] || payment.mode || '';
    const payAmount = Number(payment.amount || 0).toFixed(2);
    const payRef    = payment.reference || payment.notes || '';

    baseRows.forEach(row => {
      result.push({
        ...row,
        'Payment Date':   payDate,
        'Payment Mode':   payMode,
        'Payment Amount': payAmount,
        'Payment Ref':    payRef,
      });
    });
  });

  return result;
};

/**
 * Exports Purchase Invoices to Excel matching the exact grouped header format.
 * Format:
 * Row 1: "Purchase" (merged)
 * Row 2: [empty], [empty], "PLACE OF SUPPLY", "INVOICE DETAILS", "AMOUNT OF TAX", "WEIGHT"
 * Row 3: "NAME", "GSTIN", "STATE CODE", "STATE NAME", "INVOICE NO", "INVOICE DATE", "INVOICE VALUE", "TAXABLE VALUE", "SGST", "CGST", "IGST", "TOTAL TAX", "GOLD (GM)", "SILVER (GM)"
 */
export const exportPurchasesToExcel = (purchases, filename = 'Purchases') => {
  const headRow1 = [
    'Purchase', '', '', '', '', '', '', '', '', '', '', '', '', ''
  ];
  
  const headRow2 = [
    '', '', 
    'PLACE OF SUPPLY', '', 
    'INVOICE DETAILS', '', '', 
    'AMOUNT OF TAX', '', '', '', '', 
    'WEIGHT', ''
  ];
  
  const headRow3 = [
    'NAME', 'GSTIN', 
    'STATE CODE', 'STATE NAME', 
    'INVOICE NO', 'INVOICE DATE', 'INVOICE VALUE', 
    'TAXABLE VALUE', 'SGST', 'CGST', 'IGST', 'TOTAL TAX', 
    'GOLD (GM)', 'SILVER (GM)'
  ];

  const dataRows = purchases.map(p => {
    // Determine Vendor Details (prefer snapshot on invoice, fallback to relation)
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
      silverGm
    ];
  });

  const worksheet = XLSX.utils.aoa_to_sheet([headRow1, headRow2, headRow3, ...dataRows]);

  // Merge cells for grouped headers
  worksheet['!merges'] = [
    // Row 1: Merge A1:N1
    { s: { r: 0, c: 0 }, e: { r: 0, c: 13 } },
    
    // Row 2 Groupings
    // PLACE OF SUPPLY (C2:D2) => cols 2 to 3
    { s: { r: 1, c: 2 }, e: { r: 1, c: 3 } },
    // INVOICE DETAILS (E2:G2) => cols 4 to 6
    { s: { r: 1, c: 4 }, e: { r: 1, c: 6 } },
    // AMOUNT OF TAX (H2:L2) => cols 7 to 11
    { s: { r: 1, c: 7 }, e: { r: 1, c: 11 } },
    // WEIGHT (M2:N2) => cols 12 to 13
    { s: { r: 1, c: 12 }, e: { r: 1, c: 13 } },
  ];

  // Set column widths for better readability
  worksheet['!cols'] = [
    { wch: 20 }, // NAME
    { wch: 15 }, // GSTIN
    { wch: 12 }, // STATE CODE
    { wch: 15 }, // STATE NAME
    { wch: 15 }, // INVOICE NO
    { wch: 12 }, // INVOICE DATE
    { wch: 15 }, // INVOICE VALUE
    { wch: 15 }, // TAXABLE VALUE
    { wch: 10 }, // SGST
    { wch: 10 }, // CGST
    { wch: 10 }, // IGST
    { wch: 12 }, // TOTAL TAX
    { wch: 12 }, // GOLD (GM)
    { wch: 12 }, // SILVER (GM)
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Purchases');
  
  XLSX.writeFile(workbook, buildExportFilename(filename, 'xlsx'));
};
