import React, { useState, useEffect } from 'react';
import FormField from '../FormField/FormField';
import SelectFormField from '../SelectFormField/SelectFormField';
import Button from '../../atoms/Button/Button';
import './ContactDetailForm.css';

const PHONE_OWNER_OPTIONS = [
  { value: 'SELF', label: 'Self' },
  { value: 'FAMILY', label: 'Family' },
  { value: 'NEIGHBOR', label: 'Neighbor' },
  { value: 'OTHER', label: 'Other' },
];

const CONTACT_METHOD_OPTIONS = [
  { value: 'CALL', label: 'Call' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'SMS', label: 'SMS' },
  { value: 'VISIT', label: 'Visit' },
  { value: 'EMAIL', label: 'Email' },
];

/**
 * Form for adding/editing contact details
 * @param {Object} props
 * @param {Object} props.contactDetail - Existing contact detail (for edit mode)
 * @param {function} props.onSubmit - Submit handler (receives contact data)
 * @param {function} props.onCancel - Cancel handler
 * @param {boolean} props.loading - Loading state
 */
const ContactDetailForm = ({ contactDetail, onSubmit, onCancel, loading = false }) => {
  const [formData, setFormData] = useState({
    primaryPhone: '',
    secondaryPhone: '',
    phoneOwnerType: '',
    preferredContactMethod: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (contactDetail) {
      setFormData({
        primaryPhone: contactDetail.primaryPhone || '',
        secondaryPhone: contactDetail.secondaryPhone || '',
        phoneOwnerType: contactDetail.phoneOwnerType || '',
        preferredContactMethod: contactDetail.preferredContactMethod || '',
      });
    }
  }, [contactDetail]);

  const handleChange = (field) => (e) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    // Primary phone is required for new contacts, optional for updates
    if (!contactDetail && !formData.primaryPhone.trim()) {
      newErrors.primaryPhone = 'Primary phone is required';
    }
    
    if (formData.primaryPhone) {
      const phoneRegex = /^\d{10}$/;
      if (!phoneRegex.test(formData.primaryPhone.replace(/\s+/g, ''))) {
        newErrors.primaryPhone = 'Enter a valid 10-digit phone number';
      }
    }
    
    if (formData.secondaryPhone) {
      const phoneRegex = /^\d{10}$/;
      if (!phoneRegex.test(formData.secondaryPhone.replace(/\s+/g, ''))) {
        newErrors.secondaryPhone = 'Enter a valid 10-digit phone number';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    // Clean up phone numbers
    const cleanedData = {};
    if (formData.primaryPhone) {
      cleanedData.primaryPhone = formData.primaryPhone.replace(/\s+/g, '');
    }
    if (formData.secondaryPhone) {
      cleanedData.secondaryPhone = formData.secondaryPhone.replace(/\s+/g, '');
    }
    if (formData.phoneOwnerType) {
      cleanedData.phoneOwnerType = formData.phoneOwnerType;
    }
    if (formData.preferredContactMethod) {
      cleanedData.preferredContactMethod = formData.preferredContactMethod;
    }

    onSubmit(cleanedData);
  };

  return (
    <form onSubmit={handleSubmit} className="contact-detail-form">
      <div className="contact-detail-form-grid">
        <FormField
          label="Primary Phone"
          type="tel"
          placeholder="10-digit phone number"
          value={formData.primaryPhone}
          onChange={handleChange('primaryPhone')}
          error={errors.primaryPhone}
          required={!contactDetail}
        />
        
        <FormField
          label="Secondary Phone"
          type="tel"
          placeholder="10-digit phone number (optional)"
          value={formData.secondaryPhone}
          onChange={handleChange('secondaryPhone')}
          error={errors.secondaryPhone}
        />
        
        <SelectFormField
          label="Phone Owner"
          value={formData.phoneOwnerType}
          onChange={handleChange('phoneOwnerType')}
          options={PHONE_OWNER_OPTIONS}
          placeholder="Select owner"
        />
        
        <SelectFormField
          label="Preferred Contact Method"
          value={formData.preferredContactMethod}
          onChange={handleChange('preferredContactMethod')}
          options={CONTACT_METHOD_OPTIONS}
          placeholder="Select method"
        />
      </div>

      <div className="contact-detail-form-actions">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? 'Saving...' : contactDetail ? 'Update Contact' : 'Add Contact'}
        </Button>
      </div>
    </form>
  );
};

export default ContactDetailForm;
