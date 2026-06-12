export const getSelectedInvoiceIds = (selectedRows = []) => Array.from(new Set(
  selectedRows
    .map(({ original }) => original?.invoiceId || original?.id)
    .filter(Boolean),
));

export const buildBillBookRequest = ({ selectedRows = [], filters = {}, search = '' }) => {
  const invoiceIds = getSelectedInvoiceIds(selectedRows);
  if (invoiceIds.length > 0) return { invoiceIds };

  return Object.fromEntries(
    Object.entries({ ...filters, search: search.trim() || null })
      .filter(([, value]) => value !== null && value !== undefined && value !== ''),
  );
};
