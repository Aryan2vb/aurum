import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardTemplate from '../../components/templates/DashboardTemplate/DashboardTemplate';
import Input from '../../components/atoms/Input/Input';
import Button from '../../components/atoms/Button/Button';
import AmountDisplay from '../../components/atoms/AmountDisplay/AmountDisplay';
import Toast from '../../components/atoms/Toast/Toast';
import { getCreditById, getCreditTransactions, updatePaymentTransaction } from '../../services/creditsService';
import './EditPaymentPage.css';

const EditPaymentPage = () => {
  const { id, transactionId } = useParams();
  const navigate = useNavigate();
  const [credit, setCredit] = useState(null);
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const [formData, setFormData] = useState({
    amount: '',
    paymentMethod: 'CASH',
    transactionDate: '',
    referenceNumber: '',
    collectedBy: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, transactionId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [creditData, transactionsData] = await Promise.all([
        getCreditById(id),
        getCreditTransactions(id),
      ]);
      setCredit(creditData);
      
      const transactions = transactionsData.data || transactionsData || [];
      const foundPayment = transactions.find((t) => t.id === transactionId);
      
      if (!foundPayment) {
        setError('Payment not found');
        return;
      }
      
      setPayment(foundPayment);
      
      // Format date for input field (YYYY-MM-DD)
      const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
      };

      setFormData({
        amount: foundPayment.amount || '',
        paymentMethod: foundPayment.paymentMethod || 'CASH',
        transactionDate: formatDateForInput(foundPayment.transactionDate),
        referenceNumber: foundPayment.referenceNumber || '',
        collectedBy: foundPayment.collectedBy || '',
        notes: foundPayment.notes || '',
      });
    } catch (err) {
      console.error('Error loading payment:', err);
      setError(err.message || 'Failed to load payment details');
      setToast({ type: 'error', message: 'Failed to load payment details' });
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

    const currentPaymentAmount = parseFloat(payment.amount || 0);
    const newPaymentAmount = parseFloat(formData.amount);
    
    // Calculate what the new remaining would be
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

      await updatePaymentTransaction(id, transactionId, updateData);
      setToast({ type: 'success', message: 'Payment updated successfully' });

      setTimeout(() => {
        navigate(`/credits/${id}`);
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

  if (loading) {
    return (
      <DashboardTemplate headerTitle="Edit Payment" headerTabs={[]}>
        <div className="edit-payment-page">
          <div className="edit-payment-loading">Loading payment details...</div>
        </div>
      </DashboardTemplate>
    );
  }

  if (error || !credit || !payment) {
    return (
      <DashboardTemplate headerTitle="Edit Payment" headerTabs={[]}>
        <div className="edit-payment-page">
          <div className="edit-payment-error">
            <p>{error || 'Payment not found'}</p>
            <Button variant="primary" onClick={() => navigate(`/credits/${id}`)}>
              Back to Credit
            </Button>
          </div>
        </div>
      </DashboardTemplate>
    );
  }

  const remainingAmount = parseFloat(credit.totalAmount) - parseFloat(credit.paidAmount || 0);
  const currentPaymentAmount = parseFloat(payment.amount || 0);

  return (
    <DashboardTemplate headerTitle="Edit Payment" headerTabs={[]}>
      <div className="edit-payment-page">
        {toast && (
          <Toast
            type={toast.type}
            message={toast.message}
            onClose={() => setToast(null)}
          />
        )}

        <div className="edit-payment-header">
          <Button variant="ghost" size="small" onClick={() => navigate(`/credits/${id}`)}>
            ← Back
          </Button>
          <h1 className="edit-payment-title">Edit Payment</h1>
        </div>

        <div className="edit-payment-content">
          <div className="edit-payment-left">
            <div className="edit-payment-credit-info">
              <h2 className="edit-payment-section-title">Credit Information</h2>
              <div className="edit-payment-info-grid">
                <div className="edit-payment-info-item">
                  <span className="edit-payment-info-label">Customer:</span>
                  <span className="edit-payment-info-value">
                    {credit.customer?.name || 'Unknown'}
                  </span>
                </div>
                <div className="edit-payment-info-item">
                  <span className="edit-payment-info-label">Item:</span>
                  <span className="edit-payment-info-value">
                    {credit.itemSummary || 'N/A'}
                  </span>
                </div>
                <div className="edit-payment-info-item">
                  <span className="edit-payment-info-label">Total Amount:</span>
                  <AmountDisplay value={credit.totalAmount} size="md" emphasis />
                </div>
                <div className="edit-payment-info-item">
                  <span className="edit-payment-info-label">Paid Amount:</span>
                  <AmountDisplay value={credit.paidAmount || 0} size="md" variant="positive" />
                </div>
                <div className="edit-payment-info-item">
                  <span className="edit-payment-info-label">Remaining:</span>
                  <AmountDisplay value={remainingAmount} size="lg" emphasis variant="negative" />
                </div>
              </div>
            </div>

            <form className="edit-payment-form" onSubmit={handleSubmit}>
              <h2 className="edit-payment-section-title">Payment Details</h2>
              <div className="edit-payment-form-grid">
                <div className="edit-payment-form-field">
                  <label className="edit-payment-form-label">
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
                  <span className="edit-payment-form-hint">
                    Current: <AmountDisplay value={currentPaymentAmount} />
                  </span>
                </div>

                <div className="edit-payment-form-field">
                  <label className="edit-payment-form-label">
                    Payment Method <span className="required">*</span>
                  </label>
                  <select
                    className="edit-payment-form-select"
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

                <div className="edit-payment-form-field">
                  <label className="edit-payment-form-label">Transaction Date</label>
                  <Input
                    type="date"
                    value={formData.transactionDate}
                    onChange={(e) => handleInputChange('transactionDate', e.target.value)}
                  />
                </div>

                {(formData.paymentMethod === 'UPI' || 
                  formData.paymentMethod === 'BANK_TRANSFER' || 
                  formData.paymentMethod === 'CHEQUE') && (
                  <div className="edit-payment-form-field">
                    <label className="edit-payment-form-label">Reference Number</label>
                    <Input
                      type="text"
                      placeholder="UPI ref, cheque number, etc."
                      value={formData.referenceNumber}
                      onChange={(e) => handleInputChange('referenceNumber', e.target.value)}
                    />
                  </div>
                )}

                <div className="edit-payment-form-field">
                  <label className="edit-payment-form-label">Collected By</label>
                  <Input
                    type="text"
                    placeholder="Staff name (optional)"
                    value={formData.collectedBy}
                    onChange={(e) => handleInputChange('collectedBy', e.target.value)}
                  />
                </div>

                <div className="edit-payment-form-field edit-payment-form-field-full">
                  <label className="edit-payment-form-label">Notes</label>
                  <textarea
                    className="edit-payment-form-textarea"
                    placeholder="Additional notes about this payment..."
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              <div className="edit-payment-form-actions">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate(`/credits/${id}`)}
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
        </div>
      </div>
    </DashboardTemplate>
  );
};

export default EditPaymentPage;
