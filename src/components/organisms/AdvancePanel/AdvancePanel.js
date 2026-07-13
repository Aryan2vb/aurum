import React, { useState, useEffect, useCallback } from 'react';
import SlideOver from '../../atoms/SlideOver/SlideOver';
import Button from '../../atoms/Button/Button';
import Input from '../../atoms/Input/Input';
import AmountDisplay from '../../atoms/AmountDisplay/AmountDisplay';
import Toast from '../../atoms/Toast/Toast';
import Avatar from '../../atoms/Avatar/Avatar';
import {
  getAdvanceBalance,
  receiveAdvance,
  refundAdvance,
  transferAdvance,
} from '../../../services/advanceService';
import { searchCustomers } from '../../../services/customersService';
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
  { id: 'receive', label: 'Receive Advance' },
  { id: 'refund', label: 'Refund' },
  { id: 'transfer', label: 'Transfer' },
];

const emptyForm = () => ({
  amount: '',
  paymentMethod: 'CASH',
  reference: '',
  notes: '',
});

// Full Indian number formatting — no K / L / Cr abbreviations
const fmtAmt = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const AdvancePanel = ({ isOpen, onClose, customerId, customerName, onSuccess }) => {
  const [activeTab, setActiveTab] = useState('receive');
  const [balance, setBalance] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const [form, setForm] = useState(emptyForm());
  const [transferForm, setTransferForm] = useState({ amount: '', toCustomerId: '', notes: '' });
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [searching, setSearching] = useState(false);

  const loadBalance = useCallback(async () => {
    if (!customerId) return;
    try {
      setBalanceLoading(true);
      const data = await getAdvanceBalance(customerId);
      setBalance(parseFloat(data.availableAdvance || 0));
    } catch {
      setBalance(0);
    } finally {
      setBalanceLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    if (isOpen) {
      loadBalance();
      setActiveTab('receive');
      setForm(emptyForm());
      setTransferForm({ amount: '', toCustomerId: '', notes: '' });
      setSelectedRecipient(null);
      setCustomerSearch('');
      setCustomerResults([]);
    }
  }, [isOpen, loadBalance]);

  // Debounced customer search for transfer tab
  useEffect(() => {
    if (customerSearch.length < 2) { setCustomerResults([]); return; }
    const t = setTimeout(async () => {
      try {
        setSearching(true);
        const data = await searchCustomers({ query: customerSearch });
        setCustomerResults((data.data || data || []).filter((c) => c.id !== customerId));
      } catch {
        setCustomerResults([]);
      } finally {
        setSearching(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [customerSearch, customerId]);

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
      await receiveAdvance(customerId, {
        amount,
        paymentMethod: form.paymentMethod,
        ...(form.reference && { reference: form.reference }),
        ...(form.notes && { notes: form.notes }),
      });
      setToast({ type: 'success', message: `Advance of ${fmtAmt(amount)} recorded` });
      setForm(emptyForm());
      await loadBalance();
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
      await refundAdvance(customerId, {
        amount,
        paymentMethod: form.paymentMethod,
        ...(form.reference && { reference: form.reference }),
        ...(form.notes && { notes: form.notes }),
      });
      setToast({ type: 'success', message: `Refund of ${fmtAmt(amount)} processed` });
      setForm(emptyForm());
      await loadBalance();
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
      await transferAdvance(customerId, {
        toCustomerId: selectedRecipient.id,
        amount,
        ...(transferForm.notes && { notes: transferForm.notes }),
      });
      setToast({ type: 'success', message: `${fmtAmt(amount)} transferred to ${selectedRecipient.fullName}` });
      setTransferForm({ amount: '', toCustomerId: '', notes: '' });
      setSelectedRecipient(null);
      setCustomerSearch('');
      await loadBalance();
      setTimeout(() => { onSuccess?.(); }, 1200);
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to transfer advance' });
    } finally {
      setSaving(false);
    }
  };

  const needsReference = ['UPI', 'BANK_TRANSFER', 'CHEQUE', 'NEFT', 'RTGS', 'IMPS'].includes(form.paymentMethod);

  return (
    <SlideOver isOpen={isOpen} onClose={onClose} title="Customer Advance" width={520}>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      <div className="advance-panel">
        {/* Balance header */}
        <div className="advance-panel-balance-card">
          <div className="advance-panel-balance-info">
            <span className="advance-panel-balance-label">Available Balance</span>
            <span className="advance-panel-balance-sub">{customerName}</span>
          </div>
          {balanceLoading ? (
            <span className="advance-panel-balance-loading">Loading…</span>
          ) : (
            <AmountDisplay value={balance ?? 0} size="xl" emphasis variant={balance > 0 ? 'positive' : 'neutral'} />
          )}
        </div>

        {/* Tabs */}
        <div className="advance-panel-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`advance-panel-tab${activeTab === tab.id ? ' advance-panel-tab-active' : ''}`}
              onClick={() => { setActiveTab(tab.id); setForm(emptyForm()); }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── RECEIVE ── */}
        {activeTab === 'receive' && (
          <form className="advance-panel-form" onSubmit={handleReceive}>
            <p className="advance-panel-form-hint">
              Record advance payment received from the customer before any invoice is raised.
            </p>
            <div className="advance-panel-field">
              <label className="advance-panel-label">Amount <span className="required">*</span></label>
              <Input type="number" step="0.01" min="0.01" placeholder="e.g. 100000"
                value={form.amount} onChange={(e) => handleFieldChange('amount', e.target.value)} required />
            </div>
            <div className="advance-panel-field">
              <label className="advance-panel-label">Payment Method <span className="required">*</span></label>
              <select className="advance-panel-select" value={form.paymentMethod}
                onChange={(e) => handleFieldChange('paymentMethod', e.target.value)}>
                {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            {needsReference && (
              <div className="advance-panel-field">
                <label className="advance-panel-label">Reference / UTR</label>
                <Input type="text" placeholder="UTR / Cheque number"
                  value={form.reference} onChange={(e) => handleFieldChange('reference', e.target.value)} />
              </div>
            )}
            <div className="advance-panel-field">
              <label className="advance-panel-label">Notes</label>
              <textarea className="advance-panel-textarea" rows={2} placeholder="Optional notes…"
                value={form.notes} onChange={(e) => handleFieldChange('notes', e.target.value)} />
            </div>
            <div className="advance-panel-actions">
              <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving…' : 'Record Advance'}</Button>
            </div>
          </form>
        )}

        {/* ── REFUND ── */}
        {activeTab === 'refund' && (
          <form className="advance-panel-form" onSubmit={handleRefund}>
            {balance !== null && balance <= 0 && (
              <div className="advance-panel-warning">No advance balance available to refund.</div>
            )}
            <p className="advance-panel-form-hint">Return part or all of the advance balance to the customer.</p>
            <div className="advance-panel-field">
              <label className="advance-panel-label">Refund Amount <span className="required">*</span></label>
              <Input type="number" step="0.01" min="0.01" max={balance ?? undefined} placeholder="e.g. 10000"
                value={form.amount} onChange={(e) => handleFieldChange('amount', e.target.value)} required />
              {balance !== null && (
                <span className="advance-panel-hint">Available: <AmountDisplay value={balance} /></span>
              )}
            </div>
            <div className="advance-panel-field">
              <label className="advance-panel-label">Return Method <span className="required">*</span></label>
              <select className="advance-panel-select" value={form.paymentMethod}
                onChange={(e) => handleFieldChange('paymentMethod', e.target.value)}>
                {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            {needsReference && (
              <div className="advance-panel-field">
                <label className="advance-panel-label">Reference / UTR</label>
                <Input type="text" placeholder="UTR / Cheque number"
                  value={form.reference} onChange={(e) => handleFieldChange('reference', e.target.value)} />
              </div>
            )}
            <div className="advance-panel-field">
              <label className="advance-panel-label">Notes</label>
              <textarea className="advance-panel-textarea" rows={2} placeholder="Reason for refund…"
                value={form.notes} onChange={(e) => handleFieldChange('notes', e.target.value)} />
            </div>
            <div className="advance-panel-actions">
              <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
              <Button type="submit" variant="danger" disabled={saving || balance <= 0}>
                {saving ? 'Processing…' : 'Refund Advance'}
              </Button>
            </div>
          </form>
        )}

        {/* ── TRANSFER ── */}
        {activeTab === 'transfer' && (
          <form className="advance-panel-form" onSubmit={handleTransfer}>
            {balance !== null && balance <= 0 && (
              <div className="advance-panel-warning">No advance balance available to transfer.</div>
            )}
            <p className="advance-panel-form-hint">Move part of the advance balance to another customer account.</p>
            <div className="advance-panel-field">
              <label className="advance-panel-label">Transfer Amount <span className="required">*</span></label>
              <Input type="number" step="0.01" min="0.01" max={balance ?? undefined} placeholder="e.g. 25000"
                value={transferForm.amount} onChange={(e) => handleTransferFieldChange('amount', e.target.value)} required />
              {balance !== null && (
                <span className="advance-panel-hint">Available: <AmountDisplay value={balance} /></span>
              )}
            </div>
            <div className="advance-panel-field">
              <label className="advance-panel-label">Transfer To <span className="required">*</span></label>
              {selectedRecipient ? (
                <div className="advance-panel-recipient-selected">
                  <Avatar name={selectedRecipient.fullName} size="sm" />
                  <span className="advance-panel-recipient-name">{selectedRecipient.fullName}</span>
                  <span className="advance-panel-recipient-code">{selectedRecipient.customerCode}</span>
                  <button type="button" className="advance-panel-recipient-clear"
                    onClick={() => { setSelectedRecipient(null); setCustomerSearch(''); }}>×</button>
                </div>
              ) : (
                <>
                  <Input type="text" placeholder="Search customer by name or phone…"
                    value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} />
                  {searching && <p className="advance-panel-hint">Searching…</p>}
                  {customerResults.length > 0 && (
                    <div className="advance-panel-customer-results">
                      {customerResults.map((c) => (
                        <div key={c.id} className="advance-panel-customer-result"
                          onClick={() => { setSelectedRecipient(c); setCustomerSearch(''); setCustomerResults([]); }}>
                          <Avatar name={c.fullName} size="sm" />
                          <div>
                            <div className="advance-panel-customer-result-name">{c.fullName}</div>
                            <div className="advance-panel-customer-result-sub">
                              {c.customerCode} · {c.contactDetails?.[0]?.primaryPhone || ''}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="advance-panel-field">
              <label className="advance-panel-label">Notes</label>
              <textarea className="advance-panel-textarea" rows={2} placeholder="Reason for transfer…"
                value={transferForm.notes} onChange={(e) => handleTransferFieldChange('notes', e.target.value)} />
            </div>
            <div className="advance-panel-actions">
              <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={saving || balance <= 0 || !selectedRecipient}>
                {saving ? 'Transferring…' : 'Transfer Advance'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </SlideOver>
  );
};

export default AdvancePanel;
