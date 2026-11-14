import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { searchCustomers } from '../../../services/customersService';
import { getAvailableAdvances } from '../../../services/advanceService';
import Icon from '../../atoms/Icon/Icon';
import './AdvanceReceiptPicker.css';

const METHOD_LABELS = {
  CASH: 'Cash', UPI: 'UPI', BANK_TRANSFER: 'Bank Transfer',
  CHEQUE: 'Cheque', NEFT: 'NEFT', RTGS: 'RTGS', IMPS: 'IMPS',
  OLD_GOLD: 'Old Gold', CREDIT: 'Credit', OTHER: 'Other',
};

const formatDate = (value) => {
  if (!value) return '';
  const ymd = String(value).slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    const [y, m, d] = ymd.split('-').map(Number);
    const local = new Date(y, m - 1, d);
    return local.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const toYmd = (value) => (value ? String(value).slice(0, 10) : '');

const getCustomerDisplayName = (c) => c?.fullName || c?.name || 'Customer';
const getCustomerDisplayPhone = (c) => c?.contactDetails?.[0]?.primaryPhone || c?.phone || '';

const EMPTY_RESERVED = {};

const toSelection = (receipt, customerId, customerName, applyAmount) => ({
  advanceEntryId: receipt.id,
  sourceCustomerId: customerId,
  sourceCustomerName: customerName,
  transactionDate: receipt.transactionDate,
  paymentMethod: receipt.paymentMethod,
  reference: receipt.reference,
  description: receipt.description,
  originalAmount: parseFloat(receipt.originalAmount) || parseFloat(receipt.amount) || 0,
  remainingAmount: parseFloat(receipt.remainingAmount) || 0,
  applyAmount,
});

const formatCurrency = (n) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n);

/**
 * AdvanceReceiptPicker — lets the operator pick specific advance receipt lots
 * (with optional partial split) to apply to an invoice.
 *
 * Props:
 * - primaryCustomerId {string}      — the Bill-To customer
 * - primaryCustomerName {string}    — Bill-To customer's name (for headers)
 * - selectedAdvances {Array}        — controlled state: list of picked advances
 *       Each entry: { advanceEntryId, sourceCustomerId, sourceCustomerName,
 *                     transactionDate, paymentMethod, reference, description,
 *                     originalAmount, remainingAmount, applyAmount }
 * - onSelectedAdvancesChange {fn}   — setter for selectedAdvances
 * - invoiceDate {string}            — current invoice date (for validation)
 * - invoiceTotal {number}           — invoice total (for auto-fill / validation)
 * - directPaymentsTotal {number}    — sum of non-advance payments
 * - reservedByInvoice {Object}      — { [advanceEntryId]: amount } this (issued) invoice already
 *                                     uses; counted as still available to it while editing
 */
const AdvanceReceiptPicker = ({
  primaryCustomerId,
  primaryCustomerName,
  selectedAdvances = [],
  onSelectedAdvancesChange,
  invoiceDate,
  invoiceTotal = 0,
  directPaymentsTotal = 0,
  reservedByInvoice = EMPTY_RESERVED,
}) => {
  // Available receipts per customer (primary + any cross-customer sources)
  const [availableByCustomer, setAvailableByCustomer] = useState({});
  // Cross-customer search state
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState([]);
  const [customerSearching, setCustomerSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const searchDebounceRef = useRef(null);

  // Load available advances for the primary customer (and keep any customers referenced by selectedAdvances)
  useEffect(() => {
    if (!primaryCustomerId) {
      setAvailableByCustomer({});
      return;
    }
    let cancelled = false;
    const referencedCustomerIds = new Set(
      selectedAdvances.map((a) => a.sourceCustomerId).filter(Boolean),
    );

    setLoading(true);
    getAvailableAdvances(primaryCustomerId)
      .then((receipts) => {
        if (cancelled) return;
        setLoading(false);
        setAvailableByCustomer((prev) => {
          const next = {};
          // Preserve cross-customer entries still referenced in selectedAdvances or added explicitly
          Object.entries(prev).forEach(([cid, val]) => {
            if (cid === primaryCustomerId || referencedCustomerIds.has(cid)) {
              next[cid] = val;
            }
          });
          next[primaryCustomerId] = {
            customerName: primaryCustomerName || 'Primary',
            receipts: Array.isArray(receipts) ? receipts : [],
          };
          return next;
        });
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
        setAvailableByCustomer((prev) => ({
          ...prev,
          [primaryCustomerId]: { customerName: primaryCustomerName || 'Primary', receipts: [] },
        }));
      });

    // Also hydrate any cross-customer sources present in selectedAdvances (e.g., draft reload or Bill-To swap)
    referencedCustomerIds.forEach((cid) => {
      if (cid === primaryCustomerId) return;
      const sample = selectedAdvances.find((a) => a.sourceCustomerId === cid);
      getAvailableAdvances(cid)
        .then((receipts) => {
          if (cancelled) return;
          setAvailableByCustomer((prev) => ({
            ...prev,
            [cid]: {
              customerName: sample?.sourceCustomerName || prev[cid]?.customerName || 'Customer',
              receipts: Array.isArray(receipts) ? receipts : [],
            },
          }));
        })
        .catch(() => {});
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryCustomerId]);

  // A name change (customer object finished loading) must not drop added cross-customer groups.
  useEffect(() => {
    if (!primaryCustomerId || !primaryCustomerName) return;
    setAvailableByCustomer((prev) =>
      prev[primaryCustomerId] && prev[primaryCustomerId].customerName !== primaryCustomerName
        ? { ...prev, [primaryCustomerId]: { ...prev[primaryCustomerId], customerName: primaryCustomerName } }
        : prev,
    );
  }, [primaryCustomerId, primaryCustomerName]);

  // Receipts as this invoice sees them: amounts it already uses count as available to it,
  // and a selected receipt stays listed even when nothing is left on it for anyone else.
  const effectiveByCustomer = useMemo(() => {
    const out = {};
    Object.entries(availableByCustomer).forEach(([cid, group]) => {
      const receipts = group.receipts.map((r) =>
        reservedByInvoice[r.id]
          ? { ...r, remainingAmount: (parseFloat(r.remainingAmount) || 0) + reservedByInvoice[r.id] }
          : r,
      );
      selectedAdvances
        .filter((a) => a.sourceCustomerId === cid && !receipts.some((r) => r.id === a.advanceEntryId))
        .forEach((a) => {
          receipts.push({
            id: a.advanceEntryId,
            transactionDate: a.transactionDate,
            paymentMethod: a.paymentMethod,
            reference: a.reference,
            description: a.description,
            originalAmount: a.originalAmount,
            remainingAmount: a.remainingAmount,
          });
        });
      receipts.sort((x, y) => toYmd(x.transactionDate).localeCompare(toYmd(y.transactionDate)));
      out[cid] = { ...group, receipts };
    });
    return out;
  }, [availableByCustomer, reservedByInvoice, selectedAdvances]);

  // ── Selection helpers ──
  const isSelected = useCallback(
    (entryId) => selectedAdvances.some((a) => a.advanceEntryId === entryId),
    [selectedAdvances],
  );

  const remainingInvoiceBalance = Math.max(
    0,
    invoiceTotal -
      directPaymentsTotal -
      selectedAdvances.reduce((s, a) => s + (parseFloat(a.applyAmount) || 0), 0),
  );

  const isAfterInvoice = (receipt) =>
    Boolean(toYmd(receipt.transactionDate) && toYmd(invoiceDate) && toYmd(receipt.transactionDate) > toYmd(invoiceDate));

  const toggleReceipt = useCallback(
    (receipt, customerId, customerName) => {
      if (isSelected(receipt.id)) {
        // Deselect
        onSelectedAdvancesChange(
          selectedAdvances.filter((a) => a.advanceEntryId !== receipt.id),
        );
      } else {
        // Select — default to what the invoice still needs (or the whole receipt if the total is unknown)
        const remaining = parseFloat(receipt.remainingAmount) || 0;
        const defaultAmount = invoiceTotal > 0 ? Math.min(remaining, remainingInvoiceBalance) : remaining;
        if (defaultAmount <= 0) return;
        onSelectedAdvancesChange([
          ...selectedAdvances,
          toSelection(receipt, customerId, customerName, Math.round(defaultAmount * 100) / 100),
        ]);
      }
    },
    [isSelected, selectedAdvances, onSelectedAdvancesChange, invoiceTotal, remainingInvoiceBalance],
  );

  const updateApplyAmount = useCallback(
    (entryId, value) => {
      onSelectedAdvancesChange(
        selectedAdvances.map((a) => {
          if (a.advanceEntryId !== entryId) return a;
          const maxAmount = a.remainingAmount;
          const parsed = parseFloat(value);
          // Allow empty string for typing; clamp on blur
          return { ...a, applyAmount: Number.isNaN(parsed) ? '' : Math.min(parsed, maxAmount) };
        }),
      );
    },
    [selectedAdvances, onSelectedAdvancesChange],
  );

  // ── Quick controls ──
  const handleAutoFill = useCallback(() => {
    // Select receipts in date order until invoice balance is covered
    const allReceipts = Object.entries(effectiveByCustomer).flatMap(
      ([custId, { customerName, receipts }]) =>
        receipts.map((r) => ({ ...r, _custId: custId, _custName: customerName })),
    );
    allReceipts.sort(
      (a, b) => toYmd(a.transactionDate).localeCompare(toYmd(b.transactionDate)),
    );

    let budgetLeft = invoiceTotal > 0 ? invoiceTotal - directPaymentsTotal : Infinity;
    const newSelected = [];
    for (const r of allReceipts) {
      if (budgetLeft <= 0) break;
      if (isAfterInvoice(r)) continue;
      const remaining = parseFloat(r.remainingAmount) || 0;
      if (remaining <= 0) continue;
      const apply = Math.round(Math.min(remaining, budgetLeft) * 100) / 100;
      newSelected.push(toSelection(r, r._custId, r._custName, apply));
      budgetLeft -= apply;
    }
    onSelectedAdvancesChange(newSelected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveByCustomer, invoiceTotal, directPaymentsTotal, onSelectedAdvancesChange, invoiceDate]);

  const handleClear = useCallback(() => {
    onSelectedAdvancesChange([]);
  }, [onSelectedAdvancesChange]);

  // ── Cross-customer search ──
  const handleCustomerSearch = useCallback(
    async (q) => {
      setCustomerSearchQuery(q);
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      if (q.length < 2) {
        setCustomerSearchResults([]);
        return;
      }
      searchDebounceRef.current = setTimeout(async () => {
        setCustomerSearching(true);
        try {
          const res = await searchCustomers({ query: q });
          const results = res?.data || res || [];
          setCustomerSearchResults(
            (Array.isArray(results) ? results : []).filter(
              (c) => c.id !== primaryCustomerId && !availableByCustomer[c.id],
            ),
          );
        } catch {
          setCustomerSearchResults([]);
        } finally {
          setCustomerSearching(false);
        }
      }, 300);
    },
    [primaryCustomerId, availableByCustomer],
  );

  const addCrossCustomer = useCallback(
    async (customer) => {
      const displayName = getCustomerDisplayName(customer);
      setShowCustomerSearch(false);
      setCustomerSearchQuery('');
      setCustomerSearchResults([]);
      try {
        const receipts = await getAvailableAdvances(customer.id);
        setAvailableByCustomer((prev) => ({
          ...prev,
          [customer.id]: {
            customerName: displayName,
            receipts: Array.isArray(receipts) ? receipts : [],
          },
        }));
      } catch {
        setAvailableByCustomer((prev) => ({
          ...prev,
          [customer.id]: { customerName: displayName, receipts: [] },
        }));
      }
    },
    [],
  );

  const removeCrossCustomer = useCallback(
    (customerId) => {
      setAvailableByCustomer((prev) => {
        const next = { ...prev };
        delete next[customerId];
        return next;
      });
      // Remove any selected advances from that customer
      onSelectedAdvancesChange(
        selectedAdvances.filter((a) => a.sourceCustomerId !== customerId),
      );
    },
    [selectedAdvances, onSelectedAdvancesChange],
  );

  // ── Validation ──
  const totalAdvanceApplied = selectedAdvances.reduce(
    (s, a) => s + (parseFloat(a.applyAmount) || 0),
    0,
  );
  const totalPaid = directPaymentsTotal + totalAdvanceApplied;
  const isOverpaid = totalPaid > invoiceTotal && invoiceTotal > 0;

  const futureDateWarnings = selectedAdvances.filter(
    (a) => toYmd(a.transactionDate) && toYmd(invoiceDate) && toYmd(a.transactionDate) > toYmd(invoiceDate),
  );

  const customerGroups = Object.entries(effectiveByCustomer);
  const usableReceipts = customerGroups.flatMap(([, g]) =>
    g.receipts.filter((r) => (parseFloat(r.remainingAmount) || 0) > 0 && !isAfterInvoice(r)),
  );
  const totalAvailable = usableReceipts.reduce((s, r) => s + (parseFloat(r.remainingAmount) || 0), 0);
  const dueBeforeAdvance = Math.max(0, invoiceTotal - directPaymentsTotal);
  const suggestedAmount = Math.round(
    (invoiceTotal > 0 ? Math.min(totalAvailable, dueBeforeAdvance) : totalAvailable) * 100,
  ) / 100;
  const canSuggest = suggestedAmount > 0 && Math.abs(suggestedAmount - totalAdvanceApplied) >= 0.01;
  const stillDue = Math.max(0, invoiceTotal - totalPaid);
  const primaryGroup = effectiveByCustomer[primaryCustomerId];
  const hasCross = customerGroups.some(([cid]) => cid !== primaryCustomerId);
  const COLLAPSED_COUNT = 5;

  if (!primaryCustomerId) return null;

  const headerMeta = loading && !primaryGroup
    ? 'Checking for advance…'
    : usableReceipts.length > 0
      ? `₹${formatCurrency(totalAvailable)} available · ${usableReceipts.length} receipt${usableReceipts.length !== 1 ? 's' : ''}`
      : hasCross
        ? 'Nothing left to use from these customers'
        : `No advance on file for ${primaryCustomerName || 'this customer'}`;

  const renderReceipt = (receipt, custId, customerName) => {
    const selected = isSelected(receipt.id);
    const selEntry = selectedAdvances.find((a) => a.advanceEntryId === receipt.id);
    const remaining = parseFloat(receipt.remainingAmount) || 0;
    const original = parseFloat(receipt.originalAmount) || parseFloat(receipt.amount) || 0;
    const afterInvoice = isAfterInvoice(receipt);
    const covered = invoiceTotal > 0 && remainingInvoiceBalance <= 0;
    const disabled = !selected && (afterInvoice || covered);
    const mode = METHOD_LABELS[receipt.paymentMethod] || receipt.paymentMethod || 'Advance';
    const overLimit = selEntry && (parseFloat(selEntry.applyAmount) || 0) > remaining;
    const hint = !selected && afterInvoice
      ? 'Received after the invoice date'
      : !selected && covered
        ? 'Invoice already covered'
        : null;

    return (
      <div
        key={receipt.id}
        className={[
          'advance-picker__receipt',
          selected && 'advance-picker__receipt--selected',
          disabled && 'advance-picker__receipt--disabled',
        ].filter(Boolean).join(' ')}
      >
        <label className="advance-picker__receipt-main">
          <input
            type="checkbox"
            className="advance-picker__checkbox"
            checked={selected}
            disabled={disabled}
            aria-label={`Use advance received ${formatDate(receipt.transactionDate)}, ${mode}, ₹${formatCurrency(remaining)} left`}
            onChange={() => toggleReceipt(receipt, custId, customerName)}
          />
          <span className="advance-picker__receipt-text">
            <span className="advance-picker__receipt-date">{formatDate(receipt.transactionDate)}</span>
            <span className="advance-picker__receipt-meta">
              {mode}
              {receipt.reference ? ` · ${receipt.reference}` : ''}
              {hint ? <span className="advance-picker__receipt-hint"> · {hint}</span> : null}
            </span>
          </span>
        </label>

        {selected ? (
          <div className="advance-picker__apply">
            <div className={`advance-picker__apply-field${overLimit ? ' advance-picker__apply-field--error' : ''}`}>
              <span className="advance-picker__apply-currency" aria-hidden="true">₹</span>
              <input
                type="number"
                inputMode="decimal"
                className="advance-picker__apply-input"
                aria-label={`Amount to use from the ${formatDate(receipt.transactionDate)} receipt`}
                min={0.01}
                max={remaining}
                step={0.01}
                value={selEntry?.applyAmount ?? ''}
                onChange={(e) => updateApplyAmount(receipt.id, e.target.value)}
                onBlur={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  updateApplyAmount(receipt.id, Math.max(0.01, Math.min(val, remaining)));
                }}
              />
            </div>
            <span className="advance-picker__amount-sub">of ₹{formatCurrency(remaining)}</span>
          </div>
        ) : (
          <div className="advance-picker__amount">
            <span className="advance-picker__amount-main">₹{formatCurrency(remaining)}</span>
            <span className="advance-picker__amount-sub">
              {original > remaining ? `left of ₹${formatCurrency(original)}` : 'available'}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="advance-picker" aria-label="Advance">
      <header className="advance-picker__header">
        <div className="advance-picker__heading">
          <span className="advance-picker__title">Advance</span>
          <span className="advance-picker__meta">{headerMeta}</span>
        </div>
        {canSuggest && (
          <button
            type="button"
            className="advance-picker__autofill"
            onClick={handleAutoFill}
            title="Uses the oldest receipts first"
          >
            {totalAdvanceApplied > 0 ? `Use ₹${formatCurrency(suggestedAmount)} instead` : `Use ₹${formatCurrency(suggestedAmount)}`}
          </button>
        )}
      </header>

      {customerGroups.map(([custId, { customerName, receipts }]) => {
        const isCross = custId !== primaryCustomerId;
        const available = receipts.filter((r) => (parseFloat(r.remainingAmount) || 0) > 0);
        if (!isCross && available.length === 0) return null;

        const collapsible = !showAll && available.length > COLLAPSED_COUNT + 1;
        const visible = collapsible
          ? available.filter((r, idx) => idx < COLLAPSED_COUNT || isSelected(r.id))
          : available;
        const hiddenCount = available.length - visible.length;

        return (
          <div key={custId} className="advance-picker__group">
            {isCross && (
              <div className="advance-picker__group-header">
                <span className="advance-picker__group-name">From: {customerName}</span>
                <button
                  type="button"
                  className="advance-picker__icon-btn"
                  onClick={() => removeCrossCustomer(custId)}
                  aria-label={`Stop using advance from ${customerName}`}
                  title="Remove"
                >
                  <Icon name="close" size={14} color="currentColor" />
                </button>
              </div>
            )}
            {available.length === 0 ? (
              <p className="advance-picker__empty">No advance left for {customerName}</p>
            ) : (
              <div className="advance-picker__list">
                {visible.map((r) => renderReceipt(r, custId, customerName))}
              </div>
            )}
            {hiddenCount > 0 && (
              <button type="button" className="advance-picker__link" onClick={() => setShowAll(true)}>
                Show {hiddenCount} more receipt{hiddenCount !== 1 ? 's' : ''}
              </button>
            )}
          </div>
        );
      })}

      <div className="advance-picker__other">
        {!showCustomerSearch ? (
          <button
            type="button"
            className="advance-picker__link"
            onClick={() => setShowCustomerSearch(true)}
          >
            <Icon name="add" size={14} color="currentColor" />
            Use advance from another customer
          </button>
        ) : (
          <div className="advance-picker__search">
            <div className="advance-picker__search-row">
              <input
                className="advance-picker__customer-search-input"
                placeholder="Search by name or phone"
                aria-label="Search customer whose advance to use"
                value={customerSearchQuery}
                onChange={(e) => handleCustomerSearch(e.target.value)}
                autoFocus
              />
              <button
                type="button"
                className="advance-picker__link"
                onClick={() => {
                  setShowCustomerSearch(false);
                  setCustomerSearchQuery('');
                  setCustomerSearchResults([]);
                }}
              >
                Cancel
              </button>
            </div>
            {customerSearching && <p className="advance-picker__empty">Searching…</p>}
            {!customerSearching && customerSearchQuery.length >= 2 && customerSearchResults.length === 0 && (
              <p className="advance-picker__empty">No matching customers</p>
            )}
            {customerSearchResults.length > 0 && (
              <ul className="advance-picker__results">
                {customerSearchResults.map((c) => {
                  const phone = getCustomerDisplayPhone(c);
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        className="advance-picker__customer-result"
                        onClick={() => addCrossCustomer(c)}
                      >
                        <span className="advance-picker__customer-result-name">{getCustomerDisplayName(c)}</span>
                        {phone && <span className="advance-picker__customer-result-phone">{phone}</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {(isOverpaid || futureDateWarnings.length > 0) && (
        <div className="advance-picker__alerts" role="alert">
          {isOverpaid && (
            <p className="advance-picker__alert">
              <Icon name="alert" size={14} color="currentColor" />
              Payments come to ₹{formatCurrency(totalPaid)}, more than the ₹{formatCurrency(invoiceTotal)} invoice. Lower an amount.
            </p>
          )}
          {futureDateWarnings.length > 0 && (
            <p className="advance-picker__alert">
              <Icon name="alert" size={14} color="currentColor" />
              {futureDateWarnings.length === 1
                ? '1 selected receipt is dated after the invoice date and can’t be used.'
                : `${futureDateWarnings.length} selected receipts are dated after the invoice date and can’t be used.`}
            </p>
          )}
        </div>
      )}

      {selectedAdvances.length > 0 && (
        <footer className="advance-picker__summary">
          <div className="advance-picker__summary-text">
            <span className="advance-picker__summary-amount">₹{formatCurrency(totalAdvanceApplied)}</span>
            <span className="advance-picker__summary-label">
              from {selectedAdvances.length} receipt{selectedAdvances.length !== 1 ? 's' : ''}
              {invoiceTotal > 0 && !isOverpaid ? ` · ₹${formatCurrency(stillDue)} still due` : ''}
            </span>
          </div>
          <button type="button" className="advance-picker__link" onClick={handleClear}>
            Clear
          </button>
        </footer>
      )}
    </section>
  );
};

export default AdvanceReceiptPicker;

