import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import SlideOver from '../../atoms/SlideOver/SlideOver';
import Input from '../../atoms/Input/Input';
import AmountDisplay from '../../atoms/AmountDisplay/AmountDisplay';
import Toast from '../../atoms/Toast/Toast';
import Avatar from '../../atoms/Avatar/Avatar';
import Icon from '../../atoms/Icon/Icon';
import {
  getAdvanceBalance,
  receiveAdvance,
  refundAdvance,
  transferAdvance,
  getAdvanceLedger,
} from '../../../services/advanceService';
import AdvanceLedgerTable from '../../molecules/AdvanceLedgerTable/AdvanceLedgerTable';
import { getCustomerById, searchCustomers } from '../../../services/customersService';
import CustomerInspectorPanel from '../CustomerInspectorPanel/CustomerInspectorPanel';
import DatePicker from '../../molecules/DatePicker/DatePicker';
import './AdvancePanel.css';

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'NEFT', label: 'NEFT' },
  { value: 'RTGS', label: 'RTGS' },
  { value: 'IMPS', label: 'IMPS' },
  { value: 'OTHER', label: 'Other' },
];

const TABS = [
  { id: 'receive', label: 'Received' },
  { id: 'transfer', label: 'Transfer' },
  { id: 'refund', label: 'Refund' },
];

const QUICK_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'BANK_TRANSFER', label: 'Bank' },
  { value: 'CHEQUE', label: 'Cheque' },
];

function MethodPicker({ value, onChange }) {
  const quickValues = QUICK_METHODS.map((method) => method.value);
  const [moreOpen, setMoreOpen] = useState(!quickValues.includes(value));
  const extras = PAYMENT_METHODS.filter((method) => !quickValues.includes(method.value));
  const showExtras = moreOpen || !quickValues.includes(value);

  return (
    <div className="advance-methods" role="group" aria-label="Payment method">
      {QUICK_METHODS.map((method) => (
        <button
          key={method.value}
          type="button"
          className={`advance-method${value === method.value ? ' is-active' : ''}`}
          aria-pressed={value === method.value}
          onClick={() => onChange(method.value)}
        >
          {method.label}
        </button>
      ))}
      {showExtras ? extras.map((method) => (
        <button
          key={method.value}
          type="button"
          className={`advance-method${value === method.value ? ' is-active' : ''}`}
          aria-pressed={value === method.value}
          onClick={() => onChange(method.value)}
        >
          {method.label}
        </button>
      )) : (
        <button type="button" className="advance-method advance-method-more" onClick={() => setMoreOpen(true)}>
          More
        </button>
      )}
    </div>
  );
}

const todayInputDate = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
};

const emptyForm = () => ({
  amount: '',
  paymentMethod: 'CASH',
  reference: '',
  notes: '',
  receivedAt: todayInputDate(),
});

// Full Indian number formatting — no K / L / Cr abbreviations
const fmtAmt = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const formatCustomerAddress = (customer) => {
  const location = customer?.locations?.find((item) => !item.deletedAt) || customer?.locations?.[0];
  if (!location) return '';
  return [location.village, location.tehsil, location.district, location.state, location.pincode]
    .filter(Boolean)
    .join(', ');
};

const AdvancePanel = ({ isOpen, onClose, customerId, customerName, onSuccess }) => {
  const navigate = useNavigate();
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [receiveCustomerSearch, setReceiveCustomerSearch] = useState('');
  const [receiveCustomerResults, setReceiveCustomerResults] = useState([]);
  const [receiveSearching, setReceiveSearching] = useState(false);
  const [isCustomerCreateOpen, setIsCustomerCreateOpen] = useState(false);
  const [sourceCustomer, setSourceCustomer] = useState(null);
  const activeCustomerId = customerId || selectedCustomer?.id;
  const activeCustomer = customerId ? sourceCustomer : selectedCustomer;
  const activeCustomerName = customerName || activeCustomer?.fullName;
  const activeCustomerAddress = formatCustomerAddress(activeCustomer);
  const activeCustomerPhone = activeCustomer?.contactDetails?.[0]?.primaryPhone;
  const [activeTab, setActiveTab] = useState('receive');
  const [balance, setBalance] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [ledger, setLedger] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const [form, setForm] = useState(emptyForm());
  const [transferForm, setTransferForm] = useState({ amount: '', toCustomerId: '', notes: '', transactionDate: todayInputDate() });
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [searching, setSearching] = useState(false);

  const loadBalance = useCallback(async () => {
    if (!activeCustomerId) { setBalance(null); return; }
    try {
      setBalanceLoading(true);
      const data = await getAdvanceBalance(activeCustomerId);
      setBalance(parseFloat(data?.availableAdvance ?? data?.data?.availableAdvance ?? 0));
    } catch {
      setBalance(0);
    } finally {
      setBalanceLoading(false);
    }
  }, [activeCustomerId]);

  const loadLedger = useCallback(async () => {
    if (!activeCustomerId) { setLedger([]); return; }
    try {
      setLedgerLoading(true);
      const entries = await getAdvanceLedger(activeCustomerId);
      setLedger(Array.isArray(entries) ? entries : []);
    } catch { setLedger([]); }
    finally { setLedgerLoading(false); }
  }, [activeCustomerId]);

  useEffect(() => {
    if (isOpen) {
      setActiveTab('receive');
      setForm(emptyForm());
      setSelectedCustomer(null);
      setReceiveCustomerSearch('');
      setTransferForm({ amount: '', toCustomerId: '', notes: '', transactionDate: todayInputDate() });
      setSelectedRecipient(null);
      setCustomerSearch('');
      setCustomerResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) { loadBalance(); loadLedger(); }
  }, [isOpen, loadBalance, loadLedger]);

  useEffect(() => {
    if (!isOpen || !customerId) {
      setSourceCustomer(null);
      return undefined;
    }
    let cancelled = false;
    getCustomerById(customerId)
      .then((customer) => { if (!cancelled) setSourceCustomer(customer); })
      .catch(() => { if (!cancelled) setSourceCustomer(null); });
    return () => { cancelled = true; };
  }, [isOpen, customerId]);

  useEffect(() => {
    if (customerId || receiveCustomerSearch.trim().length < 2) { setReceiveCustomerResults([]); return; }
    const t = setTimeout(async () => {
      try {
        setReceiveSearching(true);
        const data = await searchCustomers({ query: receiveCustomerSearch });
        setReceiveCustomerResults(data.data || data || []);
      } catch { setReceiveCustomerResults([]); }
      finally { setReceiveSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [customerId, receiveCustomerSearch]);

  const selectReceiveCustomer = (c) => {
    setSelectedCustomer(c);
    setReceiveCustomerSearch('');
    setReceiveCustomerResults([]);
  };

  // Same as Create Invoice: Enter picks the first match, or opens "new customer" prefilled
  const handleReceiveSearchKeyDown = async (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault(); // don't submit the advance form
    const query = receiveCustomerSearch.trim();
    if (query.length < 2) return;
    let results = receiveCustomerResults;
    if (!results.length) {
      try {
        setReceiveSearching(true);
        const data = await searchCustomers({ query });
        results = data.data || data || [];
        setReceiveCustomerResults(results);
      } catch {
        results = [];
      } finally {
        setReceiveSearching(false);
      }
    }
    if (results.length > 0) selectReceiveCustomer(results[0]);
    else setIsCustomerCreateOpen(true);
  };

  // Debounced customer search for transfer tab
  useEffect(() => {
    if (customerSearch.length < 2) { setCustomerResults([]); return; }
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
    }, 500);
    return () => clearTimeout(t);
  }, [customerSearch, activeCustomerId]);

  const handleFieldChange = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleTransferFieldChange = (field, value) =>
    setTransferForm((prev) => ({ ...prev, [field]: value }));

  // ── Receive ──────────────────────────────────────────────────────────────
  const handleReceive = async (e) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) { setToast({ type: 'error', message: 'Enter a valid amount' }); return; }
    try {
      setSaving(true);
      if (!activeCustomerId) { setToast({ type: 'error', message: 'Select a customer first' }); return; }
      await receiveAdvance(activeCustomerId, {
        amount,
        paymentMethod: form.paymentMethod,
        receivedAt: form.receivedAt,
        ...(form.reference && { reference: form.reference }),
        ...(form.notes && { notes: form.notes }),
      });
      setToast({ type: 'success', message: `Advance of ${fmtAmt(amount)} recorded for ${activeCustomerName}` });
      setForm(emptyForm());
      await loadBalance();
      await loadLedger();
      setTimeout(() => { onSuccess?.(); }, 1200);
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to record advance' });
    } finally {
      setSaving(false);
    }
  };

  // ── Refund ───────────────────────────────────────────────────────────────
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
      await refundAdvance(activeCustomerId, {
        amount,
        paymentMethod: form.paymentMethod,
        transactionDate: form.receivedAt,
        ...(form.reference && { reference: form.reference }),
        ...(form.notes && { notes: form.notes }),
      });
      setToast({ type: 'success', message: `Refund of ${fmtAmt(amount)} processed` });
      setForm(emptyForm());
      await loadBalance();
      await loadLedger();
      setTimeout(() => { onSuccess?.(); }, 1200);
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to process refund' });
    } finally {
      setSaving(false);
    }
  };

  // ── Transfer ─────────────────────────────────────────────────────────────
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
        transactionDate: transferForm.transactionDate,
        ...(transferForm.notes && { notes: transferForm.notes }),
      });
      setToast({ type: 'success', message: `${fmtAmt(amount)} transferred to ${selectedRecipient.fullName}` });
      setTransferForm({ amount: '', toCustomerId: '', notes: '', transactionDate: todayInputDate() });
      setSelectedRecipient(null);
      setCustomerSearch('');
      await loadBalance();
      await loadLedger();
      setTimeout(() => { onSuccess?.(); }, 1200);
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to transfer advance' });
    } finally {
      setSaving(false);
    }
  };

  const needsReference = ['UPI', 'BANK_TRANSFER', 'CHEQUE', 'NEFT', 'RTGS', 'IMPS'].includes(form.paymentMethod);
  const typedAmount = activeTab === 'transfer' ? transferForm.amount : form.amount;
  const amountCaption = typedAmount ? fmtAmt(typedAmount) : '';
  const noBalance = balance !== null && balance <= 0;
  const submitLabel = saving
    ? (activeTab === 'receive' ? 'Saving…' : activeTab === 'refund' ? 'Refunding…' : 'Transferring…')
    : activeTab === 'receive'
      ? (amountCaption ? `Record ${amountCaption}` : 'Record advance')
      : activeTab === 'refund'
        ? (amountCaption ? `Refund ${amountCaption}` : 'Refund')
        : (amountCaption ? `Transfer ${amountCaption}` : 'Transfer');
  const submitDisabled = saving
    || (activeTab === 'receive' && !activeCustomerId)
    || (activeTab === 'refund' && noBalance)
    || (activeTab === 'transfer' && (noBalance || !selectedRecipient));

  return (
    <SlideOver isOpen={isOpen} onClose={onClose} title={activeCustomerName || 'Record advance'} width={460} className="advance-sheet">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      <div className="advance-sheet-root">
        <header className="advance-sheet-header">
          <div className="advance-sheet-identity">
            <p className="advance-sheet-kicker">Customer advance</p>
            {activeCustomerId ? (
              <button
                type="button"
                id="advance-sheet-title"
                className="advance-sheet-customer-link"
                onClick={() => navigate(`/customers/${activeCustomerId}`)}
              >
                {activeCustomerName}
              </button>
            ) : (
              <h2 id="advance-sheet-title">Record advance</h2>
            )}
            <p className="advance-sheet-sub">
              {activeCustomerId
                ? [activeCustomer?.customerCode, activeCustomerPhone].filter(Boolean).join(' · ') || 'Customer selected'
                : 'Money received before an invoice is raised'}
            </p>
            {activeCustomerAddress && <p className="advance-sheet-address">{activeCustomerAddress}</p>}
          </div>
          <button type="button" className="advance-sheet-close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        {activeCustomerId && (
          <div className="advance-sheet-balance">
            <span>Available</span>
            {balanceLoading ? (
              <em>Loading…</em>
            ) : (
              <AmountDisplay value={balance ?? 0} size="lg" emphasis variant="plain" />
            )}
            {!customerId && selectedCustomer && (
              <button type="button" className="advance-sheet-change" onClick={() => setSelectedCustomer(null)}>
                Change
              </button>
            )}
          </div>
        )}

        <div className="advance-sheet-modes" role="tablist" aria-label="Advance action">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              disabled={!activeCustomerId && tab.id !== 'receive'}
              className={`advance-sheet-mode${activeTab === tab.id ? ' is-active' : ''}`}
              onClick={() => { setActiveTab(tab.id); setForm(emptyForm()); }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="advance-sheet-scroll">
          {activeTab === 'receive' && (
            <form id="advance-action-form" className="advance-sheet-form" onSubmit={handleReceive}>
              {!customerId && !selectedCustomer && (
                <div className="advance-field">
                  <label className="advance-label" htmlFor="advance-customer">Customer <span className="required">*</span></label>
                  <Input id="advance-customer" type="text" placeholder="Name or phone" value={receiveCustomerSearch} onChange={e => setReceiveCustomerSearch(e.target.value)} onKeyDown={handleReceiveSearchKeyDown} autoComplete="off" autoFocus />
                  {receiveSearching && <span className="advance-hint">Searching…</span>}
                  {(receiveCustomerResults.length > 0 || (receiveCustomerSearch.trim().length >= 2 && !receiveSearching)) && (
                    <div className="advance-results">
                      {receiveCustomerResults.map(c => (
                        <button type="button" key={c.id} className="advance-result" onClick={() => selectReceiveCustomer(c)}>
                          <Avatar name={c.fullName} size="sm" />
                          <span className="advance-result-copy">
                            <span className="advance-result-name">{c.fullName}</span>
                            <span className="advance-result-meta">{c.customerCode}</span>
                            {formatCustomerAddress(c) && <span className="advance-result-address">{formatCustomerAddress(c)}</span>}
                          </span>
                        </button>
                      ))}
                      <button type="button" className="advance-result advance-result-create" onClick={() => setIsCustomerCreateOpen(true)}>
                        <span className="advance-result-add-icon" aria-hidden="true"><Icon name="add" size={14} color="currentColor" /></span>
                        <span className="advance-result-copy">
                          <span className="advance-result-name">Add “{receiveCustomerSearch.trim()}” as new customer</span>
                          <span className="advance-result-meta">Create a new record and select automatically</span>
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}
              {!customerId && selectedCustomer && (
                <div className="advance-selected-customer">
                  <Avatar name={selectedCustomer.fullName} size="sm" />
                  <div className="advance-selected-customer-copy">
                    <strong>{selectedCustomer.fullName}</strong>
                    <span>{[selectedCustomer.customerCode, activeCustomerPhone].filter(Boolean).join(' · ')}</span>
                    {activeCustomerAddress && <small>{activeCustomerAddress}</small>}
                  </div>
                  <div className="advance-selected-customer-balance">
                    <span>Available</span>
                    {balanceLoading ? <em>Loading…</em> : <AmountDisplay value={balance ?? 0} size="sm" emphasis variant="plain" />}
                  </div>
                  <button type="button" className="advance-sheet-change" onClick={() => setSelectedCustomer(null)}>Change</button>
                </div>
              )}
              <div className="advance-field-row">
                <div className="advance-field">
                  <label className="advance-label">Date received <span className="required">*</span></label>
                  <DatePicker value={form.receivedAt} max={todayInputDate()} onChange={value => handleFieldChange('receivedAt', value)} placeholder="Select date" />
                </div>
                <div className="advance-field">
                  <label className="advance-label" htmlFor="advance-amount">Amount <span className="required">*</span></label>
                  <div className="advance-amount">
                    <span>₹</span>
                    <input id="advance-amount" type="number" step="0.01" min="0.01" placeholder="0" value={form.amount} onChange={(e) => handleFieldChange('amount', e.target.value)} required />
                  </div>
                </div>
              </div>
              <div className="advance-field">
                <span className="advance-label">How it was paid <span className="required">*</span></span>
                <MethodPicker value={form.paymentMethod} onChange={(value) => handleFieldChange('paymentMethod', value)} />
              </div>
              {needsReference && (
                <div className="advance-field">
                  <label className="advance-label" htmlFor="advance-reference">Reference</label>
                  <Input id="advance-reference" type="text" placeholder="UTR or cheque number" value={form.reference} onChange={(e) => handleFieldChange('reference', e.target.value)} />
                </div>
              )}
              <div className="advance-field">
                <label className="advance-label" htmlFor="advance-notes">Note</label>
                <textarea id="advance-notes" className="advance-textarea" rows={2} placeholder="Optional" value={form.notes} onChange={(e) => handleFieldChange('notes', e.target.value)} />
              </div>
            </form>
          )}

          {activeTab === 'refund' && (
            <form id="advance-action-form" className="advance-sheet-form" onSubmit={handleRefund}>
              {noBalance && <div className="advance-warning">Nothing available to refund.</div>}
              <div className="advance-field-row">
                <div className="advance-field">
                  <label className="advance-label">Date refunded <span className="required">*</span></label>
                  <DatePicker value={form.receivedAt} max={todayInputDate()} onChange={(value) => handleFieldChange('receivedAt', value)} placeholder="Select date" />
                </div>
                <div className="advance-field">
                  <label className="advance-label" htmlFor="advance-refund-amount">Amount <span className="required">*</span></label>
                  <div className="advance-amount">
                    <span>₹</span>
                    <input id="advance-refund-amount" type="number" step="0.01" min="0.01" max={balance ?? undefined} placeholder="0" value={form.amount} onChange={(e) => handleFieldChange('amount', e.target.value)} required />
                  </div>
                </div>
              </div>
              <div className="advance-field">
                <span className="advance-label">Return by <span className="required">*</span></span>
                <MethodPicker value={form.paymentMethod} onChange={(value) => handleFieldChange('paymentMethod', value)} />
              </div>
              {needsReference && (
                <div className="advance-field">
                  <label className="advance-label" htmlFor="advance-refund-reference">Reference</label>
                  <Input id="advance-refund-reference" type="text" placeholder="UTR or cheque number" value={form.reference} onChange={(e) => handleFieldChange('reference', e.target.value)} />
                </div>
              )}
              <div className="advance-field">
                <label className="advance-label" htmlFor="advance-refund-notes">Reason</label>
                <textarea id="advance-refund-notes" className="advance-textarea" rows={2} placeholder="Why this is going back" value={form.notes} onChange={(e) => handleFieldChange('notes', e.target.value)} />
              </div>
            </form>
          )}

          {activeTab === 'transfer' && (
            <form id="advance-action-form" className="advance-sheet-form" onSubmit={handleTransfer}>
              {noBalance && <div className="advance-warning">Nothing available to transfer.</div>}
              <div className="advance-field-row">
                <div className="advance-field">
                  <label className="advance-label">Date transferred <span className="required">*</span></label>
                  <DatePicker value={transferForm.transactionDate} max={todayInputDate()} onChange={(value) => handleTransferFieldChange('transactionDate', value)} placeholder="Select date" />
                </div>
                <div className="advance-field">
                  <label className="advance-label" htmlFor="advance-transfer-amount">Amount <span className="required">*</span></label>
                  <div className="advance-amount">
                    <span>₹</span>
                    <input id="advance-transfer-amount" type="number" step="0.01" min="0.01" max={balance ?? undefined} placeholder="0" value={transferForm.amount} onChange={(e) => handleTransferFieldChange('amount', e.target.value)} required />
                  </div>
                </div>
              </div>
              <div className="advance-field">
                <label className="advance-label" htmlFor="advance-recipient">Transfer to <span className="required">*</span></label>
                {selectedRecipient ? (
                  <div className="advance-recipient">
                    <Avatar name={selectedRecipient.fullName} size="sm" />
                    <span className="advance-result-copy">
                      <span className="advance-result-name">{selectedRecipient.fullName}</span>
                      <span className="advance-result-meta">{selectedRecipient.customerCode}</span>
                      {formatCustomerAddress(selectedRecipient) && <span className="advance-result-address">{formatCustomerAddress(selectedRecipient)}</span>}
                    </span>
                    <button type="button" className="advance-sheet-change" onClick={() => { setSelectedRecipient(null); setCustomerSearch(''); }}>Change</button>
                  </div>
                ) : (
                  <>
                    <Input id="advance-recipient" type="text" placeholder="Name or phone" value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} />
                    {searching && <span className="advance-hint">Searching…</span>}
                    {customerResults.length > 0 && (
                      <div className="advance-results">
                        {customerResults.map((c) => (
                          <button type="button" key={c.id} className="advance-result" onClick={() => { setSelectedRecipient(c); setCustomerSearch(''); setCustomerResults([]); }}>
                            <Avatar name={c.fullName} size="sm" />
                            <span className="advance-result-copy">
                              <span className="advance-result-name">{c.fullName}</span>
                              <span className="advance-result-meta">{c.customerCode}{c.contactDetails?.[0]?.primaryPhone ? ` · ${c.contactDetails[0].primaryPhone}` : ''}</span>
                              {formatCustomerAddress(c) && <span className="advance-result-address">{formatCustomerAddress(c)}</span>}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
              {activeCustomerId && (
                <div className="advance-transfer-summary" aria-label="Advance transfer summary">
                  <div className="advance-transfer-party">
                    <span>From</span>
                    <strong>{activeCustomerName || 'Customer 1'}</strong>
                    {activeCustomerAddress && <small>{activeCustomerAddress}</small>}
                    <b>{transferForm.amount ? fmtAmt(transferForm.amount) : '₹0'}</b>
                  </div>
                  <span className="advance-transfer-arrow" aria-hidden="true">→</span>
                  <div className="advance-transfer-party">
                    <span>To</span>
                    <strong>{selectedRecipient?.fullName || 'Select customer'}</strong>
                    {formatCustomerAddress(selectedRecipient) && <small>{formatCustomerAddress(selectedRecipient)}</small>}
                    <b>{transferForm.amount ? fmtAmt(transferForm.amount) : '₹0'}</b>
                  </div>
                </div>
              )}
              <div className="advance-field">
                <label className="advance-label" htmlFor="advance-transfer-notes">Reason</label>
                <textarea id="advance-transfer-notes" className="advance-textarea" rows={2} placeholder="Why this balance is moving" value={transferForm.notes} onChange={(e) => handleTransferFieldChange('notes', e.target.value)} />
              </div>
            </form>
          )}

          {activeCustomerId && (
            <section className="advance-history">
              <h3>History</h3>
              <AdvanceLedgerTable variant="compact" entries={ledger} loading={ledgerLoading} customerId={activeCustomerId} onRefresh={() => { loadBalance(); loadLedger(); onSuccess?.(); }} />
            </section>
          )}
        </div>

        <footer className="advance-sheet-footer">
          <button type="button" className="advance-footer-btn advance-footer-cancel" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" form="advance-action-form" className={`advance-footer-btn advance-footer-save${activeTab === 'refund' ? ' is-danger' : ''}`} disabled={submitDisabled}>
            {submitLabel}
          </button>
        </footer>
      </div>

      <CustomerInspectorPanel
        isOpen={isCustomerCreateOpen}
        onClose={() => setIsCustomerCreateOpen(false)}
        mode="create"
        initialData={{ fullName: receiveCustomerSearch.trim() }}
        onSuccess={(customer) => {
          if (customer) selectReceiveCustomer(customer);
          setIsCustomerCreateOpen(false);
        }}
      />
    </SlideOver>
  );
};

export default AdvancePanel;
