import React, { useState, useRef, useEffect, useCallback } from 'react';
import { searchCustomers } from '../../../services/customersService';
import './CustomerCreateForm.css';

/**
 * CustomerCreateForm - Focused form for creating new customers
 * 
 * UX Philosophy:
 * - Minimal required fields to reduce friction
 * - Auto-focus on first field for immediate typing
 * - Clear visual hierarchy: name → phone → location
 * - Save transitions to view mode (not closes panel)
 * - Calm error states (inline, not modal)
 * 
 * Following patterns from: Linear, Notion (quick create)
 * 
 * @param {Object} props
 * @param {Function} props.onSave - Called with customer data on save
 * @param {Function} props.onCancel - Called when user cancels
 * @param {boolean} props.isSaving - Whether save is in progress
 * @param {string} props.error - Error message to display
 */
const CustomerCreateForm = ({
  onSave,
  onCancel,
  isSaving = false,
  error = '',
  initialFullName = '',
}) => {
  const [formData, setFormData] = useState({
    fullName: initialFullName || '',
    primaryPhone: '',
    gstin: '',
    address: '',
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [duplicateCheck, setDuplicateCheck] = useState({
    checking: false,
    nameDuplicate: null,
    phoneDuplicate: null,
  });
  const nameInputRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Auto-focus name field on mount
  useEffect(() => {
    if (nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, []);

  // Debounced duplicate check function - only checks phone number
  const checkForDuplicates = useCallback(async (phone) => {
    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Only check if phone is valid (10 digits)
    if (!phone || !/^\d{10}$/.test(phone.trim())) {
      setDuplicateCheck({
        checking: false,
        nameDuplicate: null,
        phoneDuplicate: null,
      });
      return;
    }

    // Set a new timer for debouncing
    debounceTimerRef.current = setTimeout(async () => {
      setDuplicateCheck(prev => ({ ...prev, checking: true }));

      try {
        // Only check for phone duplicate
        const results = await searchCustomers({ phone: phone.trim() });
        const customers = Array.isArray(results) ? results : (results?.data || []);
        const phoneDuplicate = customers.length > 0 ? customers[0] : null;

        setDuplicateCheck({
          checking: false,
          nameDuplicate: null, // Names can be duplicate, so always null
          phoneDuplicate,
        });
      } catch (err) {
        setDuplicateCheck(prev => ({ ...prev, checking: false }));
      }
    }, 1000); // 1000ms debounce delay
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleChange = (field) => (e) => {
    const value = e.target.value;
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Trigger duplicate check only for phone changes (names can be duplicate)
      if (field === 'primaryPhone') {
        checkForDuplicates(value);
      }
      
      return newData;
    });
    
    // Clear validation error when user types
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const errors = {};
    
    if (!formData.fullName.trim()) {
      errors.fullName = 'Name is required';
    }
    
    // Phone is optional, but if provided, must be valid
    if (formData.primaryPhone && formData.primaryPhone.trim()) {
      const cleanPhone = formData.primaryPhone.trim();
      if (!/^\d{10}$/.test(cleanPhone)) {
        errors.primaryPhone = 'Enter a valid 10-digit number';
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Check if form has duplicates (blocks submission) - only phone duplicates matter
  const hasDuplicates = duplicateCheck.phoneDuplicate;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    // Build the customer data payload
    const customerData = {
      fullName: formData.fullName.trim(),
      gstin: formData.gstin.trim() || undefined,
    };
    
    // Only include contact details if phone is provided and valid
    // API expects contactDetails as an object, not an array
    // primaryPhone is required if contactDetails is included
    const cleanPhone = formData.primaryPhone?.trim();
    if (cleanPhone && /^\d{10}$/.test(cleanPhone)) {
      customerData.contactDetails = {
        primaryPhone: cleanPhone,
        preferredContactMethod: 'CALL',
      };
    }
    
    // Only include location if address is provided
    // API expects locations as an array
    // Parse address: "Village, Tehsil, District"
    if (formData.address?.trim()) {
      const addressParts = formData.address.split(',').map(p => p.trim()).filter(Boolean);
      const location = {
        village: addressParts[0] || '',
        tehsil: addressParts[1] || '',
        district: addressParts[2] || '',
        state: 'Madhya Pradesh', // Default for this CRM
      };
      customerData.locations = [location];
    }
    
    await onSave(customerData);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <form 
      className="create-form" 
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
    >
      {/* Error banner */}
      {error && (
        <div className="create-form-error">
          {error}
        </div>
      )}

      {/* ============================================ */}
      {/* PRIMARY FIELD: Full Name                    */}
      {/* ============================================ */}
      <div className="form-section">
        <h3 className="form-section-title">Personal</h3>
        
        <div className={`form-field ${validationErrors.fullName ? 'has-error' : ''}`}>
          <label className="form-label" htmlFor="fullName">
            Full name <span className="required">*</span>
          </label>
          <input
            ref={nameInputRef}
            id="fullName"
            type="text"
            value={formData.fullName}
            onChange={handleChange('fullName')}
            placeholder="Enter customer name"
            className="form-input"
            disabled={isSaving}
            autoComplete="off"
          />
          {validationErrors.fullName && (
            <span className="form-error">{validationErrors.fullName}</span>
          )}
        </div>
      </div>

      <div className="form-divider" />

      {/* ============================================ */}
      {/* CONTACT FIELD: Phone                        */}
      {/* ============================================ */}
      <div className="form-section">
        <h3 className="form-section-title">Contact</h3>
        
        <div className={`form-field ${validationErrors.primaryPhone ? 'has-error' : ''} ${duplicateCheck.phoneDuplicate ? 'has-warning' : ''}`}>
          <label className="form-label" htmlFor="primaryPhone">
            Phone number
          </label>
          <div className="phone-input-wrapper">
            <span className="phone-prefix">+91</span>
            <input
              id="primaryPhone"
              type="tel"
              value={formData.primaryPhone}
              onChange={handleChange('primaryPhone')}
              placeholder="10-digit number"
              className="form-input phone-input"
              disabled={isSaving}
              maxLength={10}
              autoComplete="off"
            />
          </div>
          {validationErrors.primaryPhone && (
            <span className="form-error">{validationErrors.primaryPhone}</span>
          )}
          {duplicateCheck.checking && formData.primaryPhone.trim().length === 10 && (
            <span className="form-warning checking">Checking for duplicates...</span>
          )}
          {duplicateCheck.phoneDuplicate && !duplicateCheck.checking && (
            <div className="form-warning duplicate-warning">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>
                Phone number already exists for "<strong>{duplicateCheck.phoneDuplicate.fullName}</strong>"
                {duplicateCheck.phoneDuplicate.customerCode && ` (${duplicateCheck.phoneDuplicate.customerCode})`}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="form-divider" />

      {/* ============================================ */}
      {/* TAX FIELD: GSTIN                            */}
      {/* ============================================ */}
      <div className="form-section">
        <h3 className="form-section-title">Tax Info</h3>
        
        <div className="form-field">
          <label className="form-label" htmlFor="gstin">
            GSTIN
          </label>
          <input
            id="gstin"
            type="text"
            value={formData.gstin}
            onChange={handleChange('gstin')}
            placeholder="15-digit GSTIN"
            className="form-input"
            disabled={isSaving}
            autoComplete="off"
            style={{ textTransform: 'uppercase' }}
          />
        </div>
      </div>

      <div className="form-divider" />

      {/* ============================================ */}
      {/* LOCATION FIELD                              */}
      {/* ============================================ */}
      <div className="form-section">
        <h3 className="form-section-title">Location</h3>
        
        <div className="form-field">
          <label className="form-label" htmlFor="address">
            Address
          </label>
          <textarea
            id="address"
            value={formData.address}
            onChange={handleChange('address')}
            placeholder="Village, Tehsil, District"
            className="form-input"
            disabled={isSaving}
            autoComplete="off"
            rows={3}
            style={{ resize: 'vertical', minHeight: '60px' }}
          />
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
            Enter: Village, Tehsil, District (comma separated)
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* FORM ACTIONS                                */}
      {/* ============================================ */}
      <div className="form-actions">
        <button
          type="button"
          onClick={onCancel}
          className="form-btn form-btn-cancel"
          disabled={isSaving}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="form-btn form-btn-save"
          disabled={isSaving || !formData.fullName.trim() || hasDuplicates}
          title={hasDuplicates ? 'Please resolve duplicate warnings before creating' : ''}
        >
          {isSaving ? (
            <>
              <LoadingSpinner />
              Creating...
            </>
          ) : hasDuplicates ? (
            'Duplicate detected'
          ) : (
            'Create customer'
          )}
        </button>
      </div>
    </form>
  );
};

const LoadingSpinner = () => (
  <svg className="form-spinner" viewBox="0 0 24 24" fill="none">
    <circle
      className="spinner-track"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="spinner-head"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);

export default CustomerCreateForm;
