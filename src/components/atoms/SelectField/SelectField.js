import React from 'react';
import './SelectField.css';

/**
 * Select dropdown field component
 * @param {Object} props
 * @param {string} props.value - Selected value
 * @param {function} props.onChange - Change handler
 * @param {Array<{value: string, label: string}>} props.options - Options array
 * @param {string} props.placeholder - Placeholder text
 * @param {boolean} props.disabled - Disabled state
 * @param {string} props.className - Additional class names
 * @param {string} props.error - Error message
 */
const SelectField = ({ 
  value, 
  onChange, 
  options = [], 
  placeholder = 'Select...',
  disabled = false,
  className = '',
  error,
  ...props 
}) => {
  return (
    <div className={`select-field-wrapper ${className}`}>
      <select
        className={`select-field ${error ? 'select-field-error' : ''}`}
        value={value}
        onChange={onChange}
        disabled={disabled}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <span className="select-field-error-message">{error}</span>
      )}
    </div>
  );
};

export default SelectField;
