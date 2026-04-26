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
  const nameParts = customerFullName.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  const items = invoice.items || [];
  
  // Calculate total payments per mode for the whole invoice
  const bankSum = (invoice.payments || [])
    .filter(p => p.mode !== 'CASH')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const cashSum = (invoice.payments || [])
    .filter(p => p.mode === 'CASH')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const totalBank = (invoice.payments && invoice.payments.length)
    ? bankSum
    : (invoice.modeOfPayment !== 'CASH' ? Number(invoice.paidAmount || 0) : 0);

  const totalCash = (invoice.payments && invoice.payments.length)
    ? cashSum
    : (invoice.modeOfPayment === 'CASH' ? Number(invoice.paidAmount || 0) : 0);

  // If no items, return at least one row with basic info
  if (items.length === 0) {
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
      'Gst 3%': 0,
      'Round off': invoice.roundOff || 0,
      'Total': invoice.totalAmount || 0,
      'Bank': totalBank,
      'Cash': totalCash,
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

    const totalGst = Number(invoice.cgstAmount || 0) + Number(invoice.sgstAmount || 0) + Number(invoice.igstAmount || 0);
    const itemGst = totalGst * ratio;
    
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
      'Amount': itemAmount.toFixed(2),
      'Labour PG': (Number(item.makingCharges) || 0).toFixed(2),
      'Labour Total': itemLabour.toFixed(2),
      'Hallmark Chrgs': itemHallmark.toFixed(2),
      'Gst 3%': itemGst.toFixed(2),
      'Round off': itemRoundOff.toFixed(2),
      'Total': (itemAmount + itemLabour + itemHallmark + itemGst + itemRoundOff).toFixed(2),
      'Bank': idx === 0 ? totalBank.toFixed(2) : '',
      'Cash': idx === 0 ? totalCash.toFixed(2) : '',
      'Gst No': buyer.gstin || ''
    };
  });
}
