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

  it('unpins and pins a column from its header, and remembers the choice', async () => {
    await render();
    const unpin = container.querySelector('button[aria-label="Unpin Actions"]');
    await act(async () => unpin.click());
    expect(pinnedHeaderIds(container)).toEqual(['select', 'sn', 'invoiceNumber']);

    const pinStatus = Array.from(container.querySelectorAll('button.attio-pin-btn')).find((b) =>
      b.getAttribute('aria-label').startsWith('Pin ') && b.closest('th').classList.contains('attio-col-status'),
    );
    expect(pinStatus).toBeTruthy();
    await act(async () => pinStatus.click());
    expect(pinnedHeaderIds(container)).toEqual(['select', 'sn', 'invoiceNumber', 'status']);
    // the newly pinned column moves into the panel, right after the other pinned ones
    expect(headerIds(container).slice(0, 4)).toEqual(['select', 'sn', 'invoiceNumber', 'status']);
    expect(container.querySelector('thead th.attio-cell-pinned-last').classList).toContain('attio-col-status');
    expect(JSON.parse(localStorage.getItem('invoiceTableColumnPinning')).left).toContain('sn');
    expect(JSON.parse(localStorage.getItem('invoiceTableColumnPinning')).left).not.toContain('actions');
  });

  it('the checkbox column has no pin button and stays pinned', async () => {
    await render();
    expect(container.querySelector('thead th.attio-col-select .attio-pin-btn')).toBeNull();
  });
});
