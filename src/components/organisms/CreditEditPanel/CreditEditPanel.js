import React, { useState, useEffect } from 'react';
import SlideOver from '../../atoms/SlideOver/SlideOver';
import Input from '../../atoms/Input/Input';
import Button from '../../atoms/Button/Button';
import Toast from '../../atoms/Toast/Toast';
import { getCreditById, updateCredit } from '../../../services/creditsService';
import './CreditEditPanel.css';

const CreditEditPanel = ({
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
    saleReference: '',
    itemSummary: '',
    description: '',
    creditDate: '',
    expectedDueDate: '',
    reminderFrequency: 'WEEKLY',
    notes: '',
    totalAmount: '',
  });

  // Only fetch if credit is not provided as prop
  useEffect(() => {
    if (creditProp) {
      setCredit(creditProp);
      setLoading(false);
      
      const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
      };

      setFormData({
        saleReference: creditProp.saleReference || '',
        itemSummary: creditProp.itemSummary || '',
        description: creditProp.description || '',
        creditDate: formatDateForInput(creditProp.creditDate || creditProp.createdAt),
        expectedDueDate: formatDateForInput(creditProp.expectedDueDate),
        reminderFrequency: creditProp.reminderFrequency || 'WEEKLY',
        notes: creditProp.notes || '',
        totalAmount: creditProp.totalAmount || '',
      });
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
      
      const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
      };

      setFormData({
        saleReference: creditData.saleReference || '',
        itemSummary: creditData.itemSummary || '',
        description: creditData.description || '',
        creditDate: formatDateForInput(creditData.creditDate || creditData.createdAt),
        expectedDueDate: formatDateForInput(creditData.expectedDueDate),
        reminderFrequency: creditData.reminderFrequency || 'WEEKLY',
        notes: creditData.notes || '',
        totalAmount: creditData.totalAmount || '',
      });
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

    try {
      setSaving(true);
      const updateData = {
        ...(formData.saleReference !== undefined && { saleReference: formData.saleReference }),
        ...(formData.itemSummary !== undefined && { itemSummary: formData.itemSummary }),
        ...(formData.description !== undefined && { description: formData.description }),
        ...(formData.creditDate && { creditDate: formData.creditDate }),
        ...(formData.expectedDueDate && { expectedDueDate: formData.expectedDueDate }),
        ...(formData.reminderFrequency && { reminderFrequency: formData.reminderFrequency }),
        ...(formData.notes !== undefined && { notes: formData.notes }),
        ...(formData.totalAmount && { totalAmount: parseFloat(formData.totalAmount) }),
      };

      await updateCredit(creditId, updateData);
      setToast({ type: 'success', message: 'Credit updated successfully' });

      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Error updating credit:', err);
      setToast({
        type: 'error',
        message: err.message || 'Failed to update credit',
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
        title="Edit Credit"
        width={500}
      >
        <div className="credit-edit-panel-loading">Loading credit details...</div>
      </SlideOver>
    );
  }

  if (!credit) return null;

  const customerName = credit.customer?.fullName || credit.customer?.name || 'Unknown Customer';

  return (
    <SlideOver
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Credit"
      width={500}
    >
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <div className="credit-edit-panel">
        <div className="credit-edit-customer-info">
          <h3 className="credit-edit-section-title">Customer</h3>
          <div className="credit-edit-customer-details">
            <p className="credit-edit-customer-name">{customerName}</p>
            <p className="credit-edit-customer-code">{credit.customer?.customerCode || ''}</p>
          </div>
        </div>

        <form className="credit-edit-form" onSubmit={handleSubmit}>
          <h3 className="credit-edit-section-title">Credit Details</h3>
          <div className="credit-edit-form-grid">
            <div className="credit-edit-form-field">
              <label className="credit-edit-form-label">Total Amount</label>
              <Input
                type="number"
                step="0.01"
                placeholder="50000"
                value={formData.totalAmount}
                onChange={(e) => handleInputChange('totalAmount', e.target.value)}
              />
              <span className="credit-edit-form-hint">
                Current: ₹{parseFloat(credit.totalAmount || 0).toLocaleString('en-IN')}
              </span>
            </div>

            <div className="credit-edit-form-field">
              <label className="credit-edit-form-label">Credit Date</label>
              <Input
                type="date"
                value={formData.creditDate}
                onChange={(e) => handleInputChange('creditDate', e.target.value)}
              />
            </div>

            <div className="credit-edit-form-field">
              <label className="credit-edit-form-label">Item Summary</label>
              <Input
                type="text"
                placeholder="Gold Necklace 22K, 45g"
                value={formData.itemSummary}
                onChange={(e) => handleInputChange('itemSummary', e.target.value)}
              />
            </div>

            <div className="credit-edit-form-field">
              <label className="credit-edit-form-label">Sale Reference</label>
              <Input
                type="text"
                placeholder="INV-2024-001"
                value={formData.saleReference}
                onChange={(e) => handleInputChange('saleReference', e.target.value)}
              />
            </div>

            <div className="credit-edit-form-field">
              <label className="credit-edit-form-label">Expected Due Date</label>
              <Input
                type="date"
                value={formData.expectedDueDate}
                onChange={(e) => handleInputChange('expectedDueDate', e.target.value)}
              />
            </div>

            <div className="credit-edit-form-field">
              <label className="credit-edit-form-label">Reminder Frequency</label>
              <select
                className="credit-edit-form-select"
                value={formData.reminderFrequency}
                onChange={(e) => handleInputChange('reminderFrequency', e.target.value)}
              >
                <option value="WEEKLY">Weekly</option>
                <option value="BIWEEKLY">Biweekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="CUSTOM">Custom</option>
              </select>
            </div>

            <div className="credit-edit-form-field credit-edit-form-field-full">
              <label className="credit-edit-form-label">Description</label>
              <textarea
                className="credit-edit-form-textarea"
                placeholder="Additional notes about this credit..."
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
              />
            </div>

            <div className="credit-edit-form-field credit-edit-form-field-full">
              <label className="credit-edit-form-label">Notes</label>
              <textarea
                className="credit-edit-form-textarea"
                placeholder="Internal notes..."
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <div className="credit-edit-form-actions">
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

export default CreditEditPanel;
