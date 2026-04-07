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
  const basicInfo = {
    id: invoice.id || '',
    invoiceNumber: invoice.invoiceNumber || '',
    invoiceDate: invoice.invoiceDate || '',
    financialYear: invoice.financialYear || '',
    status: invoice.status || '',
    
    // Customer Info
    customerName: invoice.customer?.fullName || invoice.buyerSnapshot?.name || '',
    customerCode: invoice.customer?.customerCode || '',
    customerPhone: invoice.customer?.contactDetails?.[0]?.primaryPhone || invoice.buyerSnapshot?.phone || '',
    customerAddress: invoice.buyerSnapshot?.address || '',
    customerGstin: invoice.buyerSnapshot?.gstin || '',

    // Financial Info
    taxType: invoice.taxType || '',
    subtotal: invoice.subtotal || '',
    cgstAmount: invoice.cgstAmount || '',
    sgstAmount: invoice.sgstAmount || '',
    igstAmount: invoice.igstAmount || '',
    roundOff: invoice.roundOff || '',
    totalAmount: invoice.totalAmount || '',
    paidAmount: invoice.paidAmount || '',
    balance: invoice.remainingBalance || 0,
    paymentMode: invoice.modeOfPayment || '',
    bankName: invoice.companySnapshot?.bankDetails?.bankName || '',

    itemCount: invoice._count?.items || 0,
    notes: invoice.notes || '',
    createdAt: invoice.createdAt || '',
  };

  // If there are items, we create a row per item for a granular export
  if (invoice.items && invoice.items.length > 0) {
    return invoice.items.map(item => ({
      ...basicInfo,
      // Item Details
      itemSlNo: item.slNo,
      itemDescription: item.description,
      itemHsnSac: item.hsnSac || '',
      itemQuantity: item.quantity,
      itemUnit: item.unit || 'GMS',

      itemGrossWeight: item.grossWeight || '',
      itemNetWeightGold: item.metalType !== 'SILVER' ? (item.netWeight || 0) : 0,
      itemNetWeightSilver: item.metalType === 'SILVER' ? (item.netWeight || 0) : 0,
      itemMetalRate: item.effectiveRate || item.metalRate || '',
      itemMakingCharges: item.makingChargesAmount || item.makingCharges || '',
      itemHuid: item.huid || '',
      itemTaxableAmount: item.taxableAmount,
      itemTotalAmount: item.totalAmount,
      // Aggregated-style fields for row-per-item export
      metal: item.metalType === 'SILVER' ? 'Silver' : 'Gold',
      bank: (invoice.modeOfPayment !== 'CASH') ? item.totalAmount : 0,
      cash: (invoice.modeOfPayment === 'CASH') ? item.totalAmount : 0,
    }));
  }

  // Fallback for aggregated view export (if items are NOT included)
  const items = invoice.items || [];
  const netWeightGold = items.filter(i => i.metalType !== 'SILVER').reduce((sum, i) => sum + (Number(i.netWeight) || 0), 0);
  const netWeightSilver = items.filter(i => i.metalType === 'SILVER').reduce((sum, i) => sum + (Number(i.netWeight) || 0), 0);

  return [{
    ...basicInfo,
    metal: items.some(i => i.metalType !== 'SILVER') && items.some(i => i.metalType === 'SILVER') ? 'Gold, Silver' : (items.some(i => i.metalType === 'SILVER') ? 'Silver' : 'Gold'),
    itemDescription: items.map(i => i.description).join(', '),
    netWeightGold,
    netWeightSilver,
    bank: (invoice.modeOfPayment !== 'CASH') ? invoice.totalAmount : 0,
    cash: (invoice.modeOfPayment === 'CASH') ? invoice.totalAmount : 0,
  }];
}
