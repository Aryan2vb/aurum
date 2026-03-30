import React, { useState, useEffect } from 'react';
import FormField from '../FormField/FormField';
import Button from '../../atoms/Button/Button';
import './LocationForm.css';

/**
 * Form for adding/editing customer locations
 * @param {Object} props
 * @param {Object} props.location - Existing location data (for edit mode)
 * @param {function} props.onSubmit - Submit handler (receives location data)
 * @param {function} props.onCancel - Cancel handler
 * @param {boolean} props.loading - Loading state
 */
const LocationForm = ({ location, onSubmit, onCancel, loading = false }) => {
  const [formData, setFormData] = useState({
    village: '',
    tehsil: '',
    district: '',
    state: '',
    pincode: '',
    landmark: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (location) {
      setFormData({
        village: location.village || '',
        tehsil: location.tehsil || '',
        district: location.district || '',
        state: location.state || '',
        pincode: location.pincode || '',
        landmark: location.landmark || '',
      });
    }
  }, [location]);

  const handleChange = (field) => (e) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    // At least one field should be filled
    const hasData = Object.values(formData).some(val => val.trim());
    if (!hasData) {
      newErrors.general = 'Please fill at least one location field';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    // Clean up empty strings
    const cleanedData = Object.entries(formData).reduce((acc, [key, value]) => {
      if (value.trim()) acc[key] = value.trim();
      return acc;
    }, {});

    onSubmit(cleanedData);
  };

  return (
    <form onSubmit={handleSubmit} className="location-form">
      {errors.general && (
        <div className="form-error">{errors.general}</div>
      )}
      
      <div className="location-form-grid">
        <FormField
          label="Village"
          placeholder="Enter village name"
          value={formData.village}
          onChange={handleChange('village')}
        />
        
        <FormField
          label="Tehsil"
          placeholder="Enter tehsil"
          value={formData.tehsil}
          onChange={handleChange('tehsil')}
        />
        
        <FormField
          label="District"
          placeholder="Enter district"
          value={formData.district}
          onChange={handleChange('district')}
        />
        
        <FormField
          label="State"
          placeholder="Enter state"
          value={formData.state}
          onChange={handleChange('state')}
        />
        
        <FormField
          label="Pincode"
          placeholder="Enter pincode"
          value={formData.pincode}
          onChange={handleChange('pincode')}
        />
        
        <FormField
          label="Landmark"
          placeholder="Enter landmark"
          value={formData.landmark}
          onChange={handleChange('landmark')}
        />
      </div>

      <div className="location-form-actions">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? 'Saving...' : location ? 'Update Location' : 'Add Location'}
        </Button>
      </div>
    </form>
  );
};

export default LocationForm;
