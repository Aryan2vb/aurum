import React from 'react';
import SelectField from '../../atoms/SelectField/SelectField';
import Text from '../../atoms/Text/Text';
import './SelectFormField.css';

/**
 * Form field wrapper for select dropdowns
 * @param {Object} props
 * @param {string} props.label - Field label
 * @param {string} props.value - Selected value
 * @param {function} props.onChange - Change handler
 * @param {Array} props.options - Options array
 * @param {string} props.placeholder - Placeholder text
 * @param {string} props.error - Error message
 * @param {boolean} props.required - Required field
 * @param {boolean} props.disabled - Disabled state
 */
const SelectFormField = ({ 
  label, 
  value, 
  onChange, 
  options = [],
  placeholder = 'Select...',
  error,
  required = false,
  disabled = false,
  ...props 
}) => {
  return (
    <div className="select-form-field">
      {label && (
        <label className="select-form-label">
          <Text variant="body" weight="medium">{label}</Text>
          {required && <span className="required">*</span>}
        </label>
      )}
      <SelectField
        value={value}
        onChange={onChange}
        options={options}
        placeholder={placeholder}
        error={error}
        disabled={disabled}
        {...props}
      />
    </div>
  );
};

export default SelectFormField;
