import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import InvoiceTable from './InvoiceTable';

jest.mock('../../molecules/ImportExportMenu/ImportExportMenu', () => () => null);
jest.mock('../../../services/invoicesService', () => ({ getInvoices: jest.fn(), getInvoiceBillBookHtml: jest.fn() }));
jest.mock('../../../hooks/usePermission', () => ({ usePermission: () => ({ can: () => true }) }));

global.IS_REACT_ACT_ENVIRONMENT = true;

const invoices = [
  { id: 'i1', sn: 1, invoiceNumber: 'INV/1', status: 'PAID', totalAmount: 100, invoiceDate: '2026-11-01', customer: { fullName: 'A' } },
  { id: 'i2', sn: 2, invoiceNumber: 'INV/2', status: 'UNPAID', totalAmount: 200, invoiceDate: '2026-11-02', customer: { fullName: 'B' } },
];

const headerIds = (container) =>
  Array.from(container.querySelectorAll('thead th')).map((th) =>
    Array.from(th.classList).find((c) => c.startsWith('attio-col-')).replace('attio-col-', ''),
  );
const pinnedHeaderIds = (container) =>
  Array.from(container.querySelectorAll('thead th.attio-cell-pinned')).map((th) =>
    Array.from(th.classList).find((c) => c.startsWith('attio-col-')).replace('attio-col-', ''),
  );

describe('InvoiceTable column pinning', () => {
  let container;
  let root;
  beforeEach(() => {
    localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  const render = async () => {
    await act(async () => {
      root.render(<InvoiceTable data={invoices} embedded />);
    });
  };

  it('pins checkbox, S.N, Actions and Invoice No. by default, last one carries the edge', async () => {
    await render();
    expect(pinnedHeaderIds(container)).toEqual(['select', 'sn', 'actions', 'invoiceNumber']);
    expect(container.querySelector('thead th.attio-cell-pinned-last').classList).toContain('attio-col-invoiceNumber');
    // body cells are pinned too (jsdom can't read the var() offsets back, so only classes are checked)
    expect(container.querySelectorAll('tbody tr:first-child td.attio-cell-pinned')).toHaveLength(4);
  });

  it('pins another column after the fixed ones, unpins it, and remembers the choice', async () => {
    await render();
    const pinStatus = container.querySelector('thead th.attio-col-status button[aria-label^="Pin "]');
    expect(pinStatus).toBeTruthy();
    await act(async () => pinStatus.click());
    expect(pinnedHeaderIds(container)).toEqual(['select', 'sn', 'actions', 'invoiceNumber', 'status']);
    expect(headerIds(container).slice(0, 5)).toEqual(['select', 'sn', 'actions', 'invoiceNumber', 'status']);
    expect(container.querySelector('thead th.attio-cell-pinned-last').classList).toContain('attio-col-status');
    expect(JSON.parse(localStorage.getItem('invoiceTableColumnPinning')).left).toContain('status');

    await act(async () => container.querySelector('thead th.attio-col-status button[aria-label^="Unpin "]').click());
    expect(pinnedHeaderIds(container)).toEqual(['select', 'sn', 'actions', 'invoiceNumber']);
  });

  it('S.N, Actions and Invoice No. stay fixed even if a saved choice left them out', async () => {
    localStorage.setItem('invoiceTableColumnPinning', JSON.stringify({ left: ['select', 'status'], right: [] }));
    await render();
    expect(pinnedHeaderIds(container)).toEqual(['select', 'sn', 'actions', 'invoiceNumber', 'status']);
    ['sn', 'actions', 'invoiceNumber'].forEach((id) => {
      expect(container.querySelector(`thead th.attio-col-${id} .attio-pin-btn`)).toBeNull();
    });
  });

  it('the checkbox column has no pin button and stays pinned', async () => {
    await render();
    expect(container.querySelector('thead th.attio-col-select .attio-pin-btn')).toBeNull();
  });
});
