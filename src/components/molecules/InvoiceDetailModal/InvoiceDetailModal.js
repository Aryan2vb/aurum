import React, { useState, useEffect } from 'react';
import SlideOver from '../../atoms/SlideOver/SlideOver';
import Icon from '../../atoms/Icon/Icon';
import { getInvoiceById, getInvoiceHtmlUrl, getInvoiceViewToken } from '../../../services/invoicesService';
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

const InvoiceDetailModal = ({ isOpen, onClose, invoiceId }) => {
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && invoiceId) {
      fetchInvoiceDetails();
    }
  }, [isOpen, invoiceId]);

  const fetchInvoiceDetails = async () => {
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
  };

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
            {/* Invoice Header Info */}
            <div className="invoice-header-section">
              <div className="invoice-meta-grid">
                <div className="meta-item">
                  <span className="meta-label">Invoice No.</span>
                  <span className="meta-value">{invoice.invoiceNumber}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Date</span>
                  <span className="meta-value">{formatDate(invoice.invoiceDate)}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Status</span>
                  <span className={`status-badge ${invoice.status?.toLowerCase()}`}>
                    {invoice.status}
                  </span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Financial Year</span>
                  <span className="meta-value">{invoice.financialYear}</span>
                </div>
              </div>
            </div>

            {/* Customer Details */}
            <div className="invoice-section">
              <h3 className="section-title">
                <Icon name="customer" size={16} />
                Customer Details
              </h3>
              <div className="customer-details">
                <div className="detail-row">
                  <span className="detail-label">Name:</span>
                  <span className="detail-value">
                    {invoice.buyerSnapshot?.data?.name || invoice.customer?.fullName || 'N/A'}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Phone:</span>
                  <span className="detail-value">
                    {invoice.buyerSnapshot?.data?.phone || 'N/A'}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Address:</span>
                  <span className="detail-value">
                    {invoice.buyerSnapshot?.data?.address || 'N/A'}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">GST No.:</span>
                  <span className="detail-value">
                    {invoice.buyerSnapshot?.data?.gstin || invoice.customer?.gstin || 'N/A'}
                  </span>
                </div>
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
                        <th>Purity</th>
                        <th>HSN</th>
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
                          <td>{index + 1}</td>
                          <td>{item.description || '—'}</td>
                          <td>{item.type || '—'}</td>
                          <td>{item.purity || '—'}</td>
                          <td>{item.hsnSac || '—'}</td>
                          <td>{item.netWeight ? `${item.netWeight}g` : '—'}</td>
                          <td>{formatCurrency(item.rate)}</td>
                          <td>{formatCurrency(item.makingCharges)}</td>
                          <td>{item.huid || '—'}</td>
                          <td className="amount-cell">{formatCurrency(item.amount)}</td>
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
                Payment Information
              </h3>
              <div className="payment-info">
                <div className="detail-row">
                  <span className="detail-label">Payment Mode:</span>
                  <span className="detail-value">{invoice.modeOfPayment || 'N/A'}</span>
                </div>
                {invoice.companySnapshot?.data?.bankDetails?.bankName && (
                  <div className="detail-row">
                    <span className="detail-label">Bank:</span>
                    <span className="detail-value">
                      {invoice.companySnapshot.data.bankDetails.bankName}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="invoice-actions">
              <button className="action-btn primary" onClick={handleViewHtml}>
                <Icon name="eye" size={16} />
                View Invoice
              </button>
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
