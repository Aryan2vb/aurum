import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import SlideOver from '../../atoms/SlideOver/SlideOver';
import Icon from '../../atoms/Icon/Icon';
import StatusPill from '../../atoms/StatusPill/StatusPill';
import { getInvoiceById, getInvoiceHtmlUrl, getInvoiceViewToken, getNegotiationPreview, commitNegotiation, cancelInvoice } from '../../../services/invoicesService';
import './InvoiceDetailModal.css';

// Format currency
const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '—';
  return `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

const InvoiceDetailModal = ({ isOpen, onClose, invoiceId, onRecordPayment }) => {
  const navigate = useNavigate();
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
      }
    } catch (err) {
      setError('Failed to fetch invoice details');
      console.error('Failed to fetch invoice details', err);
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

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
                <button className="invoice-customer-name-btn" onClick={() => { onClose(); navigate(`/customers/${invoice.customerId}`); }}>
                  {invoice.buyerSnapshot?.name || invoice.customer?.fullName || 'N/A'}
                </button>
                <div className="invoice-customer-meta">{invoice.buyerSnapshot?.phone || invoice.customer?.contactDetails?.[0]?.primaryPhone || ''}</div>
                <div className="invoice-customer-meta">{invoice.buyerSnapshot?.address || ''}</div>
                <div className="invoice-customer-meta">{invoice.buyerSnapshot?.state || ''}{invoice.buyerSnapshot?.stateCode ? ` (${invoice.buyerSnapshot.stateCode})` : ''}</div>
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
                        <th>Metal</th>

                        <th>HSN</th>
                        <th>Qty</th>
                        <th>Net Wt.</th>
                        <th>Rate</th>
                        <th>Making</th>
                        <th>HUID</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.items.map((item, index) => (
                        <tr key={item.id || index}>
                          <td>{item.slNo || index + 1}</td>
                          <td>{item.description || '—'}{item.huid && <><br/><small>HUID: {item.huid}</small></>}</td>
                          <td>{item.metalType || '—'}</td>

                          <td>{item.hsnSac || '—'}</td>
                          <td>{item.quantity || 1}</td>
                          <td>{item.netWeight ? `${item.netWeight}g` : '—'}</td>
                          <td>{formatCurrency(item.effectiveRate || item.unitPrice)}</td>
                          <td>{formatCurrency(item.makingChargesAmount || item.makingCharges)}</td>
                          <td>{item.huid || '—'}</td>
                          <td className="amount-cell">{formatCurrency(item.taxableAmount || item.totalAmount)}</td>
                        </tr>
                      ))}
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
                  <span>{formatCurrency(invoice.paidAmount)}</span>
                </div>
                <div className="summary-row balance">
                  <span>Balance:</span>
                  <span>{formatCurrency(invoice.remainingBalance)}</span>
                </div>
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
                        <th className="amount-header">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.payments.map((p, i) => (
                        <tr key={p.id || i}>
                          <td>{formatDate(p.createdAt)}</td>
                          <td><span className="payment-mode-tag">{p.mode}</span></td>
                          <td>{p.reference || '—'}</td>
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

              {invoice.status !== 'CANCELLED' && (
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
              
              {(invoice.status === 'UNPAID' || invoice.status === 'PARTIAL') && (
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

              {invoice.status !== 'CANCELLED' && (
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
