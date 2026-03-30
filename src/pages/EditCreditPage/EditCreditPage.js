import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardTemplate from '../../components/templates/DashboardTemplate/DashboardTemplate';
import Input from '../../components/atoms/Input/Input';
import Button from '../../components/atoms/Button/Button';
import Toast from '../../components/atoms/Toast/Toast';
import { getCreditById, updateCredit } from '../../services/creditsService';
import './EditCreditPage.css';

const EditCreditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [credit, setCredit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
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
      
      // Format dates for input fields (YYYY-MM-DD)
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

      await updateCredit(id, updateData);
      setToast({ type: 'success', message: 'Credit updated successfully' });

      setTimeout(() => {
        navigate(`/credits/${id}`);
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

  if (loading) {
    return (
      <DashboardTemplate headerTitle="Edit Credit" headerTabs={[]}>
        <div className="edit-credit-page">
          <div className="edit-credit-loading">Loading credit details...</div>
        </div>
      </DashboardTemplate>
    );
  }

  if (error || !credit) {
    return (
      <DashboardTemplate headerTitle="Edit Credit" headerTabs={[]}>
        <div className="edit-credit-page">
          <div className="edit-credit-error">
            <p>{error || 'Credit not found'}</p>
            <Button variant="primary" onClick={() => navigate('/credits')}>
              Back to Credits
            </Button>
          </div>
        </div>
      </DashboardTemplate>
    );
  }

  return (
    <DashboardTemplate headerTitle="Edit Credit" headerTabs={[]}>
      <div className="edit-credit-page">
        {toast && (
          <Toast
            type={toast.type}
            message={toast.message}
            onClose={() => setToast(null)}
          />
        )}

        <div className="edit-credit-header">
          <Button variant="ghost" size="small" onClick={() => navigate(`/credits/${id}`)}>
            ← Back
          </Button>
          <h1 className="edit-credit-title">Edit Credit</h1>
        </div>

        <div className="edit-credit-content">
          <div className="edit-credit-left">
            <div className="edit-credit-customer-info">
              <h2 className="edit-credit-section-title">Customer</h2>
              <div className="edit-credit-customer-details">
                <p className="edit-credit-customer-name">
                  {credit.customer?.name || 'Unknown Customer'}
                </p>
                <p className="edit-credit-customer-code">
                  {credit.customer?.customerCode || ''}
                </p>
              </div>
            </div>

            <form className="edit-credit-form" onSubmit={handleSubmit}>
              <h2 className="edit-credit-section-title">Credit Details</h2>
              <div className="edit-credit-form-grid">
                <div className="edit-credit-form-field">
                  <label className="edit-credit-form-label">Total Amount</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="50000"
                    value={formData.totalAmount}
                    onChange={(e) => handleInputChange('totalAmount', e.target.value)}
                  />
                  <span className="edit-credit-form-hint">
                    Current: ₹{parseFloat(credit.totalAmount || 0).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="edit-credit-form-field">
                  <label className="edit-credit-form-label">Credit Date</label>
                  <Input
                    type="date"
                    value={formData.creditDate}
                    onChange={(e) => handleInputChange('creditDate', e.target.value)}
                  />
                  <span className="edit-credit-form-hint">
                    When was this credit given?
                  </span>
                </div>

                <div className="edit-credit-form-field">
                  <label className="edit-credit-form-label">Item Summary</label>
                  <Input
                    type="text"
                    placeholder="Gold Necklace 22K, 45g"
                    value={formData.itemSummary}
                    onChange={(e) => handleInputChange('itemSummary', e.target.value)}
                  />
                </div>

                <div className="edit-credit-form-field">
                  <label className="edit-credit-form-label">Sale Reference</label>
                  <Input
                    type="text"
                    placeholder="INV-2024-001"
                    value={formData.saleReference}
                    onChange={(e) => handleInputChange('saleReference', e.target.value)}
                  />
                </div>

                <div className="edit-credit-form-field">
                  <label className="edit-credit-form-label">Expected Due Date</label>
                  <Input
                    type="date"
                    value={formData.expectedDueDate}
                    onChange={(e) => handleInputChange('expectedDueDate', e.target.value)}
                  />
                </div>

                <div className="edit-credit-form-field">
                  <label className="edit-credit-form-label">Reminder Frequency</label>
                  <select
                    className="edit-credit-form-select"
                    value={formData.reminderFrequency}
                    onChange={(e) => handleInputChange('reminderFrequency', e.target.value)}
                  >
                    <option value="WEEKLY">Weekly</option>
                    <option value="BIWEEKLY">Biweekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </div>

                <div className="edit-credit-form-field edit-credit-form-field-full">
                  <label className="edit-credit-form-label">Description</label>
                  <textarea
                    className="edit-credit-form-textarea"
                    placeholder="Additional notes about this credit..."
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="edit-credit-form-field edit-credit-form-field-full">
                  <label className="edit-credit-form-label">Notes</label>
                  <textarea
                    className="edit-credit-form-textarea"
                    placeholder="Internal notes..."
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    rows={2}
                  />
                </div>
              </div>

              <div className="edit-credit-form-actions">
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

export default EditCreditPage;
