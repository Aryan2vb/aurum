import React, { useState, useEffect, useCallback, useRef } from 'react';
import SlideOver from '../../atoms/SlideOver/SlideOver';
import Button from '../../atoms/Button/Button';
import Input from '../../atoms/Input/Input';
import AmountDisplay from '../../atoms/AmountDisplay/AmountDisplay';
import Toast from '../../atoms/Toast/Toast';
import Avatar from '../../atoms/Avatar/Avatar';
import Icon from '../../atoms/Icon/Icon';
import PaymentAccountSelect from '../../molecules/PaymentAccountSelect/PaymentAccountSelect';
import CustomerInspectorPanel from '../CustomerInspectorPanel/CustomerInspectorPanel';
import {
  getAdvanceBalance,
  receiveAdvance,
  refundAdvance,
  transferAdvance,
} from '../../../services/advanceService';
import { searchCustomers } from '../../../services/customersService';
import { PAYMENT_MODES, withFinancialAccount } from '../../../utils/paymentAccounts';
import './AdvancePanel.css';

const PAYMENT_METHODS = PAYMENT_MODES
  .filter((mode) => !['CREDIT', 'OLD_GOLD'].includes(mode))
  .map((mode) => ({ value: mode, label: mode.replaceAll('_', ' ') }));

const TABS = [
  { id: 'receive', label: 'Receive' },
  { id: 'refund', label: 'Refund' },
  { id: 'transfer', label: 'Transfer' },
];

const emptyForm = () => ({
  amount: '',
  paymentMethod: 'CASH',
  financialAccountId: '',
  reference: '',
  notes: '',
});

const customerLabel = (c) => c?.fullName || c?.phone || c?.customerCode || '';
const customerSub = (c) =>
  [c?.customerCode, c?.contactDetails?.[0]?.primaryPhone || c?.phone].filter(Boolean).join(' · ');
const customerAddress = (c) =>
  [
    c?.locations?.[0]?.village,
    c?.locations?.[0]?.tehsil,
    c?.locations?.[0]?.district,
    c?.locations?.[0]?.state,
  ]
    .filter(Boolean)
    .join(' ');

const fmtAmt = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const CustomerHits = ({ hits, query, searching, onPick, onAddNew }) => {
  const q = query.trim();
  if (searching) return <p className="advance-panel-hint">Searching…</p>;
  if (q.length < 2) return null;
  return (
    <div className="advance-panel-customer-results" role="listbox">
      {hits.map((c) => (
        <button
          type="button"
          key={c.id}
          className="advance-panel-customer-result"
          onClick={() => onPick(c)}
        >
          <Avatar name={customerLabel(c)} size="sm" />
          <div className="advance-panel-customer-result-info">
            <div className="advance-panel-customer-result-name">{customerLabel(c) || 'Customer'}</div>
            <div className="advance-panel-customer-result-sub">
              {customerSub(c) || 'No phone'}
            </div>
          </div>
          {customerAddress(c) ? (
            <span className="advance-panel-customer-result-addr">
              <Icon name="location" size={12} />
              {customerAddress(c)}
            </span>
          ) : null}
        </button>
      ))}
      {onAddNew && (
        <button type="button" className="advance-panel-add-customer" onClick={onAddNew}>
          <div className="advance-panel-add-icon">
            <Icon name="add" size={14} />
          </div>
          <div className="advance-panel-customer-result-info">
            <strong>Add "{q}" as new customer</strong>
            <span>Create a new record and select automatically</span>
          </div>
        </button>
      )}
    </div>
  );
};

const AdvancePanel = ({
  isOpen,
  onClose,
  customerId,
  customerName,
  onSuccess,
  initialAmount,
  lockAmount = false,
  onReceive,
}) => {
  const [activeTab, setActiveTab] = useState('receive');
  const [balance, setBalance] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [pickedCustomer, setPickedCustomer] = useState(null);
  const [payerSearch, setPayerSearch] = useState('');
  const [payerHits, setPayerHits] = useState([]);
  const [payerSearching, setPayerSearching] = useState(false);
  const payerRef = useRef(null);

  const [form, setForm] = useState(emptyForm());
  const [transferForm, setTransferForm] = useState({ amount: '', toCustomerId: '', notes: '' });
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [searching, setSearching] = useState(false);
  const [createFor, setCreateFor] = useState(null);

  const activeCustomerId = customerId || pickedCustomer?.id || '';
  const activeCustomerName =
    customerName || customerLabel(pickedCustomer) || (customerId ? 'Customer' : '');
  const needsCustomerPick = !customerId;
  const askingForCustomer = needsCustomerPick && !pickedCustomer;

  const loadBalance = useCallback(async () => {
    if (!activeCustomerId) {
      setBalance(null);
      return;
    }
    try {
      setBalanceLoading(true);
      const data = await getAdvanceBalance(activeCustomerId);
      setBalance(parseFloat(data.availableAdvance || 0));
    } catch {
      setBalance(0);
    } finally {
      setBalanceLoading(false);
    }
  }, [activeCustomerId]);

  useEffect(() => {
    if (!isOpen) {
      setPickedCustomer(null);
      setPayerSearch('');
      setPayerHits([]);
      setCreateFor(null);
      return;
    }
    setActiveTab('receive');
    setTransferForm({ amount: '', toCustomerId: '', notes: '' });
    setSelectedRecipient(null);
    setCustomerSearch('');
    setCustomerResults([]);
    setPickedCustomer(null);
    setPayerSearch('');
    setPayerHits([]);
    setBalance(null);
    setCreateFor(null);
    setForm({
      ...emptyForm(),
      amount: initialAmount != null && Number(initialAmount) > 0 ? String(initialAmount) : '',
    });
  }, [isOpen, initialAmount]);

  useEffect(() => {
    if (isOpen) loadBalance();
  }, [isOpen, loadBalance]);

  useEffect(() => {
    if (!isOpen || !askingForCustomer) return undefined;
    const t = setTimeout(() => payerRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [isOpen, askingForCustomer]);

  useEffect(() => {
    if (payerSearch.length < 2) { setPayerHits([]); return undefined; }
    const t = setTimeout(async () => {
      try {
        setPayerSearching(true);
        const data = await searchCustomers({ query: payerSearch });
        setPayerHits(data.data || data || []);
      } catch {
        setPayerHits([]);
      } finally {
        setPayerSearching(false);
      }
    }, 280);
    return () => clearTimeout(t);
  }, [payerSearch]);

  useEffect(() => {
    if (customerSearch.length < 2) { setCustomerResults([]); return undefined; }
    const t = setTimeout(async () => {
      try {
        setSearching(true);
        const data = await searchCustomers({ query: customerSearch });
        setCustomerResults((data.data || data || []).filter((c) => c.id !== activeCustomerId));
      } catch {
        setCustomerResults([]);
      } finally {
        setSearching(false);
      }
    }, 280);
    return () => clearTimeout(t);
  }, [customerSearch, activeCustomerId]);

  const finishOk = () => {
    onSuccess?.();
    onClose();
  };

  const handleFieldChange = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleReceive = async (e) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) { setToast({ type: 'error', message: 'Enter a valid amount' }); return; }
    if (!activeCustomerId) { setToast({ type: 'error', message: 'Pick a customer' }); return; }
    try {
      setSaving(true);
      const payload = withFinancialAccount({
        amount,
        paymentMethod: form.paymentMethod,
        financialAccountId: form.financialAccountId,
        ...(form.reference && { reference: form.reference }),
        ...(form.notes && { notes: form.notes }),
      });
      if (onReceive) {
        await onReceive({ customerId: activeCustomerId, ...payload });
      } else {
        await receiveAdvance(activeCustomerId, payload);
      }
      finishOk();
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to record advance' });
    } finally {
      setSaving(false);
    }
  };

  const handleRefund = async (e) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) { setToast({ type: 'error', message: 'Enter a valid amount' }); return; }
    if (balance !== null && amount > balance) {
      setToast({ type: 'error', message: `Refund exceeds available balance of ${fmtAmt(balance)}` });
      return;
    }
    try {
      setSaving(true);
      await refundAdvance(activeCustomerId, withFinancialAccount({
        amount,
        paymentMethod: form.paymentMethod,
        financialAccountId: form.financialAccountId,
        ...(form.reference && { reference: form.reference }),
        ...(form.notes && { notes: form.notes }),
      }));
      finishOk();
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to process refund' });
    } finally {
      setSaving(false);
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    const amount = parseFloat(transferForm.amount);
    if (!amount || amount <= 0) { setToast({ type: 'error', message: 'Enter a valid amount' }); return; }
    if (!selectedRecipient) { setToast({ type: 'error', message: 'Select a recipient customer' }); return; }
    if (balance !== null && amount > balance) {
      setToast({ type: 'error', message: `Transfer exceeds available balance of ${fmtAmt(balance)}` });
      return;
    }
    try {
      setSaving(true);
      await transferAdvance(activeCustomerId, {
        toCustomerId: selectedRecipient.id,
        amount,
        ...(transferForm.notes && { notes: transferForm.notes }),
      });
      finishOk();
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to transfer advance' });
    } finally {
      setSaving(false);
    }
  };

  const needsReference = ['UPI', 'BANK_TRANSFER', 'CHEQUE', 'NEFT', 'RTGS', 'IMPS'].includes(form.paymentMethod);
  const recordOnly = typeof onReceive === 'function';
  const activeAddress = customerAddress(pickedCustomer);
  const panelTitle = askingForCustomer
    ? 'New Advance'
    : activeCustomerName || 'Advance';

  const methodPicker = (
    <div className="advance-panel-methods" role="group" aria-label="Payment method">
      {PAYMENT_METHODS.map((m) => (
        <button
          key={m.value}
          type="button"
          className={`advance-panel-method${form.paymentMethod === m.value ? ' is-on' : ''}`}
          onClick={() => handleFieldChange('paymentMethod', m.value)}
        >
          {m.label}
        </button>
      ))}
    </div>
  );

  return (
    <>
    <SlideOver isOpen={isOpen} onClose={onClose} title={panelTitle} width={480}>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      {askingForCustomer ? (
        <div className="advance-panel advance-panel--pick">
          <h3 className="advance-panel-ask">Customer name</h3>
          <p className="advance-panel-form-hint">Who is this advance from? Search by name or phone.</p>
          <Input
            type="search"
            autoComplete="off"
            placeholder="Type customer name…"
            value={payerSearch}
            onChange={(e) => setPayerSearch(e.target.value)}
            inputRef={payerRef}
            icon={<Icon name="search" size={16} />}
          />
          <CustomerHits
            hits={payerHits}
            query={payerSearch}
            searching={payerSearching}
            onPick={(c) => { setPickedCustomer(c); setPayerSearch(''); setPayerHits([]); }}
            onAddNew={() => setCreateFor('payer')}
          />
          {payerSearch.trim().length < 2 && (
            <p className="advance-panel-pick-idle">Start typing — at least 2 characters.</p>
          )}
        </div>
      ) : (
        <div className="advance-panel">
          <div className="advance-panel-hero">
            <Avatar name={activeCustomerName} size="md" />
            <div className="advance-panel-hero-copy">
              <strong>{activeCustomerName}</strong>
              {customerSub(pickedCustomer) ? (
                <span className="advance-panel-hero-addr">{customerSub(pickedCustomer)}</span>
              ) : null}
              {activeAddress ? <span className="advance-panel-hero-addr">{activeAddress}</span> : null}
              {needsCustomerPick && (
                <button
                  type="button"
                  className="advance-panel-change"
                  onClick={() => { setPickedCustomer(null); setBalance(null); setActiveTab('receive'); }}
                >
                  Change customer
                </button>
              )}
            </div>
            <div className="advance-panel-hero-bal">
              <span>Available</span>
              {balanceLoading ? (
                <em>…</em>
              ) : (
                <AmountDisplay value={balance ?? 0} size="lg" emphasis variant={balance > 0 ? 'positive' : 'neutral'} />
              )}
            </div>
          </div>

          {!recordOnly && (
          <div className="advance-panel-tabs" role="tablist">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`advance-panel-tab${activeTab === tab.id ? ' is-on' : ''}`}
                onClick={() => { setActiveTab(tab.id); setForm(emptyForm()); }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          )}

          {activeTab === 'receive' && (
            <form className="advance-panel-form" onSubmit={handleReceive}>
              <label className="advance-panel-field">
                <span className="advance-panel-label">Amount</span>
                <span className="advance-panel-rupee">
                  <span>₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0"
                    value={form.amount}
                    onChange={(e) => handleFieldChange('amount', e.target.value)}
                    readOnly={lockAmount}
                    required
                  />
                </span>
              </label>
              {recordOnly ? (
                <p className="advance-panel-form-hint">This bank credit will be booked as a customer advance.</p>
              ) : (
                <>
              <div className="advance-panel-field">
                <span className="advance-panel-label">Paid by</span>
                {methodPicker}
              </div>
              <PaymentAccountSelect
                mode={form.paymentMethod}
                value={form.financialAccountId}
                onChange={(value) => handleFieldChange('financialAccountId', value)}
              />
              {needsReference && (
                <label className="advance-panel-field">
                  <span className="advance-panel-label">Reference / UTR</span>
                  <Input
                    type="text"
                    placeholder="UTR / cheque number"
                    value={form.reference}
                    onChange={(e) => handleFieldChange('reference', e.target.value)}
                  />
                </label>
              )}
              <label className="advance-panel-field">
                <span className="advance-panel-label">Notes</span>
                <textarea
                  className="advance-panel-textarea"
                  rows={2}
                  placeholder="Optional"
                  value={form.notes}
                  onChange={(e) => handleFieldChange('notes', e.target.value)}
                />
              </label>
                </>
              )}
              <div className="advance-panel-actions">
                <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Record advance'}
                </Button>
              </div>
            </form>
          )}

          {activeTab === 'refund' && !recordOnly && (
            <form className="advance-panel-form" onSubmit={handleRefund}>
              {balance !== null && balance <= 0 && (
                <div className="advance-panel-warning">No advance balance to refund.</div>
              )}
              <label className="advance-panel-field">
                <span className="advance-panel-label">Refund amount</span>
                <span className="advance-panel-rupee">
                  <span>₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={balance ?? undefined}
                    placeholder="0"
                    value={form.amount}
                    onChange={(e) => handleFieldChange('amount', e.target.value)}
                    required
                  />
                </span>
              </label>
              <div className="advance-panel-field">
                <span className="advance-panel-label">Return via</span>
                {methodPicker}
              </div>
              <PaymentAccountSelect
                mode={form.paymentMethod}
                value={form.financialAccountId}
                onChange={(value) => handleFieldChange('financialAccountId', value)}
              />
              {needsReference && (
                <label className="advance-panel-field">
                  <span className="advance-panel-label">Reference / UTR</span>
                  <Input
                    type="text"
                    placeholder="UTR / cheque number"
                    value={form.reference}
                    onChange={(e) => handleFieldChange('reference', e.target.value)}
                  />
                </label>
              )}
              <label className="advance-panel-field">
                <span className="advance-panel-label">Notes</span>
                <textarea
                  className="advance-panel-textarea"
                  rows={2}
                  placeholder="Reason for refund"
                  value={form.notes}
                  onChange={(e) => handleFieldChange('notes', e.target.value)}
                />
              </label>
              <div className="advance-panel-actions">
                <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
                <Button type="submit" variant="danger" disabled={saving || balance <= 0}>
                  {saving ? 'Processing…' : 'Refund'}
                </Button>
              </div>
            </form>
          )}

          {activeTab === 'transfer' && !recordOnly && (
            <form className="advance-panel-form" onSubmit={handleTransfer}>
              {balance !== null && balance <= 0 && (
                <div className="advance-panel-warning">No advance balance to transfer.</div>
              )}
              <label className="advance-panel-field">
                <span className="advance-panel-label">Transfer amount</span>
                <span className="advance-panel-rupee">
                  <span>₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={balance ?? undefined}
                    placeholder="0"
                    value={transferForm.amount}
                    onChange={(e) => setTransferForm((prev) => ({ ...prev, amount: e.target.value }))}
                    required
                  />
                </span>
              </label>
              <div className="advance-panel-field">
                <span className="advance-panel-label">Transfer to</span>
                {selectedRecipient ? (
                  <div className="advance-panel-recipient-selected">
                    <Avatar name={customerLabel(selectedRecipient)} size="sm" />
                    <span className="advance-panel-recipient-name">{customerLabel(selectedRecipient)}</span>
                    {customerSub(selectedRecipient) ? (
                      <span className="advance-panel-recipient-code">{customerSub(selectedRecipient)}</span>
                    ) : null}
                    <button
                      type="button"
                      className="advance-panel-recipient-clear"
                      onClick={() => { setSelectedRecipient(null); setCustomerSearch(''); }}
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <>
                    <Input
                      type="search"
                      autoComplete="off"
                      placeholder="Recipient name or phone…"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      icon={<Icon name="search" size={16} />}
                    />
                    <CustomerHits
                      hits={customerResults}
                      query={customerSearch}
                      searching={searching}
                      onPick={(c) => { setSelectedRecipient(c); setCustomerSearch(''); setCustomerResults([]); }}
                      onAddNew={() => setCreateFor('recipient')}
                    />
                  </>
                )}
              </div>
              <label className="advance-panel-field">
                <span className="advance-panel-label">Notes</span>
                <textarea
                  className="advance-panel-textarea"
                  rows={2}
                  placeholder="Reason for transfer"
                  value={transferForm.notes}
                  onChange={(e) => setTransferForm((prev) => ({ ...prev, notes: e.target.value }))}
                />
              </label>
              <div className="advance-panel-actions">
                <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={saving || balance <= 0 || !selectedRecipient}>
                  {saving ? 'Transferring…' : 'Transfer'}
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </SlideOver>
    <CustomerInspectorPanel
      isOpen={Boolean(createFor)}
      onClose={() => setCreateFor(null)}
      mode="create"
      initialData={{ fullName: createFor === 'recipient' ? customerSearch : payerSearch }}
      onSuccess={(newCustomer) => {
        if (newCustomer) {
          if (createFor === 'recipient') {
            setSelectedRecipient(newCustomer);
            setCustomerSearch('');
            setCustomerResults([]);
          } else {
            setPickedCustomer(newCustomer);
            setPayerSearch('');
            setPayerHits([]);
          }
        }
        setCreateFor(null);
      }}
    />
    </>
  );
};

export default AdvancePanel;
