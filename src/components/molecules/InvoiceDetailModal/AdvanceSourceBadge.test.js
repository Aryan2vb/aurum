import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { AdvanceSourceBadge } from './InvoiceDetailModal';

jest.mock('../../../services/invoicesService', () => ({}));
jest.mock('../../../services/advanceService', () => ({}));

global.IS_REACT_ACT_ENVIRONMENT = true;

const render = async (ui) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(ui));
  return { container, unmount: () => act(async () => root.unmount()) };
};

describe('AdvanceSourceBadge', () => {
  it('shows the source customer and receipt behind an advance payment', async () => {
    const { container, unmount } = await render(
      <AdvanceSourceBadge
        invoiceCustomerId="cust-b"
        invoiceCustomerName="Priya Sharma"
        payment={{
          id: 'pay-1',
          source: 'ADVANCE',
          mode: 'UPI',
          amount: 4000,
          paidAt: '2026-01-10T00:00:00.000Z',
          reference: 'UTR123',
          sourceCustomerId: 'cust-a',
          sourceCustomerName: 'Sita Devi',
          advanceEntryId: 'r1',
          advanceReceipt: {
            id: 'r1',
            amount: 10000,
            transactionDate: '2026-01-10T00:00:00.000Z',
            paymentMethod: 'UPI',
            reference: 'UTR123',
            description: 'Wedding set booking',
          },
        }}
      />,
    );

    const trigger = container.querySelector('button');
    const card = container.querySelector('[role="tooltip"]');
    expect(trigger.textContent).toBe('Advance · Sita Devi');
    expect(trigger.getAttribute('aria-describedby')).toBe(card.id);
    expect(card.textContent).toContain('From another customer’s advance');
    expect(card.textContent).toContain('Sita Devi');
    expect(card.textContent).toContain('10 Jan 2026');
    expect(card.textContent).toContain('UTR123');
    expect(card.textContent).toContain('Wedding set booking');
    await unmount();
  });

  it('explains legacy lump-sum advance with no linked receipt', async () => {
    const { container, unmount } = await render(
      <AdvanceSourceBadge
        invoiceCustomerId="cust-a"
        invoiceCustomerName="Sita Devi"
        payment={{ id: 'pay-2', source: 'ADVANCE', mode: 'CREDIT', amount: 500, sourceCustomerId: 'cust-a' }}
      />,
    );
    const card = container.querySelector('[role="tooltip"]');
    expect(container.querySelector('button').textContent).toBe('Advance');
    expect(card.textContent).toContain('From advance');
    expect(card.textContent).toContain('Sita Devi');
    expect(card.textContent).toContain('lump sum');
    await unmount();
  });
  it('shows what was available on the receipt before this invoice, from issuedAdvanceAllocations', async () => {
    const { container, unmount } = await render(
      <AdvanceSourceBadge
        invoiceCustomerId="cust-a"
        invoiceCustomerName="Devendra Mishra"
        allocation={{ advanceEntryId: 'r1', amount: 10000, originalAmount: 400000, remainingAmount: 380000 }}
        payment={{
          id: 'pay-2',
          source: 'ADVANCE',
          mode: 'CASH',
          amount: 10000,
          sourceCustomerId: 'cust-a',
          advanceEntryId: 'r1',
          advanceReceipt: { id: 'r1', amount: 400000, transactionDate: '2026-01-19T00:00:00.000Z', paymentMethod: 'CASH' },
        }}
      />,
    );
    const card = container.querySelector('[role="tooltip"]');
    expect(card.textContent).toContain('Available before');
    expect(card.textContent).toContain('3,80,000');
    expect(card.textContent).toContain('Used here');
    expect(card.textContent).not.toContain('Receipt total');
    await unmount();
  });
  it('labels a receipt that came from an advance transfer', async () => {
    const { container, unmount } = await render(
      <AdvanceSourceBadge
        invoiceCustomerId="cust-a"
        invoiceCustomerName="Aryan Soni"
        payment={{
          id: 'pay-3',
          source: 'ADVANCE',
          mode: 'CREDIT',
          amount: 10000,
          sourceCustomerId: 'cust-a',
          advanceEntryId: 'r9',
          advanceReceipt: {
            id: 'r9',
            type: 'ADVANCE_TRANSFER_IN',
            amount: 10000,
            transactionDate: '2026-11-01T00:00:00.000Z',
            paymentMethod: null,
            description: 'Advance received from DEVENDRA MISHRA',
          },
        }}
      />,
    );
    const card = container.querySelector('[role="tooltip"]');
    expect(card.textContent).toContain('Advance transfer');
    expect(card.textContent).not.toContain('Credit');
    expect(card.textContent).toContain('Advance received from DEVENDRA MISHRA');
    await unmount();
  });
});
