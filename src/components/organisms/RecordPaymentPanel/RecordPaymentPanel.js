import React, { useState, useEffect } from 'react';
import SlideOver from '../../atoms/SlideOver/SlideOver';
import Input from '../../atoms/Input/Input';
import Button from '../../atoms/Button/Button';
import AmountDisplay from '../../atoms/AmountDisplay/AmountDisplay';
import Toast from '../../atoms/Toast/Toast';
import { getCreditById, addPaymentTransaction } from '../../../services/creditsService';
import './RecordPaymentPanel.css';

const RecordPaymentPanel = ({
  isOpen,
  onClose,
  creditId,
  credit: creditProp, // Accept credit as prop to avoid unnecessary API call
  onSuccess,
}) => {
  const [credit, setCredit] = useState(creditProp || null);
  const [loading, setLoading] = useState(!creditProp);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const [formData, setFormData] = useState({
    amount: '',
    paymentMethod: 'CASH',
    transactionDate: new Date().toISOString().split('T')[0],
    referenceNumber: '',
    collectedBy: '',
    notes: '',
  });

  // Only fetch if credit is not provided as prop
  useEffect(() => {
    if (creditProp) {
      setCredit(creditProp);
      setLoading(false);
    } else if (creditId && isOpen && !creditProp) {
      loadCredit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creditId, isOpen, creditProp]);

  const loadCredit = async () => {
    try {
      setLoading(true);
      const creditData = await getCreditById(creditId);
      setCredit(creditData);
    } catch (err) {
      console.error('Error loading credit:', err);
      setToast({ type: 'error', message: 'Failed to load credit details' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setToast({ type: 'error', message: 'Please enter a valid payment amount' });
      return;
    }

    if (!credit) return;

    const remainingAmount = parseFloat(credit.totalAmount) - parseFloat(credit.paidAmount || 0);
    if (parseFloat(formData.amount) > remainingAmount) {
      setToast({ type: 'error', message: 'Payment amount cannot exceed remaining balance' });
      return;
    }

    try {
      setSaving(true);
      const paymentData = {
        amount: parseFloat(formData.amount),
        paymentMethod: formData.paymentMethod,
        ...(formData.transactionDate && { transactionDate: formData.transactionDate }),
        ...(formData.referenceNumber && { referenceNumber: formData.referenceNumber }),
        ...(formData.collectedBy && { collectedBy: formData.collectedBy }),
        ...(formData.notes && { notes: formData.notes }),
      };

      await addPaymentTransaction(creditId, paymentData);
      setToast({ type: 'success', message: 'Payment recorded successfully' });

      setTimeout(() => {
        onSuccess?.();
        onClose();
        // Reset form
        setFormData({
          amount: '',
          paymentMethod: 'CASH',
          transactionDate: new Date().toISOString().split('T')[0],
          referenceNumber: '',
          collectedBy: '',
          notes: '',
        });
      }, 1000);
    } catch (err) {
      console.error('Error recording payment:', err);
      setToast({
        type: 'error',
        message: err.message || 'Failed to record payment',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!credit && loading) {
    return (
      <SlideOver
        isOpen={isOpen}
        onClose={onClose}
        title="Record Payment"
        width={500}
      >
        <div className="record-payment-panel-loading">Loading credit details...</div>
      </SlideOver>
    );
  }

  if (!credit) return null;

  const remainingAmount = parseFloat(credit.totalAmount) - parseFloat(credit.paidAmount || 0);
  const customerName = credit.customer?.fullName || credit.customer?.name || 'Unknown';

  return (
    <SlideOver
      isOpen={isOpen}
      onClose={onClose}
      title="Record Payment"
      width={500}
    >
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <div className="record-payment-panel">
        <div className="record-payment-panel-credit-info">
          <h3 className="record-payment-panel-section-title">Credit Information</h3>
          <div className="record-payment-panel-info-grid">
            <div className="record-payment-panel-info-item">
              <span className="record-payment-panel-info-label">Customer:</span>
              <span className="record-payment-panel-info-value">{customerName}</span>
            </div>
            <div className="record-payment-panel-info-item">
              <span className="record-payment-panel-info-label">Item:</span>
              <span className="record-payment-panel-info-value">
                {credit.itemSummary || credit.description || 'N/A'}
              </span>
            </div>
            <div className="record-payment-panel-info-item">
              <span className="record-payment-panel-info-label">Total Amount:</span>
              <AmountDisplay value={credit.totalAmount} size="md" emphasis />
            </div>
            <div className="record-payment-panel-info-item">
              <span className="record-payment-panel-info-label">Paid Amount:</span>
              <AmountDisplay value={credit.paidAmount || 0} size="md" variant="positive" />
            </div>
            <div className="record-payment-panel-info-item">
              <span className="record-payment-panel-info-label">Remaining:</span>
              <AmountDisplay value={remainingAmount} size="lg" emphasis variant="negative" />
            </div>
          </div>
        </div>

        <form className="record-payment-panel-form" onSubmit={handleSubmit}>
          <h3 className="record-payment-panel-section-title">Payment Details</h3>
          <div className="record-payment-panel-form-grid">
            <div className="record-payment-panel-form-field">
              <label className="record-payment-panel-form-label">
                Amount <span className="required">*</span>
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="Enter payment amount"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                required
                min="0.01"
                max={remainingAmount}
              />
              <span className="record-payment-panel-form-hint">
                Maximum: <AmountDisplay value={remainingAmount} />
              </span>
            </div>

            <div className="record-payment-panel-form-field">
              <label className="record-payment-panel-form-label">
                Payment Method <span className="required">*</span>
              </label>
              <select
                className="record-payment-panel-form-select"
                value={formData.paymentMethod}
                onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                required
              >
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CARD">Card</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div className="record-payment-panel-form-field">
              <label className="record-payment-panel-form-label">Transaction Date</label>
              <Input
                type="date"
                value={formData.transactionDate}
                onChange={(e) => handleInputChange('transactionDate', e.target.value)}
              />
            </div>

            {(formData.paymentMethod === 'UPI' || 
              formData.paymentMethod === 'BANK_TRANSFER' || 
              formData.paymentMethod === 'CHEQUE') && (
              <div className="record-payment-panel-form-field">
                <label className="record-payment-panel-form-label">Reference Number</label>
                <Input
                  type="text"
                  placeholder="UPI ref, cheque number, etc."
                  value={formData.referenceNumber}
                  onChange={(e) => handleInputChange('referenceNumber', e.target.value)}
                />
              </div>
            )}

            <div className="record-payment-panel-form-field">
              <label className="record-payment-panel-form-label">Collected By</label>
              <Input
                type="text"
                placeholder="Staff name (optional)"
                value={formData.collectedBy}
                onChange={(e) => handleInputChange('collectedBy', e.target.value)}
              />
            </div>

            <div className="record-payment-panel-form-field record-payment-panel-form-field-full">
              <label className="record-payment-panel-form-label">Notes</label>
              <textarea
                className="record-payment-panel-form-textarea"
                placeholder="Additional notes about this payment..."
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <div className="record-payment-panel-form-actions">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Recording...' : 'Record Payment'}
            </Button>
          </div>
        </form>
      </div>
    </SlideOver>
  );
};

export default RecordPaymentPanel;
