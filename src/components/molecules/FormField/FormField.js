import React from 'react';
import Input from '../../atoms/Input/Input';
import Text from '../../atoms/Text/Text';
import './FormField.css';

const FormField = ({ 
  label, 
  type = 'text', 
  placeholder, 
  value, 
  onChange, 
  error,
  required = false,
  icon,
  rows,
  ...props 
}) => {
  const isTextarea = type === 'textarea';
  
  return (
    <div className="form-field">
      {label && (
        <label className="form-label">
          <Text variant="body" weight="medium">{label}</Text>
          {required && <span className="required">*</span>}
        </label>
      )}
      {isTextarea ? (
        <textarea
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          rows={rows || 4}
          className={`form-textarea ${error ? 'input-error' : ''}`}
          {...props}
        />
      ) : (
        <Input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          icon={icon}
          className={error ? 'input-error' : ''}
          {...props}
        />
      )}
      {error && (
        <Text variant="small" color="#ef4444" className="error-message">
          {error}
        </Text>
      )}
    </div>
  );
};

export default FormField;

