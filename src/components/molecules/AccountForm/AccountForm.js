import React, { useState, useEffect } from 'react';
import FormField from '../FormField/FormField';
import SelectFormField from '../SelectFormField/SelectFormField';
import Button from '../../atoms/Button/Button';
import './AccountForm.css';

const ACCOUNT_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'DORMANT', label: 'Dormant' },
];

/**
 * Form for adding/editing accounts
 */
const AccountForm = ({ account, onSubmit, onCancel, loading = false }) => {
  const [formData, setFormData] = useState({
    openingBalance: '',
    openedAt: '',
    status: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (account) {
      setFormData({
        openingBalance: account.openingBalance?.toString() || '',
        openedAt: account.openedAt ? new Date(account.openedAt).toISOString().split('T')[0] : '',
        status: account.status || '',
      });
    }
  }, [account]);

  const handleChange = (field) => (e) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanedData = {};
    if (formData.openingBalance) {
      cleanedData.openingBalance = parseFloat(formData.openingBalance);
    }
    if (formData.openedAt) {
      cleanedData.openedAt = new Date(formData.openedAt).toISOString();
    }
    if (formData.status) {
      cleanedData.status = formData.status;
    }
    onSubmit(cleanedData);
  };

  return (
    <form onSubmit={handleSubmit} className="account-form">
      <div className="account-form-grid">
        <FormField
          label="Opening Balance"
          type="number"
          step="0.01"
          placeholder="0.00"
          value={formData.openingBalance}
          onChange={handleChange('openingBalance')}
        />
        
        <FormField
          label="Opened At"
          type="date"
          value={formData.openedAt}
          onChange={handleChange('openedAt')}
        />
        
        <SelectFormField
          label="Status"
          value={formData.status}
          onChange={handleChange('status')}
          options={ACCOUNT_STATUS_OPTIONS}
          placeholder="Select status"
        />
      </div>

      <div className="account-form-actions">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? 'Saving...' : account ? 'Update' : 'Add'}
        </Button>
      </div>
    </form>
  );
};

export default AccountForm;
