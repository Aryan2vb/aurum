import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import AdvancePanel from './AdvancePanel';
import * as customersService from '../../../services/customersService';

jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn() }), { virtual: true });
jest.mock('../../../services/customersService');
jest.mock('../../../services/advanceService', () => ({
  getAdvanceBalance: jest.fn().mockResolvedValue({ availableAdvance: 0 }),
  getAdvanceLedger: jest.fn().mockResolvedValue([]),
  receiveAdvance: jest.fn(),
  refundAdvance: jest.fn(),
  transferAdvance: jest.fn(),
}));
jest.mock('../../atoms/SlideOver/SlideOver', () => ({ isOpen, children }) => (isOpen ? <div>{children}</div> : null));
jest.mock('../../molecules/AdvanceLedgerTable/AdvanceLedgerTable', () => () => null);
jest.mock('../../molecules/DatePicker/DatePicker', () => () => null);
jest.mock('../CustomerInspectorPanel/CustomerInspectorPanel', () => ({ isOpen, initialData, onSuccess }) =>
  isOpen ? (
    <div data-testid="create-panel" data-name={initialData?.fullName}>
      <button type="button" onClick={() => onSuccess({ id: 'new-1', fullName: initialData?.fullName, customerCode: 'C-9' })}>
        save
      </button>
    </div>
  ) : null,
);

global.IS_REACT_ACT_ENVIRONMENT = true;
const flush = () => new Promise((r) => setTimeout(r, 0));

describe('AdvancePanel customer search', () => {
  let container;
  let root;
  beforeEach(() => {
    jest.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  const typeAndEnter = async (text) => {
    const input = container.querySelector('#advance-customer');
    await act(async () => {
      Simulate.change(input, { target: { value: text } });
    });
    await act(async () => {
      Simulate.keyDown(input, { key: 'Enter' });
      await flush();
    });
  };

  it('Enter with no match does not open "new customer" by itself', async () => {
    customersService.searchCustomers.mockResolvedValue({ data: [] });
    await act(async () => {
      root.render(<AdvancePanel isOpen onClose={() => {}} />);
      await flush();
    });

    await typeAndEnter('dharmendra');

    expect(container.querySelector('[data-testid="create-panel"]')).toBeNull();
    expect(container.querySelector('#advance-customer')).not.toBeNull();
  });

  it('clicking "Add as new customer" opens the form prefilled, then selects the created customer', async () => {
    customersService.searchCustomers.mockResolvedValue({ data: [] });
    await act(async () => {
      root.render(<AdvancePanel isOpen onClose={() => {}} />);
      await flush();
    });

    await typeAndEnter('dharmendra');
    await act(async () => {
      container.querySelector('.advance-result-create').click();
      await flush();
    });

    const panel = container.querySelector('[data-testid="create-panel"]');
    expect(panel).not.toBeNull();
    expect(panel.getAttribute('data-name')).toBe('dharmendra');

    await act(async () => {
      panel.querySelector('button').click();
      await flush();
    });
    expect(container.querySelector('#advance-customer')).toBeNull();
    expect(container.textContent).toContain('dharmendra');
  });

  it('Enter with matches selects the first one', async () => {
    customersService.searchCustomers.mockResolvedValue({
      data: [{ id: 'c1', fullName: 'Dharmendra Singh', customerCode: 'C-1' }],
    });
    await act(async () => {
      root.render(<AdvancePanel isOpen onClose={() => {}} />);
      await flush();
    });

    await typeAndEnter('dharm');

    expect(container.querySelector('[data-testid="create-panel"]')).toBeNull();
    expect(container.querySelector('#advance-customer')).toBeNull();
    expect(container.textContent).toContain('Dharmendra Singh');
  });

  it('shows the invoice-style "add as new customer" row when nothing matches', async () => {
    jest.useFakeTimers();
    customersService.searchCustomers.mockResolvedValue({ data: [] });
    await act(async () => {
      root.render(<AdvancePanel isOpen onClose={() => {}} />);
    });
    await act(async () => {
      Simulate.change(container.querySelector('#advance-customer'), { target: { value: 'dharmendra' } });
    });
    await act(async () => {
      jest.advanceTimersByTime(350);
    });
    jest.useRealTimers();
    await act(async () => {
      await flush();
    });
    expect(container.textContent).toContain('Add “dharmendra” as new customer');
    expect(container.textContent).toContain('Create a new record and select automatically');
  });
});
