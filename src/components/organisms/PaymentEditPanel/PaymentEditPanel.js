import React, { useState, useEffect } from 'react';
import SlideOver from '../../atoms/SlideOver/SlideOver';
import Input from '../../atoms/Input/Input';
import Button from '../../atoms/Button/Button';
import AmountDisplay from '../../atoms/AmountDisplay/AmountDisplay';
import Toast from '../../atoms/Toast/Toast';
import { updatePaymentTransaction } from '../../../services/creditsService';
import './PaymentEditPanel.css';

const PaymentEditPanel = ({
  isOpen,
  onClose,
  credit,
  payment,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    amount: '',
    paymentMethod: 'CASH',
    transactionDate: '',
    referenceNumber: '',
    collectedBy: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (payment && isOpen) {
      const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
      };

      setFormData({
        amount: payment.amount || '',
        paymentMethod: payment.paymentMethod || 'CASH',
        transactionDate: formatDateForInput(payment.transactionDate),
        referenceNumber: payment.referenceNumber || '',
        collectedBy: payment.collectedBy || '',
        notes: payment.notes || '',
      });
    }
  }, [payment, isOpen]);

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

    const currentPaymentAmount = parseFloat(payment.amount || 0);
    const newPaymentAmount = parseFloat(formData.amount);
    
    const newPaidAmount = parseFloat(credit.paidAmount || 0) - currentPaymentAmount + newPaymentAmount;
    
    if (newPaidAmount > parseFloat(credit.totalAmount)) {
      setToast({ type: 'error', message: 'Updated payment amount would exceed total credit amount' });
      return;
    }

    try {
      setSaving(true);
      const updateData = {
        amount: parseFloat(formData.amount),
        paymentMethod: formData.paymentMethod,
        ...(formData.transactionDate && { transactionDate: formData.transactionDate }),
        ...(formData.referenceNumber && { referenceNumber: formData.referenceNumber }),
        ...(formData.collectedBy && { collectedBy: formData.collectedBy }),
        ...(formData.notes !== undefined && { notes: formData.notes }),
      };

      await updatePaymentTransaction(credit.id, payment.id, updateData);
      setToast({ type: 'success', message: 'Payment updated successfully' });

      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Error updating payment:', err);
      setToast({
        type: 'error',
        message: err.message || 'Failed to update payment',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!payment || !credit) return null;

  const remainingAmount = parseFloat(credit.totalAmount) - parseFloat(credit.paidAmount || 0);
  const currentPaymentAmount = parseFloat(payment.amount || 0);

  return (
    <SlideOver
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Payment"
      width={500}
    >
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <div className="payment-edit-panel">
        <div className="payment-edit-credit-info">
          <h3 className="payment-edit-section-title">Credit Information</h3>
          <div className="payment-edit-info-grid">
            <div className="payment-edit-info-item">
              <span className="payment-edit-info-label">Customer:</span>
              <span className="payment-edit-info-value">
                {credit.customer?.fullName || credit.customer?.name || 'Unknown'}
              </span>
            </div>
            <div className="payment-edit-info-item">
              <span className="payment-edit-info-label">Item:</span>
              <span className="payment-edit-info-value">
                {credit.itemSummary || credit.description || 'N/A'}
              </span>
            </div>
            <div className="payment-edit-info-item">
              <span className="payment-edit-info-label">Total Amount:</span>
              <AmountDisplay value={credit.totalAmount} size="md" emphasis />
            </div>
            <div className="payment-edit-info-item">
              <span className="payment-edit-info-label">Paid Amount:</span>
              <AmountDisplay value={credit.paidAmount || 0} size="md" variant="positive" />
            </div>
            <div className="payment-edit-info-item">
              <span className="payment-edit-info-label">Remaining:</span>
              <AmountDisplay value={remainingAmount} size="lg" emphasis variant="negative" />
            </div>
          </div>
        </div>

        <form className="payment-edit-form" onSubmit={handleSubmit}>
          <h3 className="payment-edit-section-title">Payment Details</h3>
          <div className="payment-edit-form-grid">
            <div className="payment-edit-form-field">
              <label className="payment-edit-form-label">
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
              />
              <span className="payment-edit-form-hint">
                Current: <AmountDisplay value={currentPaymentAmount} />
              </span>
            </div>

            <div className="payment-edit-form-field">
              <label className="payment-edit-form-label">
                Payment Method <span className="required">*</span>
              </label>
              <select
                className="payment-edit-form-select"
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

            <div className="payment-edit-form-field">
              <label className="payment-edit-form-label">Transaction Date</label>
              <Input
                type="date"
                value={formData.transactionDate}
                onChange={(e) => handleInputChange('transactionDate', e.target.value)}
              />
            </div>

            {(formData.paymentMethod === 'UPI' || 
              formData.paymentMethod === 'BANK_TRANSFER' || 
              formData.paymentMethod === 'CHEQUE') && (
              <div className="payment-edit-form-field">
                <label className="payment-edit-form-label">Reference Number</label>
                <Input
                  type="text"
                  placeholder="UPI ref, cheque number, etc."
                  value={formData.referenceNumber}
                  onChange={(e) => handleInputChange('referenceNumber', e.target.value)}
                />
              </div>
            )}

            <div className="payment-edit-form-field">
              <label className="payment-edit-form-label">Collected By</label>
              <Input
                type="text"
                placeholder="Staff name (optional)"
                value={formData.collectedBy}
                onChange={(e) => handleInputChange('collectedBy', e.target.value)}
              />
            </div>

            <div className="payment-edit-form-field payment-edit-form-field-full">
              <label className="payment-edit-form-label">Notes</label>
              <textarea
                className="payment-edit-form-textarea"
                placeholder="Additional notes about this payment..."
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <div className="payment-edit-form-actions">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </SlideOver>
  );
};

export default PaymentEditPanel;
