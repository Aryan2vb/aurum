import React, { useState, useEffect } from 'react';
import FormField from '../FormField/FormField';
import Button from '../../atoms/Button/Button';
import {
  normalizeAadhaarNumber,
  normalizePanNumber,
  validateAadhaarNumber,
  validatePanNumber,
} from '../../../utils/customerKyc';
import './DocumentForm.css';

/**
 * Form for adding/editing documents (KYC)
 */
const DocumentForm = ({ document, onSubmit, onCancel, loading = false }) => {
  const [formData, setFormData] = useState({
    aadharNumber: '',
    panNumber: '',
    aadharVerified: false,
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (document) {
      setFormData({
        aadharNumber: document.aadharNumber || '',
        panNumber: document.panNumber || '',
        aadharVerified: document.aadharVerified || false,
      });
    }
  }, [document]);

  const handleChange = (field) => (e) => {
    let value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    if (field === 'aadharNumber') value = normalizeAadhaarNumber(value);
    if (field === 'panNumber') value = normalizePanNumber(value);
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    const aadhaarError = validateAadhaarNumber(formData.aadharNumber);
    const panError = validatePanNumber(formData.panNumber);
    if (aadhaarError) newErrors.aadharNumber = aadhaarError;
    if (panError) newErrors.panNumber = panError;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    
    const cleanedData = {};
    if (formData.aadharNumber) {
      cleanedData.aadharNumber = formData.aadharNumber;
    }
    if (formData.panNumber) cleanedData.panNumber = formData.panNumber;
    cleanedData.aadharVerified = formData.aadharVerified;
    
    onSubmit(cleanedData);
  };

  return (
    <form onSubmit={handleSubmit} className="document-form">
      <div className="document-form-grid">
        <FormField
          label="Aadhaar Number"
          type="text"
          placeholder="123456789012"
          value={formData.aadharNumber}
          onChange={handleChange('aadharNumber')}
          error={errors.aadharNumber}
          maxLength={12}
          pattern="[0-9]{12}"
          inputMode="numeric"
        />

        <FormField
          label="PAN"
          type="text"
          placeholder="ABCDE1234F"
          value={formData.panNumber}
          onChange={handleChange('panNumber')}
          error={errors.panNumber}
          maxLength={10}
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
