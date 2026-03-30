import React, { useState, useEffect } from 'react';
import FormField from '../FormField/FormField';
import SelectFormField from '../SelectFormField/SelectFormField';
import Button from '../../atoms/Button/Button';
import './SocialContextForm.css';

const INCOME_RANGE_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'VERY_HIGH', label: 'Very High' },
];

/**
 * Form for adding/editing social contexts
 */
const SocialContextForm = ({ socialContext, onSubmit, onCancel, loading = false }) => {
  const [formData, setFormData] = useState({
    caste: '',
    educationLevel: '',
    occupation: '',
    incomeRange: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (socialContext) {
      setFormData({
        caste: socialContext.caste || '',
        educationLevel: socialContext.educationLevel || '',
        occupation: socialContext.occupation || '',
        incomeRange: socialContext.incomeRange || '',
      });
    }
  }, [socialContext]);

  const handleChange = (field) => (e) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanedData = Object.entries(formData).reduce((acc, [key, value]) => {
      if (value && value.trim()) acc[key] = value.trim();
      return acc;
    }, {});
    onSubmit(cleanedData);
  };

  return (
    <form onSubmit={handleSubmit} className="social-context-form">
      <div className="social-context-form-grid">
        <FormField
          label="Caste"
          placeholder="Enter caste"
          value={formData.caste}
          onChange={handleChange('caste')}
        />
        
        <FormField
          label="Education Level"
          placeholder="e.g., Graduate, Post Graduate"
          value={formData.educationLevel}
          onChange={handleChange('educationLevel')}
        />
        
        <FormField
          label="Occupation"
          placeholder="Enter occupation"
          value={formData.occupation}
          onChange={handleChange('occupation')}
        />
        
        <SelectFormField
          label="Income Range"
          value={formData.incomeRange}
          onChange={handleChange('incomeRange')}
          options={INCOME_RANGE_OPTIONS}
          placeholder="Select income range"
        />
      </div>

      <div className="social-context-form-actions">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? 'Saving...' : socialContext ? 'Update' : 'Add'}
        </Button>
      </div>
    </form>
  );
};

export default SocialContextForm;
