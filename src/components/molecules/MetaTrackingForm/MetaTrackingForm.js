import React, { useState, useEffect } from 'react';
import FormField from '../FormField/FormField';
import Button from '../../atoms/Button/Button';
import './MetaTrackingForm.css';

/**
 * Form for adding/editing meta tracking
 */
const MetaTrackingForm = ({ metaTracking, onSubmit, onCancel, loading = false }) => {
  const [formData, setFormData] = useState({
    registeredOn: '',
    notes: '',
    source: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (metaTracking) {
      setFormData({
        registeredOn: metaTracking.registeredOn ? new Date(metaTracking.registeredOn).toISOString().split('T')[0] : '',
        notes: metaTracking.notes || '',
        source: metaTracking.source || '',
      });
    }
  }, [metaTracking]);

  const handleChange = (field) => (e) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanedData = {};
    if (formData.registeredOn) {
      cleanedData.registeredOn = new Date(formData.registeredOn).toISOString();
    }
    if (formData.notes?.trim()) {
      cleanedData.notes = formData.notes.trim();
    }
    if (formData.source?.trim()) {
      cleanedData.source = formData.source.trim();
    }
    onSubmit(cleanedData);
  };

  return (
    <form onSubmit={handleSubmit} className="meta-tracking-form">
      <div className="meta-tracking-form-grid">
        <FormField
          label="Registered On"
          type="date"
          value={formData.registeredOn}
          onChange={handleChange('registeredOn')}
        />
        
        <FormField
          label="Source"
          placeholder="e.g., REFERRAL, WALK_IN"
          value={formData.source}
          onChange={handleChange('source')}
        />
        
        <div className="meta-tracking-notes">
          <FormField
            label="Notes"
            type="textarea"
            placeholder="Enter notes about this customer..."
            value={formData.notes}
            onChange={handleChange('notes')}
            rows={4}
          />
        </div>
      </div>

      <div className="meta-tracking-form-actions">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? 'Saving...' : metaTracking ? 'Update' : 'Add'}
        </Button>
      </div>
    </form>
  );
};

export default MetaTrackingForm;
