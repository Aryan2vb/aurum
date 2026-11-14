import React, { useState, useCallback, useRef, useEffect } from 'react';
import { searchCustomers } from '../../../services/customersService';
import { getAvailableAdvances } from '../../../services/advanceService';
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
 */
const AdvanceReceiptPicker = ({
  primaryCustomerId,
  primaryCustomerName,
  selectedAdvances = [],
  onSelectedAdvancesChange,
  invoiceDate,
  invoiceTotal = 0,
  directPaymentsTotal = 0,
}) => {
  // Available receipts per customer (primary + any cross-customer sources)
  const [availableByCustomer, setAvailableByCustomer] = useState({});
  // Cross-customer search state
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState([]);
  const [customerSearching, setCustomerSearching] = useState(false);
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

    getAvailableAdvances(primaryCustomerId)
      .then((receipts) => {
        if (cancelled) return;
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
  }, [primaryCustomerId, primaryCustomerName]);

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

  const toggleReceipt = useCallback(
    (receipt, customerId, customerName) => {
      if (isSelected(receipt.id)) {
        // Deselect
        onSelectedAdvancesChange(
          selectedAdvances.filter((a) => a.advanceEntryId !== receipt.id),
        );
      } else {
        // Select — default applyAmount: fill remaining invoice balance if > 0, else full receipt remaining
        const remaining = parseFloat(receipt.remainingAmount) || 0;
        const defaultAmount =
          invoiceTotal > 0 && remainingInvoiceBalance > 0
            ? Math.min(remaining, remainingInvoiceBalance)
            : remaining;
        onSelectedAdvancesChange([
          ...selectedAdvances,
          {
            advanceEntryId: receipt.id,
            sourceCustomerId: customerId,
            sourceCustomerName: customerName,
            transactionDate: receipt.transactionDate,
            paymentMethod: receipt.paymentMethod,
            reference: receipt.reference,
            description: receipt.description,
            originalAmount: parseFloat(receipt.originalAmount) || parseFloat(receipt.amount) || 0,
            remainingAmount: remaining,
            applyAmount: Math.max(defaultAmount, 0.01),
          },
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
    const allReceipts = Object.entries(availableByCustomer).flatMap(
      ([custId, { customerName, receipts }]) =>
        receipts.map((r) => ({ ...r, _custId: custId, _custName: customerName })),
    );
    allReceipts.sort(
      (a, b) => toYmd(a.transactionDate).localeCompare(toYmd(b.transactionDate)),
    );

    let budgetLeft = invoiceTotal - directPaymentsTotal;
    const newSelected = [];
    for (const r of allReceipts) {
      if (budgetLeft <= 0) break;
      const remaining = parseFloat(r.remainingAmount) || 0;
      if (remaining <= 0) continue;
      const apply = Math.min(remaining, budgetLeft);
      newSelected.push({
        advanceEntryId: r.id,
        sourceCustomerId: r._custId,
        sourceCustomerName: r._custName,
        transactionDate: r.transactionDate,
        paymentMethod: r.paymentMethod,
        reference: r.reference,
        description: r.description,
        originalAmount: parseFloat(r.originalAmount) || parseFloat(r.amount) || 0,
        remainingAmount: remaining,
        applyAmount: apply,
      });
      budgetLeft -= apply;
    }
    onSelectedAdvancesChange(newSelected);
  }, [availableByCustomer, invoiceTotal, directPaymentsTotal, onSelectedAdvancesChange]);

  const handleSelectAll = useCallback(() => {
    const allReceipts = Object.entries(availableByCustomer).flatMap(
      ([custId, { customerName, receipts }]) =>
        receipts.map((r) => ({ ...r, _custId: custId, _custName: customerName })),
    );
    onSelectedAdvancesChange(
      allReceipts
        .filter((r) => (parseFloat(r.remainingAmount) || 0) > 0)
        .map((r) => ({
          advanceEntryId: r.id,
          sourceCustomerId: r._custId,
          sourceCustomerName: r._custName,
          transactionDate: r.transactionDate,
          paymentMethod: r.paymentMethod,
          reference: r.reference,
          description: r.description,
          originalAmount: parseFloat(r.originalAmount) || parseFloat(r.amount) || 0,
          remainingAmount: parseFloat(r.remainingAmount) || 0,
          applyAmount: parseFloat(r.remainingAmount) || 0,
        })),
    );
  }, [availableByCustomer, onSelectedAdvancesChange]);

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

  // Gather all customer groups
  const customerGroups = Object.entries(availableByCustomer);
  const hasAnyReceipts = customerGroups.some(([, g]) => g.receipts.length > 0);

  if (!primaryCustomerId) return null;

  return (
    <div className="advance-picker">
      {/* Header */}
      <div className="advance-picker__header">
        <div className="advance-picker__title">
          Advance Receipts
          {selectedAdvances.length > 0 && (
            <span className="advance-picker__title-badge">
              {selectedAdvances.length} selected
            </span>
          )}
        </div>
        <div className="advance-picker__actions">
          <button
            type="button"
            className="advance-picker__action-btn advance-picker__action-btn--primary"
            onClick={handleAutoFill}
            disabled={!hasAnyReceipts}
          >
            Auto-fill
          </button>
          <button
            type="button"
            className="advance-picker__action-btn"
            onClick={handleSelectAll}
            disabled={!hasAnyReceipts}
          >
            Select all
          </button>
          {selectedAdvances.length > 0 && (
            <button
              type="button"
              className="advance-picker__action-btn"
              onClick={handleClear}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Receipt groups */}
      {customerGroups.map(([custId, { customerName, receipts }]) => {
        const isCross = custId !== primaryCustomerId;
        const availableReceipts = receipts.filter(
          (r) => (parseFloat(r.remainingAmount) || 0) > 0,
        );

        return (
          <div key={custId} className="advance-picker__customer-group">
            {(isCross || customerGroups.length > 1) && (
              <div className="advance-picker__customer-header">
                <span className="advance-picker__customer-name">
                  {isCross ? `From: ${customerName}` : customerName}
                </span>
                {isCross && (
                  <button
                    type="button"
                    className="advance-picker__customer-remove"
                    onClick={() => removeCrossCustomer(custId)}
                    title={`Remove ${customerName}`}
                  >
                    ✕
                  </button>
                )}
              </div>
            )}

            {availableReceipts.length === 0 ? (
              <div className="advance-picker__empty">
                No available advance receipts{isCross ? ` for ${customerName}` : ''}
              </div>
            ) : (
              availableReceipts.map((receipt) => {
                const selected = isSelected(receipt.id);
                const selEntry = selectedAdvances.find(
                  (a) => a.advanceEntryId === receipt.id,
                );
                const remaining = parseFloat(receipt.remainingAmount) || 0;
                const original = parseFloat(receipt.originalAmount) || parseFloat(receipt.amount) || 0;
                const isPartial = original !== remaining;

                return (
                  <div
                    key={receipt.id}
                    className={`advance-picker__receipt${selected ? ' advance-picker__receipt--selected' : ''}`}
                  >
                    <input
                      type="checkbox"
                      className="advance-picker__checkbox"
                      checked={selected}
                      onChange={() => toggleReceipt(receipt, custId, customerName)}
                    />
                    <div className="advance-picker__receipt-info">
                      <div className="advance-picker__receipt-main">
                        <span className="advance-picker__receipt-date">
                          {formatDate(receipt.transactionDate)}
                        </span>
                        <span className="advance-picker__receipt-mode">
                          {METHOD_LABELS[receipt.paymentMethod] || receipt.paymentMethod || '—'}
                        </span>
                      </div>
                      {receipt.reference && (
                        <span className="advance-picker__receipt-ref">
                          Ref: {receipt.reference}
                        </span>
                      )}
                    </div>
                    <div className="advance-picker__receipt-amounts">
                      <span className="advance-picker__receipt-remaining">
                        ₹{formatCurrency(remaining)}
                      </span>
                      {isPartial && (
                        <span className="advance-picker__receipt-original">
                          of ₹{formatCurrency(original)}
                        </span>
                      )}
                    </div>
                    {selected && (
                      <div className="advance-picker__apply-input-wrap">
                        <span className="advance-picker__apply-currency">₹</span>
                        <input
                          type="number"
                          className={`advance-picker__apply-input${
                            selEntry &&
                            (parseFloat(selEntry.applyAmount) || 0) > remaining
                              ? ' advance-picker__apply-input--error'
                              : ''
                          }`}
                          min={0.01}
                          max={remaining}
                          step={0.01}
                          value={selEntry?.applyAmount ?? ''}
                          onChange={(e) => updateApplyAmount(receipt.id, e.target.value)}
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            updateApplyAmount(
                              receipt.id,
                              Math.max(0.01, Math.min(val, remaining)),
                            );
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        );
      })}

      {/* Cross-customer add */}
      <div className="advance-picker__add-customer">
        {!showCustomerSearch ? (
          <button
            type="button"
            className="advance-picker__add-customer-btn"
            onClick={() => setShowCustomerSearch(true)}
          >
            + Use advance from another customer
          </button>
        ) : (
          <>
            <div className="advance-picker__customer-search">
              <input
                className="advance-picker__customer-search-input"
                placeholder="Search customer by name or phone..."
                value={customerSearchQuery}
                onChange={(e) => handleCustomerSearch(e.target.value)}
                autoFocus
              />
              <button
                type="button"
                className="advance-picker__action-btn"
                onClick={() => {
                  setShowCustomerSearch(false);
                  setCustomerSearchQuery('');
                  setCustomerSearchResults([]);
                }}
              >
                Cancel
              </button>
            </div>
            {customerSearchResults.length > 0 && (
              <div className="advance-picker__customer-results">
                {customerSearchResults.map((c) => {
                  const phone = getCustomerDisplayPhone(c);
                  return (
                    <div
                      key={c.id}
                      className="advance-picker__customer-result"
                      onClick={() => addCrossCustomer(c)}
                    >
                      <span className="advance-picker__customer-result-name">
                        {getCustomerDisplayName(c)}
                      </span>
                      {phone && (
                        <span className="advance-picker__customer-result-phone">{phone}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {customerSearching && (
              <div className="advance-picker__empty">Searching...</div>
            )}
          </>
        )}
      </div>

      {/* Summary */}
      {selectedAdvances.length > 0 && (
        <div className="advance-picker__summary">
          <span className="advance-picker__summary-label">
            Advance applied ({selectedAdvances.length} receipt{selectedAdvances.length !== 1 ? 's' : ''})
          </span>
          <span className="advance-picker__summary-amount">
            ₹{formatCurrency(totalAdvanceApplied)}
          </span>
        </div>
      )}

      {/* Warnings */}
      {isOverpaid && (
        <div className="advance-picker__warning">
          ⚠ Total payments (₹{formatCurrency(totalPaid)}) exceed the invoice total
          (₹{formatCurrency(invoiceTotal)}). Reduce the applied advance or direct payments.
        </div>
      )}
      {futureDateWarnings.length > 0 && (
        <div className="advance-picker__warning">
          ⚠ {futureDateWarnings.length} selected receipt(s) have a date after the invoice date
          ({invoiceDate}). These cannot be applied to an invoice dated before they were received.
        </div>
      )}
    </div>
  );
};

export default AdvanceReceiptPicker;

