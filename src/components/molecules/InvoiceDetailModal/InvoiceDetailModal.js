import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import SlideOver from '../../atoms/SlideOver/SlideOver';
import Icon from '../../atoms/Icon/Icon';
import StatusPill from '../../atoms/StatusPill/StatusPill';
import { getInvoiceById, getInvoiceHtmlUrl, getInvoiceViewToken, getNegotiationPreview, commitNegotiation, cancelInvoice } from '../../../services/invoicesService';
import { applyAdvanceToInvoice, getAdvanceBalance } from '../../../services/advanceService';
import { formatAadhaarNumber } from '../../../utils/customerKyc';
import { usePermission } from '../../../hooks/usePermission';
import './InvoiceDetailModal.css';

// Format currency
const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '—';
  return `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatMetalRate = (amount) => {
  if (amount === undefined || amount === null) return '—';
  return `₹${Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

// Format date
const formatDate = (dateString) => {
  if (!dateString) return '—';
  try {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
};

const formatCustomerAddress = (location) => {
  if (!location) return '';
  return [
    location.address,
    location.village,
    location.tehsil,
    location.district,
    location.state,
  ].filter(Boolean).join(', ');
};

const InvoiceDetailModal = ({ isOpen, onClose, invoiceId, onRecordPayment }) => {
  const navigate = useNavigate();
  const { can } = usePermission();
  const canWrite = can('write');
  const canDelete = can('delete');
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Negotiation state
  const [showNegotiate, setShowNegotiate] = useState(false);
  const [targetAmount, setTargetAmount] = useState('');
  const [negotiationNote, setNegotiationNote] = useState('');
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [commitLoading, setCommitLoading] = useState(false);
  const [negotiateError, setNegotiateError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [negotiationMode, setNegotiationMode] = useState('MAKING_CHARGES');
  const [filterMetalType, setFilterMetalType] = useState('ALL');

  // Advance application state
  const [advanceBalance, setAdvanceBalance] = useState(null);
  const [applyAdvanceAmount, setApplyAdvanceAmount] = useState('');
  const [showApplyAdvance, setShowApplyAdvance] = useState(false);
  const [applyingAdvance, setApplyingAdvance] = useState(false);
  const [applyAdvanceError, setApplyAdvanceError] = useState(null);

  const handlePreview = async () => {
    if (!targetAmount) return;
    try {
      setPreviewLoading(true);
      setNegotiateError(null);
      const result = await getNegotiationPreview(
        invoiceId, 
        parseFloat(targetAmount),
        negotiationMode,
        filterMetalType === 'ALL' ? null : filterMetalType
      );
      setPreview(result);
    } catch (e) {
      setNegotiateError(e.message || 'Preview failed');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!preview) return;
    try {
      setCommitLoading(true);
      setNegotiateError(null);
      await commitNegotiation(
        invoiceId, 
        parseFloat(targetAmount), 
        negotiationNote,
        negotiationMode,
        filterMetalType === 'ALL' ? null : filterMetalType
      );
      setShowNegotiate(false);
      setPreview(null);
      setTargetAmount('');
      setNegotiationNote('');
      fetchInvoiceDetails();
    } catch (e) {
      setNegotiateError(e.message || 'Commit failed');
    } finally {
      setCommitLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Cancel this invoice? This cannot be undone.')) return;
    try {
      setDeleting(true);
      await cancelInvoice(invoiceId);
      onClose();
    } catch (e) {
      alert(e.message || 'Failed to cancel invoice');
    } finally {
      setDeleting(false);
    }
  };

  const fetchInvoiceDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getInvoiceById(invoiceId);
      if (response) {
        setInvoice(response);
        // Load advance balance for the invoice's customer
        try {
          const bal = await getAdvanceBalance(response.customerId);
          setAdvanceBalance(parseFloat(bal?.availableAdvance || 0));
        } catch {
          setAdvanceBalance(0);
        }
      }
    } catch (err) {
      setError('Failed to fetch invoice details');
      console.error('Failed to fetch invoice details', err);
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  const handleApplyAdvance = async () => {
    const amount = parseFloat(applyAdvanceAmount);
    if (!amount || amount <= 0) {
      setApplyAdvanceError('Enter a valid amount');
      return;
    }
    try {
      setApplyingAdvance(true);
      setApplyAdvanceError(null);
      await applyAdvanceToInvoice(invoiceId, { amount });
      setShowApplyAdvance(false);
      setApplyAdvanceAmount('');
      await fetchInvoiceDetails();
    } catch (err) {
      setApplyAdvanceError(err.message || 'Failed to apply advance');
    } finally {
      setApplyingAdvance(false);
    }
  };

  useEffect(() => {
    if (isOpen && invoiceId) {
      fetchInvoiceDetails();
    }
  }, [isOpen, invoiceId, fetchInvoiceDetails]);

  const handleViewHtml = async () => {
    try {
      const response = await getInvoiceViewToken(invoiceId);
      if (response && response.signature) {
        const url = getInvoiceHtmlUrl(invoiceId, response.signature);
        window.open(url, '_blank');
      } else {
        alert('Failed to generate secure view link');
      }
    } catch (error) {
      console.error('Failed to view invoice', error);
    }
  };

  if (!isOpen) return null;

  const buyer = invoice?.buyerSnapshot?.data || invoice?.buyerSnapshot || {};
  const customerAddress = buyer.address || formatCustomerAddress(invoice?.customer?.locations?.[0]);
  const customerState = buyer.state || invoice?.customer?.locations?.[0]?.state || '';
  const customerStateCode = buyer.stateCode || invoice?.customer?.locations?.[0]?.stateCode || '';

  return (
    <SlideOver
      isOpen={isOpen}
      onClose={onClose}
      title={invoice?.invoiceNumber || 'Invoice Details'}
      width={800}
    >
      <div className="invoice-detail-modal">
        {loading ? (
          <div className="invoice-detail-loading">
            <div className="loading-spinner"></div>
            <p>Loading invoice details...</p>
          </div>
        ) : error ? (
          <div className="invoice-detail-error">
            <Icon name="close" size={24} />
            <p>{error}</p>
            <button onClick={fetchInvoiceDetails} className="retry-btn">
              Retry
            </button>
          </div>
        ) : invoice ? (
          <div className="invoice-detail-content">
            {/* Header: customer left, meta right */}
            <div className="invoice-top-row">
              <div className="invoice-top-customer">
                <button className="invoice-customer-name-btn" onClick={() => { onClose(); navigate(`/customers/${invoice.customerId}?tab=invoices`); }}>
                  {buyer.name || invoice.customer?.fullName || 'N/A'}
                </button>
                <div className="invoice-customer-meta">{buyer.phone || invoice.customer?.contactDetails?.[0]?.primaryPhone || ''}</div>
                {customerAddress && <div className="invoice-customer-meta">{customerAddress}</div>}
                {(customerState || customerStateCode) && (
                  <div className="invoice-customer-meta">
                    {customerState}{customerStateCode ? ` (${customerStateCode})` : ''}
                  </div>
                )}
                {invoice.customer?.documents?.map((doc, idx) => (
                  <React.Fragment key={doc.id || idx}>
                    {doc.aadharNumber && (
                      <div className="invoice-customer-meta" style={{ marginTop: '4px' }}>
                        <strong>Aadhaar:</strong> {formatAadhaarNumber(doc.aadharNumber)}
                        {doc.aadharVerified && <span style={{ color: 'var(--success)', marginLeft: '4px' }}>✓</span>}
                      </div>
                    )}
                    {doc.panNumber && (
                      <div className="invoice-customer-meta">
                        <strong>PAN:</strong> {doc.panNumber}
                        {doc.panVerified && <span style={{ color: 'var(--success)', marginLeft: '4px' }}>✓</span>}
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
              
              <div className="invoice-top-meta">
                <StatusPill status={invoice.status} />
                <div className="invoice-meta-row"><span>Invoice</span><span>{invoice.invoiceNumber || '—'}</span></div>
                <div className="invoice-meta-row"><span>Date</span><span>{formatDate(invoice.invoiceDate)}</span></div>
                <div className="invoice-meta-row"><span>FY</span><span>{invoice.financialYear || '—'}</span></div>
              </div>
            </div>

            

            {/* Items Table */}
            {invoice.items && invoice.items.length > 0 && (
              <div className="invoice-section">
                <h3 className="section-title">
                  <Icon name="list" size={16} />
                  Items ({invoice.items.length})
                </h3>
                <div className="items-table-wrapper">
                  <table className="items-table">
                    <thead>
                      <tr>
                        <th>S.N</th>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Gross</th>
                        <th>Stone Wt</th>
                        <th>Net Wt.</th>
                        <th>Metal Rate</th>
                        <th>Making (Type)</th>
                        <th>Making Amt</th>
                        <th>Stone ₹</th>
                        <th>HM ₹</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.items.map((item, index) => {
                        const effectiveRate = item.effectiveRate || item.unitPrice || item.metalRate;
                        const netWeight = item.netWeight != null
                          ? item.netWeight
                          : (item.grossWeight != null && item.stoneWeight != null
                            ? item.grossWeight - item.stoneWeight
                            : null);
                        const makingChargesAmount = item.makingChargesAmount != null
                          ? item.makingChargesAmount
                          : (item.makingChargesType === 'PERCENTAGE_ON_METAL'
                            ? (effectiveRate && netWeight ? (item.makingCharges / 100) * effectiveRate * netWeight : null)
                            : item.makingChargesType === 'PER_GRAM'
                              ? (netWeight != null ? item.makingCharges * netWeight : null)
                              : item.makingCharges);

                        return (
                          <tr key={item.id || index}>
                            <td>{item.slNo || index + 1}</td>
                            <td>
                              {item.description || '—'}
                              {item.huid && <><br/><small className="huid-tag">HUID: {item.huid}</small></>}
                            </td>
                            <td>{item.quantity || 1}</td>
                            <td>{item.grossWeight ? `${item.grossWeight}g` : '—'}</td>
                            <td>{item.stoneWeight ? `${item.stoneWeight}g` : '—'}</td>
                            <td>{netWeight != null ? `${netWeight}g` : '—'}</td>
                            <td>{formatMetalRate(effectiveRate)}</td>
                            <td className="making-cell">
                              {item.makingChargesType === 'PERCENTAGE_ON_METAL'
                                ? `${item.makingCharges}%`
                                : formatCurrency(item.makingCharges)
                              }
                              <div className="making-type">
                                ({item.makingChargesType === 'PERCENTAGE_ON_METAL' ? '%' : item.makingChargesType === 'PER_GRAM' ? '/gm' : 'FLAT'})
                              </div>
                            </td>
                            <td>{formatCurrency(makingChargesAmount)}</td>
                            <td>{formatCurrency(item.stoneCharges)}</td>
                            <td>{formatCurrency(item.hallmarkingCharge)}</td>
                            <td className="amount-cell">{formatCurrency(item.taxableAmount || item.totalAmount)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Financial Summary */}
            <div className="invoice-section">
              <h3 className="section-title">
                <Icon name="analytics" size={16} />
                Financial Summary
              </h3>
              <div className="financial-summary">
                <div className="summary-row">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(invoice.subtotal)}</span>
                </div>
                <div className="summary-row">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(invoice.subtotal)}</span>
                </div>
                {Number(invoice.totalHallmarkingCharges) > 0 && (
                  <div className="summary-row">
                    <span>Hallmarking:</span>
                    <span>{formatCurrency(invoice.totalHallmarkingCharges)}</span>
                  </div>
                )}
                {invoice.items && invoice.items.reduce((sum, item) => sum + (parseFloat(item.stoneCharges) || 0), 0) > 0 && (
                  <div className="summary-row">
                    <span>Stone Charges:</span>
                    <span>{formatCurrency(invoice.items.reduce((sum, item) => sum + (parseFloat(item.stoneCharges) || 0), 0))}</span>
                  </div>
                )}
                <div className="summary-row">
                  <span>CGST ({invoice.cgstRate}%):</span>
                  <span>{formatCurrency(invoice.cgstAmount)}</span>
                </div>
                <div className="summary-row">
                  <span>SGST ({invoice.sgstRate}%):</span>
                  <span>{formatCurrency(invoice.sgstAmount)}</span>
                </div>
                {Number(invoice.igstAmount) > 0 && (
                  <div className="summary-row">
                    <span>IGST ({invoice.igstRate}%):</span>
                    <span>{formatCurrency(invoice.igstAmount)}</span>
                  </div>
                )}
                <div className="summary-row">
                  <span>Round Off:</span>
                  <span>{Number(invoice.roundOff).toFixed(2)}</span>
                </div>
                <div className="summary-row total">
                  <span>Total Amount:</span>
                  <span>{formatCurrency(invoice.totalAmount)}</span>
                </div>
                <div className="summary-row paid">
                  <span>Paid Amount:</span>
                  <span>
                    {formatCurrency(
                      Number(invoice.paidAmount || 0) - Number(invoice.advanceAdjustedAmount || 0),
                    )}
                  </span>
                </div>
                {Number(invoice.advanceAdjustedAmount) > 0 && (
                  <div className="summary-row" style={{ color: 'var(--color-status-paid)' }}>
                    <span>Advance Applied:</span>
                    <span>{formatCurrency(invoice.advanceAdjustedAmount)}</span>
                  </div>
                )}
                <div className="summary-row balance">
                  <span>Balance:</span>
                  <span>{formatCurrency(invoice.remainingPayable ?? invoice.remainingBalance)}</span>
                </div>

                {/* Apply Advance inline widget */}
                {canWrite && ['UNPAID', 'PARTIAL'].includes(invoice.status) && advanceBalance > 0 && (
                  <div className="advance-apply-section">
                    {!showApplyAdvance ? (
                      <button
                        className="advance-apply-trigger"
                        onClick={() => { setShowApplyAdvance(true); setApplyAdvanceError(null); }}
                      >
                        <Icon name="add" size={14} />
                        Apply Advance Balance ({formatCurrency(advanceBalance)} available)
                      </button>
                    ) : (
                      <div className="advance-apply-form">
                        <div className="advance-apply-row">
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            max={Math.min(advanceBalance, parseFloat(invoice.remainingPayable ?? invoice.remainingBalance ?? 0))}
                            className="advance-apply-input"
                            placeholder="Amount to apply"
                            value={applyAdvanceAmount}
                            onChange={(e) => setApplyAdvanceAmount(e.target.value)}
                          />
                          <button
                            className="advance-apply-btn advance-apply-btn-primary"
                            onClick={handleApplyAdvance}
                            disabled={applyingAdvance}
                          >
                            {applyingAdvance ? 'Applying…' : 'Apply'}
                          </button>
                          <button
                            className="advance-apply-btn advance-apply-btn-ghost"
                            onClick={() => { setShowApplyAdvance(false); setApplyAdvanceAmount(''); setApplyAdvanceError(null); }}
                            disabled={applyingAdvance}
                          >
                            Cancel
                          </button>
                        </div>
                        {applyAdvanceError && (
                          <p className="advance-apply-error">{applyAdvanceError}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Payment Info */}
            <div className="invoice-section">
              <h3 className="section-title">
                <Icon name="credit" size={16} />
                Payment Breakdown
              </h3>
              {invoice.payments?.length > 0 ? (
                <div className="payments-table-wrapper">
                  <table className="payments-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Method</th>
                        <th>Reference</th>
                        <th>Bank</th>
                        <th className="amount-header">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.payments.map((p, i) => (
                        <tr key={p.id || i}>
                          <td>{formatDate(p.paidAt || p.createdAt)}</td>
                          <td><span className="payment-mode-tag">{p.mode}</span></td>
                          <td>{p.reference || '—'}</td>
                          <td>
                            {p.bankMatched ? (
                              <span
                                className="bank-matched-badge"
                                title={
                                  p.bankMatch
                                    ? `Matched ${String(p.bankMatch.txnDate || '').slice(0, 10)}`
                                      + (p.bankMatch.refNumber ? ` · ${p.bankMatch.refNumber}` : '')
                                      + (p.bankMatch.narration ? ` · ${p.bankMatch.narration}` : '')
                                    : 'Matched to bank statement'
                                }
                              >
                                Bank matched
                              </span>
                            ) : (
                              <span className="bank-unmatched-label">—</span>
                            )}
                          </td>
                          <td className="amount-cell">{formatCurrency(p.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="payment-info">
                  <div className="detail-row">
                    <span className="detail-label">Payment Mode:</span>
                    <span className="detail-value">{invoice.modeOfPayment || 'N/A'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Udhar Entries */}
            {invoice.udharEntries?.length > 0 && (
              <div className="invoice-section">
                <h3 className="section-title"><Icon name="udhar" size={16} /> Udhar Created</h3>
                {invoice.udharEntries.map(u => (
                  <div key={u.id} className="detail-row">
                    <span className="detail-label">Outstanding</span>
                    <span className="detail-value">{formatCurrency(u.amount)} — {u.status}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Negotiation Panel */}
            {!invoice.isNegotiated && (invoice.status === 'DRAFT' || invoice.status === 'CONFIRMED') && (
              <div className="invoice-section">
                <div className="negotiate-header" onClick={() => { setShowNegotiate(v => !v); setPreview(null); setNegotiateError(null); }}>
                  <h3 className="section-title" style={{ margin: 0 }}>
                    <Icon name="edit" size={16} /> Negotiate Price
                  </h3>
                  <Icon name={showNegotiate ? 'chevronUp' : 'chevronDown'} size={16} />
                </div>
                {showNegotiate && (
                  <div className="negotiate-body">
                    <p className="negotiate-hint">Original: {formatCurrency(invoice.totalAmount)}</p>
                    <div className="negotiate-modes">
                      <button 
                        className={`mode-tab ${negotiationMode === 'MAKING_CHARGES' ? 'active' : ''}`}
                        onClick={() => { setNegotiationMode('MAKING_CHARGES'); setPreview(null); }}
                      >
                        Reduce Making
                      </button>
                      <button 
                        className={`mode-tab ${negotiationMode === 'METAL_RATE' ? 'active' : ''}`}
                        onClick={() => { setNegotiationMode('METAL_RATE'); setPreview(null); }}
                      >
                        Reduce Metal Rate
                      </button>
                    </div>

                    {negotiationMode === 'METAL_RATE' && (
                      <div className="negotiate-filters">
                        <select 
                          className="negotiate-select"
                          value={filterMetalType}
                          onChange={(e) => { setFilterMetalType(e.target.value); setPreview(null); }}
                        >
                          <option value="ALL">All Metals</option>
                          <option value="GOLD">Gold Only</option>
                          <option value="SILVER">Silver Only</option>
                        </select>
                      </div>
                    )}

                    <div className="negotiate-row">
                      <input
                        type="number"
                        className="negotiate-input"
                        placeholder="Target amount (₹)"
                        value={targetAmount}
                        onChange={e => { setTargetAmount(e.target.value); setPreview(null); }}
                      />
                      <button className="negotiate-preview-btn" onClick={handlePreview} disabled={previewLoading}>
                        {previewLoading ? 'Loading…' : 'Preview'}
                      </button>
                    </div>
                    {negotiateError && <p className="negotiate-error">{negotiateError}</p>}
                    {preview && (
                      <div className="negotiate-preview">
                        {!preview.feasible && (
                          <p className="negotiate-error">
                            Not feasible — target too low to achieve with current reductions.
                          </p>
                        )}
                        <div className="negotiate-preview-row"><span>Required Taxable</span><span>{formatCurrency(preview.requiredTaxableAmount)}</span></div>
                        {negotiationMode === 'MAKING_CHARGES' ? (
                          <div className="negotiate-preview-row"><span>Making Reduction</span><span>- {formatCurrency(preview.totalMakingReduction)}</span></div>
                        ) : (
                          <div className="negotiate-preview-row"><span>Metal Rate Reduction</span><span>- {formatCurrency(preview.totalMetalReduction)}</span></div>
                        )}
                        <div className="negotiate-preview-row negotiate-preview-total"><span>New Total</span><span>{formatCurrency(preview.newGrandTotal)}</span></div>
                        {preview.items?.map(item => (
                          <div key={item.id} className="negotiate-item-row">
                            <span className="negotiate-item-desc">{item.description}</span>
                            {negotiationMode === 'MAKING_CHARGES' ? (
                              <span>{formatCurrency(item.originalMakingChargesAmt)} → {formatCurrency(item.newMakingChargesAmt)}</span>
                            ) : (
                              <span>{formatCurrency(item.originalEffectiveRate)} → {formatCurrency(item.newEffectiveRate)} /gm</span>
                            )}
                          </div>
                        ))}
                        {preview.feasible && (
                          <>
                            <input
                              type="text"
                              className="negotiate-input"
                              placeholder="Reason / note (optional)"
                              value={negotiationNote}
                              onChange={e => setNegotiationNote(e.target.value)}
                              style={{ marginTop: '0.5rem' }}
                            />
                            <button className="negotiate-commit-btn" onClick={handleCommit} disabled={commitLoading}>
                              {commitLoading ? 'Committing…' : 'Confirm Negotiation'}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {invoice.isNegotiated && (
              <div className="invoice-section negotiate-done">
                <Icon name="checkCircle" size={16} color="var(--success)" />
                <span>Price negotiated — original {formatCurrency(invoice.originalGrandTotal)}, final {formatCurrency(invoice.totalAmount)}</span>
                {invoice.negotiationNote && <p className="negotiate-note">"{invoice.negotiationNote}"</p>}
              </div>
            )}

            {/* Actions */}
            <div className="invoice-actions">
              <button className="action-btn primary" onClick={handleViewHtml}>
                <Icon name="eye" size={16} />
                View Invoice
              </button>

              {canWrite && invoice.status !== 'CANCELLED' && (
                <button 
                  className="action-btn secondary" 
                  onClick={() => {
                    onClose();
                    navigate(`/invoices/edit/${invoice.id}`);
                  }}
                >
                  <Icon name="edit" size={16} />
                  Edit Invoice
                </button>
              )}
              
              {canWrite && (invoice.status === 'UNPAID' || invoice.status === 'PARTIAL') && (
                <button 
                  className="action-btn payment" 
                  style={{ backgroundColor: '#059669', color: 'white' }}
                  onClick={() => {
                    onClose();
                    onRecordPayment?.(invoice);
                  }}
                >
                  <Icon name="payment" size={16} />
                  Record Payment
                </button>
              )}

              {canDelete && invoice.status !== 'CANCELLED' && (
                <button className="action-btn danger" onClick={handleDelete} disabled={deleting}>
                  <Icon name="close" size={16} />
                  {deleting ? 'Cancelling…' : 'Cancel Invoice'}
                </button>
              )}
              <button className="action-btn secondary" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </SlideOver>
  );
};

export default InvoiceDetailModal;
