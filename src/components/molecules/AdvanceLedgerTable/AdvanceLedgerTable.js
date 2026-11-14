import React from 'react';
import AmountDisplay from '../../atoms/AmountDisplay/AmountDisplay';
import DateDisplay from '../../atoms/DateDisplay/DateDisplay';
import SlideOver from '../../atoms/SlideOver/SlideOver';
import Button from '../../atoms/Button/Button';
import { usePermission } from '../../../hooks/usePermission';
import { deleteAdvanceEntry, updateAdvanceEntry, correctAdvanceEntry } from '../../../services/advanceService';
import './AdvanceLedgerTable.css';

const TYPE_META = {
  ADVANCE_RECEIVED:     { label: 'Received',           dir: 'credit', color: 'positive' },
  ADVANCE_APPLIED:      { label: 'Applied to invoice', dir: 'debit',  color: 'negative' },
  ADVANCE_TRANSFER_OUT: { label: 'Transferred out',    dir: 'debit',  color: 'negative' },
  ADVANCE_TRANSFER_IN:  { label: 'Received (transfer)',dir: 'credit', color: 'positive' },
  ADVANCE_REFUND:       { label: 'Refunded',           dir: 'debit',  color: 'negative' },
  ADVANCE_CORRECTION_CREDIT: { label: 'Correction in', dir: 'credit', color: 'positive' },
  ADVANCE_CORRECTION_DEBIT: { label: 'Correction out', dir: 'debit', color: 'negative' },
};

const METHOD_LABELS = {
  CASH: 'Cash', UPI: 'UPI', BANK_TRANSFER: 'Bank Transfer',
  CHEQUE: 'Cheque', NEFT: 'NEFT', RTGS: 'RTGS', IMPS: 'IMPS',
  OLD_GOLD: 'Old Gold', CREDIT: 'Credit', OTHER: 'Other',
};

const todayInputDate = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
};

const CREDIT_TYPES = new Set(['ADVANCE_RECEIVED', 'ADVANCE_TRANSFER_IN']);

const getReceiptStatusBadge = (entry) => {
  if (!CREDIT_TYPES.has(entry.type) || entry.remainingAmount == null) return null;
  const orig = parseFloat(entry.originalAmount ?? entry.amount ?? 0);
  const rem = parseFloat(entry.remainingAmount ?? 0);
  if (rem <= 0) return { label: 'Used', variant: 'used' };
  if (orig > 0 && rem < orig) {
    return {
      label: `₹${rem.toLocaleString('en-IN', { maximumFractionDigits: 2 })} left`,
      variant: 'partial',
    };
  }
  return { label: 'Available', variant: 'available' };
};

// ── Detail slide-over ───────────────────────────────────────────────────────
const AdvanceEntryDetail = ({ entry, onClose, onDeleted }) => {
  const { can } = usePermission();
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [editing, setEditing] = React.useState(false);
  const [editForm, setEditForm] = React.useState(null);
  const [correctionOpen, setCorrectionOpen] = React.useState(false);
  const [correctionForm, setCorrectionForm] = React.useState({ amount: '', direction: 'DEBIT', notes: '', transactionDate: todayInputDate() });

  if (!entry) return null;
  const meta = TYPE_META[entry.type] || { label: entry.type, dir: 'debit', color: 'negative' };
  const amount = parseFloat(entry.amount || 0);
  const balance = parseFloat(entry.runningBalance || 0);
  const isCreditEntry = CREDIT_TYPES.has(entry.type);
  const remainingAmt = entry.remainingAmount != null ? parseFloat(entry.remainingAmount) : null;
  const originalAmt = parseFloat(entry.originalAmount ?? entry.amount ?? 0);
  const hasAllocations =
    (Array.isArray(entry.allocations) && entry.allocations.length > 0) ||
    (isCreditEntry && remainingAmt != null && remainingAmt < originalAmt);
  const canDelete = can('delete') && entry.type === 'ADVANCE_RECEIVED' && entry.editable && !hasAllocations;
  const canEdit = can('write') && entry.type === 'ADVANCE_RECEIVED' && entry.editable && !hasAllocations;
  const canCorrect = can('write') && entry.type === 'ADVANCE_RECEIVED' && (!entry.editable || hasAllocations);

  const handleUpdate = async (event) => {
    event.preventDefault();
    try {
      setDeleting(true); setError(null);
      await updateAdvanceEntry(entry.customerId, entry.id, {
        amount: Number(editForm.amount), paymentMethod: editForm.paymentMethod,
        reference: editForm.reference, notes: editForm.description, receivedAt: editForm.transactionDate,
      });
      onDeleted?.();
    } catch (err) { setError(err.message || 'Failed to update advance'); setDeleting(false); }
  };

  const handleCorrection = async (event) => {
    event.preventDefault();
    try {
      setDeleting(true); setError(null);
      await correctAdvanceEntry(entry.customerId, entry.id, { ...correctionForm, amount: Number(correctionForm.amount) });
      onDeleted?.();
    } catch (err) { setError(err.message || 'Failed to record correction'); setDeleting(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete this advance entry of ₹${amount.toLocaleString('en-IN')}? This will reduce the customer's balance.`)) return;
    try {
      setDeleting(true);
      setError(null);
      await deleteAdvanceEntry(entry.customerId, entry.id);
      onDeleted?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to delete');
      setDeleting(false);
    }
  };

  const rows = [
    { label: 'Type',            value: <span className={`advance-ledger-pill advance-ledger-pill-${entry.type}`}>{meta.label}</span> },
    { label: 'Amount',          value: <AmountDisplay value={amount} size="md" emphasis variant={meta.color} /> },
    isCreditEntry && remainingAmt != null && {
      label: 'Remaining unapplied',
      value: <AmountDisplay value={remainingAmt} size="md" variant={remainingAmt > 0 ? 'positive' : 'neutral'} />,
    },
    { label: 'Transaction date', value: <DateDisplay date={entry.transactionDate || entry.createdAt} format="absolute" /> },
    entry.paymentMethod && { label: 'Payment method', value: METHOD_LABELS[entry.paymentMethod] || entry.paymentMethod },
    entry.reference && { label: 'Reference', value: entry.reference },
    entry.referenceLedgerEntryId && { label: 'Linked receipt', value: <span className="advance-detail-id">{entry.referenceLedgerEntryId}</span> },
    entry.description && { label: 'Description',    value: entry.description },
    { label: 'Recorded on', value: <DateDisplay date={entry.createdAt} format="absolute" /> },
    { label: 'Balance after',   value: <AmountDisplay value={Math.abs(balance)} size="md" variant={balance > 0 ? 'positive' : 'neutral'} /> },
    entry.id && { label: 'Entry ID', value: <span className="advance-detail-id">{entry.id}</span> },
  ].filter(Boolean);

  return (
    <SlideOver isOpen onClose={onClose} title="Transaction Detail" width={420}>
      <div className="advance-detail-panel">
        {error && <p style={{ color: 'var(--color-status-overdue)', fontSize: '0.8rem', margin: '12px 0 0' }}>{error}</p>}
        {editing ? (
          <form className="advance-detail-list" onSubmit={handleUpdate}>
            <label className="advance-detail-row">Amount <input type="number" min="0.01" step="0.01" required value={editForm.amount} onChange={e => setEditForm({ ...editForm, amount: e.target.value })} /></label>
            <label className="advance-detail-row">Date received <input type="date" max={todayInputDate()} required value={editForm.transactionDate} onChange={e => setEditForm({ ...editForm, transactionDate: e.target.value })} /></label>
            <label className="advance-detail-row">Payment method <select value={editForm.paymentMethod || 'CASH'} onChange={e => setEditForm({ ...editForm, paymentMethod: e.target.value })}>{Object.entries(METHOD_LABELS).filter(([key]) => ['CASH','UPI','BANK_TRANSFER','CHEQUE','NEFT','RTGS','IMPS','OTHER'].includes(key)).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>
            <label className="advance-detail-row">Reference <input value={editForm.reference || ''} onChange={e => setEditForm({ ...editForm, reference: e.target.value })} /></label>
            <label className="advance-detail-row">Notes <textarea value={editForm.description || ''} onChange={e => setEditForm({ ...editForm, description: e.target.value })} /></label>
            <div className="advance-detail-actions"><Button type="submit" variant="primary" disabled={deleting}>Save changes</Button><Button type="button" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button></div>
          </form>
        ) : correctionOpen ? (
          <form className="advance-detail-list" onSubmit={handleCorrection}>
            <p>Record an auditable correction linked to this receipt.</p>
            <label className="advance-detail-row">Correction <select value={correctionForm.direction} onChange={e => setCorrectionForm({ ...correctionForm, direction: e.target.value })}><option value="DEBIT">Reduce available balance</option><option value="CREDIT">Increase available balance</option></select></label>
            <label className="advance-detail-row">Amount <input type="number" min="0.01" step="0.01" required value={correctionForm.amount} onChange={e => setCorrectionForm({ ...correctionForm, amount: e.target.value })} /></label>
            <label className="advance-detail-row">Date <input type="date" min={(entry.transactionDate || entry.createdAt).slice(0, 10)} max={todayInputDate()} required value={correctionForm.transactionDate} onChange={e => setCorrectionForm({ ...correctionForm, transactionDate: e.target.value })} /></label>
            <label className="advance-detail-row">Reason <textarea required value={correctionForm.notes} onChange={e => setCorrectionForm({ ...correctionForm, notes: e.target.value })} /></label>
            <div className="advance-detail-actions"><Button type="submit" variant="primary" disabled={deleting}>Record correction</Button><Button type="button" variant="ghost" onClick={() => setCorrectionOpen(false)}>Cancel</Button></div>
          </form>
        ) : <>
        <dl className="advance-detail-list">
          {rows.map(({ label, value }) => (
            <div key={label} className="advance-detail-row">
              <dt className="advance-detail-label">{label}</dt>
              <dd className="advance-detail-value">{value}</dd>
            </div>
          ))}
        </dl>
        {Array.isArray(entry.allocations) && entry.allocations.length > 0 && (
          <div className="advance-detail-allocations">
            <h4 className="advance-detail-allocations-title">Applied to Invoices</h4>
            <ul className="advance-detail-allocations-list">
              {entry.allocations.map((alloc, idx) => (
                <li key={alloc.id || alloc.invoiceId || idx} className="advance-detail-allocation-item">
                  <span>
                    <strong>{alloc.invoiceNumber || alloc.invoiceId}</strong>
                    {alloc.invoiceCustomerName ? ` · ${alloc.invoiceCustomerName}` : ''}
                    {alloc.allocatedAt ? ` · ${String(alloc.allocatedAt).slice(0, 10)}` : ''}
                  </span>
                  <AmountDisplay value={alloc.amount} size="sm" variant="negative" />
                </li>
              ))}
            </ul>
          </div>
        )}
        {canEdit && <Button variant="primary" size="small" onClick={() => { setEditForm({ amount: String(amount), paymentMethod: entry.paymentMethod || 'CASH', reference: entry.reference || '', description: entry.description || '', transactionDate: (entry.transactionDate || entry.createdAt).slice(0, 10) }); setEditing(true); }}>Edit receipt</Button>}
        {canCorrect && <Button variant="ghost" size="small" onClick={() => setCorrectionOpen(true)}>Record correction</Button>}

        {canDelete && (
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-primary)' }}>
            <Button
              variant="danger"
              size="small"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? 'Deleting…' : 'Delete this entry'}
            </Button>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 6 }}>
              Only received entries can be deleted. This will reduce the customer's advance balance.
            </p>
          </div>
        )}
        </>}
      </div>
    </SlideOver>
  );
};

// ── Main table component ────────────────────────────────────────────────────
const AdvanceLedgerTable = ({ entries = [], loading, onRefresh, customerId, variant = 'table' }) => {
  const [selected, setSelected] = React.useState(null);

  if (loading) {
    return <p className="advance-ledger-empty">Loading history…</p>;
  }

  if (!entries.length) {
    return (
      <p className="advance-ledger-empty">
        Nothing recorded yet.
      </p>
    );
  }

  const detail = (
    <AdvanceEntryDetail
      entry={selected}
      onClose={() => setSelected(null)}
      onDeleted={() => { setSelected(null); onRefresh?.(); }}
    />
  );

  if (variant === 'compact') {
    return (
      <>
        <ul className="advance-ledger-list">
          {entries.map((entry) => {
            const meta = TYPE_META[entry.type] || { label: entry.type, dir: 'debit', color: 'negative' };
            const amount = parseFloat(entry.amount || 0);
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  className="advance-ledger-item"
                  onClick={() => setSelected({ ...entry, customerId })}
                >
                  <span className="advance-ledger-item-main">
                    <span className="advance-ledger-item-label">{meta.label}</span>
                    <span className="advance-ledger-item-meta">
                      <DateDisplay date={entry.transactionDate || entry.createdAt} format="absolute" size="sm" />
                      {entry.paymentMethod ? ` · ${METHOD_LABELS[entry.paymentMethod] || entry.paymentMethod}` : ''}
                    </span>
                  </span>
                  <AmountDisplay
                    value={amount}
                    size="sm"
                    emphasis
                    variant={meta.color}
                  />
                </button>
              </li>
            );
          })}
        </ul>
        {detail}
      </>
    );
  }

  return (
    <>
      <div className="advance-ledger-scroll">
        <table className="advance-ledger-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Description</th>
              <th className="advance-ledger-th-amount">Debit</th>
              <th className="advance-ledger-th-amount">Credit</th>
              <th className="advance-ledger-th-amount">Balance</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const meta = TYPE_META[entry.type] || { label: entry.type, dir: 'debit', color: 'negative' };
              const amount = parseFloat(entry.amount || 0);
              const runningBalance = parseFloat(entry.runningBalance || 0);
              const statusBadge = getReceiptStatusBadge(entry);

              return (
                <tr
                  key={entry.id}
                  className="advance-ledger-row-clickable"
                  onClick={() => setSelected({ ...entry, customerId })}
                  title="Click to view details"
                >
                  <td className="advance-ledger-td-date">
                    <DateDisplay date={entry.transactionDate || entry.createdAt} format="absolute" size="sm" />
                  </td>
                  <td>
                    <span className={`advance-ledger-pill advance-ledger-pill-${entry.type}`}>
                      {meta.label}
                    </span>
                    {statusBadge && (
                      <span className={`advance-receipt-badge advance-receipt-badge--${statusBadge.variant}`}>
                        {statusBadge.label}
                      </span>
                    )}
                  </td>
                  <td className="advance-ledger-td-desc">{entry.description || '—'}</td>
                  <td className="advance-ledger-td-amount">
                    {meta.dir === 'debit'
                      ? <AmountDisplay value={amount} size="sm" variant="negative" />
                      : <span className="advance-ledger-dash">—</span>}
                  </td>
                  <td className="advance-ledger-td-amount">
                    {meta.dir === 'credit'
                      ? <AmountDisplay value={amount} size="sm" variant="positive" />
                      : <span className="advance-ledger-dash">—</span>}
                  </td>
                  <td className="advance-ledger-td-amount">
                    <AmountDisplay
                      value={Math.abs(runningBalance)}
                      size="sm"
                      variant={runningBalance > 0 ? 'positive' : 'neutral'}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {detail}
    </>
  );
};

export default AdvanceLedgerTable;
