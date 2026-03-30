import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardTemplate from '../../components/templates/DashboardTemplate/DashboardTemplate';
import Input from '../../components/atoms/Input/Input';
import Button from '../../components/atoms/Button/Button';
import AmountDisplay from '../../components/atoms/AmountDisplay/AmountDisplay';
import Toast from '../../components/atoms/Toast/Toast';
import { getCreditById, addPaymentTransaction } from '../../services/creditsService';
import './RecordPaymentPage.css';

const RecordPaymentPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [credit, setCredit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const [formData, setFormData] = useState({
    amount: '',
    paymentMethod: 'CASH',
    transactionDate: new Date().toISOString().split('T')[0],
    referenceNumber: '',
    collectedBy: '',
    notes: '',
  });

  useEffect(() => {
    loadCredit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadCredit = async () => {
    try {
      setLoading(true);
      setError(null);
      const creditData = await getCreditById(id);
      setCredit(creditData);
    } catch (err) {
      console.error('Error loading credit:', err);
      setError(err.message || 'Failed to load credit details');
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

      await addPaymentTransaction(id, paymentData);
      setToast({ type: 'success', message: 'Payment recorded successfully' });

      setTimeout(() => {
        navigate(`/credits/${id}`);
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

  if (loading) {
    return (
      <DashboardTemplate headerTitle="Record Payment" headerTabs={[]}>
        <div className="record-payment-page">
          <div className="record-payment-loading">Loading credit details...</div>
        </div>
      </DashboardTemplate>
    );
  }

  if (error || !credit) {
    return (
      <DashboardTemplate headerTitle="Record Payment" headerTabs={[]}>
        <div className="record-payment-page">
          <div className="record-payment-error">
            <p>{error || 'Credit not found'}</p>
            <Button variant="primary" onClick={() => navigate('/credits')}>
              Back to Credits
            </Button>
          </div>
        </div>
      </DashboardTemplate>
    );
  }

  const remainingAmount = parseFloat(credit.totalAmount) - parseFloat(credit.paidAmount || 0);

  return (
    <DashboardTemplate headerTitle="Record Payment" headerTabs={[]}>
      <div className="record-payment-page">
        {toast && (
          <Toast
            type={toast.type}
            message={toast.message}
            onClose={() => setToast(null)}
          />
        )}

        <div className="record-payment-header">
          <Button variant="ghost" size="small" onClick={() => navigate(`/credits/${id}`)}>
            ← Back
          </Button>
          <h1 className="record-payment-title">Record Payment</h1>
        </div>

        <div className="record-payment-content">
          <div className="record-payment-left">
            <div className="record-payment-credit-info">
              <h2 className="record-payment-section-title">Credit Information</h2>
              <div className="record-payment-info-grid">
                <div className="record-payment-info-item">
                  <span className="record-payment-info-label">Customer:</span>
                  <span className="record-payment-info-value">
                    {credit.customer?.name || 'Unknown'}
                  </span>
                </div>
                <div className="record-payment-info-item">
                  <span className="record-payment-info-label">Item:</span>
                  <span className="record-payment-info-value">
                    {credit.itemSummary || 'N/A'}
                  </span>
                </div>
                <div className="record-payment-info-item">
                  <span className="record-payment-info-label">Total Amount:</span>
                  <AmountDisplay value={credit.totalAmount} size="md" emphasis />
                </div>
                <div className="record-payment-info-item">
                  <span className="record-payment-info-label">Paid Amount:</span>
                  <AmountDisplay value={credit.paidAmount || 0} size="md" variant="positive" />
                </div>
                <div className="record-payment-info-item">
                  <span className="record-payment-info-label">Remaining:</span>
                  <AmountDisplay value={remainingAmount} size="lg" emphasis variant="negative" />
                </div>
              </div>
            </div>

            <form className="record-payment-form" onSubmit={handleSubmit}>
              <h2 className="record-payment-section-title">Payment Details</h2>
              <div className="record-payment-form-grid">
                <div className="record-payment-form-field">
                  <label className="record-payment-form-label">
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
                  <span className="record-payment-form-hint">
                    Maximum: <AmountDisplay value={remainingAmount} />
                  </span>
                </div>

                <div className="record-payment-form-field">
                  <label className="record-payment-form-label">
                    Payment Method <span className="required">*</span>
                  </label>
                  <select
                    className="record-payment-form-select"
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

                <div className="record-payment-form-field">
                  <label className="record-payment-form-label">Transaction Date</label>
                  <Input
                    type="date"
                    value={formData.transactionDate}
                    onChange={(e) => handleInputChange('transactionDate', e.target.value)}
                  />
                </div>

                {(formData.paymentMethod === 'UPI' || 
                  formData.paymentMethod === 'BANK_TRANSFER' || 
                  formData.paymentMethod === 'CHEQUE') && (
                  <div className="record-payment-form-field">
                    <label className="record-payment-form-label">Reference Number</label>
                    <Input
                      type="text"
                      placeholder="UPI ref, cheque number, etc."
                      value={formData.referenceNumber}
                      onChange={(e) => handleInputChange('referenceNumber', e.target.value)}
                    />
                  </div>
                )}

                <div className="record-payment-form-field">
                  <label className="record-payment-form-label">Collected By</label>
                  <Input
                    type="text"
                    placeholder="Staff name (optional)"
                    value={formData.collectedBy}
                    onChange={(e) => handleInputChange('collectedBy', e.target.value)}
                  />
                </div>

                <div className="record-payment-form-field record-payment-form-field-full">
                  <label className="record-payment-form-label">Notes</label>
                  <textarea
                    className="record-payment-form-textarea"
                    placeholder="Additional notes about this payment..."
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              <div className="record-payment-form-actions">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate(`/credits/${id}`)}
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
        </div>
      </div>
    </DashboardTemplate>
  );
};

export default RecordPaymentPage;
