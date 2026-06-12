import { buildBillBookRequest, getSelectedInvoiceIds } from './billBookExport';

describe('Bill Book export helpers', () => {
  it('deduplicates selected invoice IDs from invoice and item rows', () => {
    expect(getSelectedInvoiceIds([
      { original: { id: 'invoice-1' } },
      { original: { invoiceId: 'invoice-1' } },
      { original: { id: 'invoice-2' } },
    ])).toEqual(['invoice-1', 'invoice-2']);
  });

  it('uses selected IDs instead of active filters', () => {
    expect(buildBillBookRequest({
      selectedRows: [{ original: { id: 'invoice-1' } }],
      filters: { status: 'PAID', dateFrom: '2026-04-01' },
      search: 'MJ',
    })).toEqual({ invoiceIds: ['invoice-1'] });
  });

  it('uses active filters and search when nothing is selected', () => {
    expect(buildBillBookRequest({
      selectedRows: [],
      filters: { status: null, dateFrom: '2026-04-01', dateTo: '2026-04-30' },
      search: 'MJ',
    })).toEqual({
      dateFrom: '2026-04-01',
      dateTo: '2026-04-30',
      search: 'MJ',
    });
  });
});
