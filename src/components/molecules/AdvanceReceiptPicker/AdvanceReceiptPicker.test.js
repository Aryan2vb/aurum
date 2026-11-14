import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import AdvanceReceiptPicker from './AdvanceReceiptPicker';
import * as advanceService from '../../../services/advanceService';
import * as customersService from '../../../services/customersService';

jest.mock('../../../services/advanceService');
jest.mock('../../../services/customersService');

global.IS_REACT_ACT_ENVIRONMENT = true;

const makeMonthlyReceipts = (count = 10, customerId = 'cust-a') =>
  Array.from({ length: count }, (_, idx) => {
    const month = String(idx + 1).padStart(2, '0');
    return {
      id: `adv-${idx + 1}`,
      customerId,
      transactionDate: `2026-${month}-10T00:00:00.000Z`,
      paymentMethod: idx % 2 === 0 ? 'UPI' : 'CASH',
      reference: `REF-${idx + 1}`,
      originalAmount: 10000,
      remainingAmount: 10000,
    };
  });

const ControlledPicker = (props) => {
  const [selected, setSelected] = React.useState(props.initialSelected || []);
  return (
    <AdvanceReceiptPicker
      primaryCustomerId="cust-a"
      primaryCustomerName="Sita Devi"
      invoiceDate="2026-11-10"
      invoiceTotal={55000}
      directPaymentsTotal={25000}
      {...props}
      selectedAdvances={selected}
      onSelectedAdvancesChange={(next) => {
        setSelected(next);
        props.onChangeSpy?.(next);
      }}
    />
  );
};

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('AdvanceReceiptPicker', () => {
  let container;
  let root;

  const renderPicker = async (ui) => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root.render(ui);
      await flushPromises();
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    if (root) {
      await act(async () => {
        root.unmount();
      });
      root = null;
    }
    if (container) {
      container.remove();
      container = null;
    }
  });

  it('allows picking 3 of 10 monthly deposits and preserves each entry date and mode', async () => {
    advanceService.getAvailableAdvances.mockResolvedValue(makeMonthlyReceipts(10));
    const onChangeSpy = jest.fn();

    await renderPicker(<ControlledPicker onChangeSpy={onChangeSpy} />);

    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes).toHaveLength(10);

    await act(async () => {
      checkboxes[0].click(); // Jan UPI 10000
    });
    await act(async () => {
      checkboxes[1].click(); // Feb CASH 10000
    });
    await act(async () => {
      checkboxes[2].click(); // Mar UPI 10000
    });

    const latest = onChangeSpy.mock.calls[onChangeSpy.mock.calls.length - 1][0];
    expect(latest).toHaveLength(3);
    expect(latest.map((a) => [a.advanceEntryId, a.paymentMethod, a.applyAmount])).toEqual([
      ['adv-1', 'UPI', 10000],
      ['adv-2', 'CASH', 10000],
      ['adv-3', 'UPI', 10000],
    ]);
    expect(container.textContent).toContain('3 selected');
    expect(container.textContent).toContain('₹30,000');
  });

  it('supports splitting an individual receipt amount (e.g., ₹6,000 of ₹10,000)', async () => {
    advanceService.getAvailableAdvances.mockResolvedValue([
      {
        id: 'adv-1',
        customerId: 'cust-a',
        transactionDate: '2026-01-10',
        paymentMethod: 'UPI',
        originalAmount: 10000,
        remainingAmount: 10000,
      },
    ]);
    const onChangeSpy = jest.fn();

    await renderPicker(<ControlledPicker onChangeSpy={onChangeSpy} />);

    const checkbox = container.querySelector('input[type="checkbox"]');
    await act(async () => {
      checkbox.click();
    });

    const amountInput = container.querySelector('input[type="number"]');
    expect(amountInput).not.toBeNull();

    await act(async () => {
      Simulate.change(amountInput, { target: { value: '6000' } });
    });
    await act(async () => {
      Simulate.blur(amountInput, { target: { value: '6000' } });
    });

    const latest = onChangeSpy.mock.calls[onChangeSpy.mock.calls.length - 1][0];
    expect(latest[0].applyAmount).toBe(6000);
    expect(container.textContent).toContain('₹6,000');
  });

  it('auto-fills receipts chronologically and splits the last receipt to match due balance', async () => {
    advanceService.getAvailableAdvances.mockResolvedValue(makeMonthlyReceipts(5));
    const onChangeSpy = jest.fn();

    // Invoice total 55000 - direct 29000 = 26000 due -> Jan 10k, Feb 10k, Mar 6k
    await renderPicker(
      <ControlledPicker invoiceTotal={55000} directPaymentsTotal={29000} onChangeSpy={onChangeSpy} />,
    );

    const autoFillBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'Auto-fill',
    );
    expect(autoFillBtn).toBeTruthy();

    await act(async () => {
      autoFillBtn.click();
    });

    const latest = onChangeSpy.mock.calls[onChangeSpy.mock.calls.length - 1][0];
    expect(latest.map((a) => [a.advanceEntryId, a.applyAmount])).toEqual([
      ['adv-1', 10000],
      ['adv-2', 10000],
      ['adv-3', 6000],
    ]);
  });

  it('supports adding another customer and picking their advance for the Bill-To customer', async () => {
    advanceService.getAvailableAdvances.mockImplementation((custId) => {
      if (custId === 'cust-b') return Promise.resolve([]);
      if (custId === 'cust-a') {
        return Promise.resolve([
          {
            id: 'adv-sita-1',
            customerId: 'cust-a',
            transactionDate: '2026-01-10',
            paymentMethod: 'UPI',
            originalAmount: 10000,
            remainingAmount: 10000,
          },
        ]);
      }
      return Promise.resolve([]);
    });
    customersService.searchCustomers.mockResolvedValue({
      data: [{ id: 'cust-a', fullName: 'Sita Devi', contactDetails: [{ primaryPhone: '9876543210' }] }],
    });

    const onChangeSpy = jest.fn();
    await renderPicker(
      <ControlledPicker
        primaryCustomerId="cust-b"
        primaryCustomerName="Priya Sharma"
        onChangeSpy={onChangeSpy}
      />,
    );

    expect(container.textContent).toContain('No available advance receipts');

    const addCustomerBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Use advance from another customer'),
    );
    await act(async () => {
      addCustomerBtn.click();
    });

    const searchInput = container.querySelector('.advance-picker__customer-search-input');
    await act(async () => {
      Simulate.change(searchInput, { target: { value: 'Sita' } });
      await new Promise((r) => setTimeout(r, 350));
      await flushPromises();
    });

    const hit = container.querySelector('.advance-picker__customer-result');
    expect(hit).not.toBeNull();
    expect(hit.textContent).toContain('Sita Devi');

    await act(async () => {
      hit.click();
      await flushPromises();
    });

    expect(container.textContent).toContain('From: Sita Devi');
    const checkbox = container.querySelector('input[type="checkbox"]');
    await act(async () => {
      checkbox.click();
    });

    const latest = onChangeSpy.mock.calls[onChangeSpy.mock.calls.length - 1][0];
    expect(latest[0]).toEqual(
      expect.objectContaining({
        advanceEntryId: 'adv-sita-1',
        sourceCustomerId: 'cust-a',
        sourceCustomerName: 'Sita Devi',
        applyAmount: 10000,
      }),
    );
  });

  it('does not show a future-date warning for same-day ISO timestamps, only strictly future dates', async () => {
    advanceService.getAvailableAdvances.mockResolvedValue([
      {
        id: 'adv-same-day',
        customerId: 'cust-a',
        transactionDate: '2026-11-10T14:30:00.000Z',
        paymentMethod: 'UPI',
        originalAmount: 10000,
        remainingAmount: 10000,
      },
      {
        id: 'adv-future',
        customerId: 'cust-a',
        transactionDate: '2026-11-12T00:00:00.000Z',
        paymentMethod: 'CASH',
        originalAmount: 5000,
        remainingAmount: 5000,
      },
    ]);

    await renderPicker(<ControlledPicker invoiceDate="2026-11-10" />);

    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    await act(async () => {
      checkboxes[0].click();
    });
    expect(container.textContent).not.toContain('date after the invoice date');

    await act(async () => {
      checkboxes[1].click();
    });
    expect(container.textContent).toContain('1 selected receipt(s) have a date after the invoice date');
  });

  it('does not let a receipt overpay an invoice that is already covered', async () => {
    advanceService.getAvailableAdvances.mockResolvedValue(makeMonthlyReceipts(2));
    const onChangeSpy = jest.fn();
    await renderPicker(
      <ControlledPicker invoiceTotal={50000} directPaymentsTotal={50000} onChangeSpy={onChangeSpy} />,
    );

    const boxes = container.querySelectorAll('input[type="checkbox"]');
    expect(boxes.length).toBe(2);
    expect(boxes[0].disabled).toBe(true);
    await act(async () => {
      Simulate.change(boxes[0]);
    });
    expect(onChangeSpy).not.toHaveBeenCalled();
  });

  it('defaults a ticked receipt to what the invoice still needs', async () => {
    advanceService.getAvailableAdvances.mockResolvedValue(makeMonthlyReceipts(1));
    const onChangeSpy = jest.fn();
    await renderPicker(<ControlledPicker invoiceTotal={30000} directPaymentsTotal={26000} onChangeSpy={onChangeSpy} />);

    await act(async () => {
      Simulate.change(container.querySelector('input[type="checkbox"]'));
    });
    expect(onChangeSpy).toHaveBeenLastCalledWith([expect.objectContaining({ advanceEntryId: 'adv-1', applyAmount: 4000 })]);
  });
});
