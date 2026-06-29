import React from 'react';
import AmountDisplay from '../../atoms/AmountDisplay/AmountDisplay';
import DateDisplay from '../../atoms/DateDisplay/DateDisplay';
import SlideOver from '../../atoms/SlideOver/SlideOver';
import Button from '../../atoms/Button/Button';
import { usePermission } from '../../../hooks/usePermission';
import { deleteAdvanceEntry } from '../../../services/advanceService';
import './AdvanceLedgerTable.css';

const TYPE_META = {
  ADVANCE_RECEIVED:     { label: 'Received',           dir: 'credit', color: 'positive' },
  ADVANCE_APPLIED:      { label: 'Applied to invoice', dir: 'debit',  color: 'negative' },
  ADVANCE_TRANSFER_OUT: { label: 'Transferred out',    dir: 'debit',  color: 'negative' },
  ADVANCE_TRANSFER_IN:  { label: 'Received (transfer)',dir: 'credit', color: 'positive' },
  ADVANCE_REFUND:       { label: 'Refunded',           dir: 'debit',  color: 'negative' },
};

const METHOD_LABELS = {
  CASH: 'Cash', UPI: 'UPI', BANK_TRANSFER: 'Bank Transfer',
  CHEQUE: 'Cheque', NEFT: 'NEFT', RTGS: 'RTGS', IMPS: 'IMPS',
  OLD_GOLD: 'Old Gold', CREDIT: 'Credit', OTHER: 'Other',
};

// ── Detail slide-over ───────────────────────────────────────────────────────
const AdvanceEntryDetail = ({ entry, onClose, onDeleted }) => {
  const { can } = usePermission();
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState(null);

  if (!entry) return null;
  const meta = TYPE_META[entry.type] || { label: entry.type, dir: 'debit', color: 'negative' };
  const amount = parseFloat(entry.amount || 0);
  const balance = parseFloat(entry.runningBalance || 0);
  const canDelete = can('delete') && entry.type === 'ADVANCE_RECEIVED';

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
    { label: 'Date',            value: <DateDisplay date={entry.createdAt} format="absolute" /> },
    entry.paymentMethod && { label: 'Payment method', value: METHOD_LABELS[entry.paymentMethod] || entry.paymentMethod },
    entry.description && { label: 'Description',    value: entry.description },
    { label: 'Balance after',   value: <AmountDisplay value={Math.abs(balance)} size="md" variant={balance > 0 ? 'positive' : 'neutral'} /> },
    entry.id && { label: 'Entry ID', value: <span className="advance-detail-id">{entry.id}</span> },
  ].filter(Boolean);

  return (
    <SlideOver isOpen onClose={onClose} title="Transaction Detail" width={420}>
      <div className="advance-detail-panel">
        <dl className="advance-detail-list">
          {rows.map(({ label, value }) => (
            <div key={label} className="advance-detail-row">
              <dt className="advance-detail-label">{label}</dt>
              <dd className="advance-detail-value">{value}</dd>
            </div>
          ))}
        </dl>

        {error && (
          <p style={{ color: 'var(--color-status-overdue)', fontSize: '0.8rem', margin: '12px 0 0' }}>{error}</p>
        )}

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
      </div>
    </SlideOver>
  );
};

// ── Main table component ────────────────────────────────────────────────────
const AdvanceLedgerTable = ({ entries = [], loading, onRefresh, customerId }) => {
  const [selected, setSelected] = React.useState(null);

  if (loading) {
    return <p className="advance-ledger-empty">Loading advance history…</p>;
  }

  if (!entries.length) {
    return (
      <p className="advance-ledger-empty">
        No advance transactions yet.
      </p>
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

              return (
                <tr
                  key={entry.id}
                  className="advance-ledger-row-clickable"
                  onClick={() => setSelected({ ...entry, customerId })}
                  title="Click to view details"
                >
                  <td className="advance-ledger-td-date">
                    <DateDisplay date={entry.createdAt} format="absolute" size="sm" />
                  </td>
                  <td>
                    <span className={`advance-ledger-pill advance-ledger-pill-${entry.type}`}>
                      {meta.label}
                    </span>
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

      <AdvanceEntryDetail
        entry={selected}
        onClose={() => setSelected(null)}
        onDeleted={() => { setSelected(null); onRefresh?.(); }}
      />
    </>
  );
};

export default AdvanceLedgerTable;
