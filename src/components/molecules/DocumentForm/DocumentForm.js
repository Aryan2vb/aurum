import React, { useState, useEffect } from 'react';
import FormField from '../FormField/FormField';
import Button from '../../atoms/Button/Button';
import './DocumentForm.css';

/**
 * Form for adding/editing documents (KYC)
 */
const DocumentForm = ({ document, onSubmit, onCancel, loading = false }) => {
  const [formData, setFormData] = useState({
    aadharLast4: '',
    aadharVerified: false,
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (document) {
      setFormData({
        aadharLast4: document.aadharLast4 || '',
        aadharVerified: document.aadharVerified || false,
      });
    }
  }, [document]);

  const handleChange = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (formData.aadharLast4 && !/^\d{4}$/.test(formData.aadharLast4)) {
      newErrors.aadharLast4 = 'Must be exactly 4 digits';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    
    const cleanedData = {};
    if (formData.aadharLast4) cleanedData.aadharLast4 = formData.aadharLast4;
    cleanedData.aadharVerified = formData.aadharVerified;
    
    onSubmit(cleanedData);
  };

  return (
    <form onSubmit={handleSubmit} className="document-form">
      <div className="document-form-grid">
        <FormField
          label="Aadhar Last 4 Digits"
          type="text"
          placeholder="1234"
          value={formData.aadharLast4}
          onChange={handleChange('aadharLast4')}
          error={errors.aadharLast4}
          maxLength={4}
          pattern="[0-9]{4}"
        />
        
        <div className="form-checkbox-group">
          <label className="form-checkbox">
            <input
              type="checkbox"
              checked={formData.aadharVerified}
              onChange={handleChange('aadharVerified')}
            />
            <span>Aadhar Verified</span>
          </label>
        </div>
      </div>

      <div className="document-form-actions">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? 'Saving...' : document ? 'Update' : 'Add'}
        </Button>
      </div>
    </form>
  );
};

export default DocumentForm;
