import React from 'react';
import DatePicker from '../../molecules/DatePicker/DatePicker';
import './Input.css';

const Input = ({ 
  type = 'text', 
  placeholder, 
  value, 
  onChange, 
  className = '',
  icon,
  inputRef,
  ...props 
}) => {
  if (type === 'date') {
    return (
      <div className={`input-wrapper ${className}`}>
        <DatePicker
          value={value || ''}
          onChange={(ymd) => onChange?.({ target: { value: ymd, name: props.name } })}
          placeholder={placeholder}
          disabled={props.disabled}
          required={props.required}
          min={props.min}
          max={props.max}
          id={props.id}
          name={props.name}
        />
      </div>
    );
  }

  return (
    <div className={`input-wrapper ${icon ? 'input-wrapper-with-icon' : ''} ${className}`}>
      {icon && <span className="input-icon">{icon}</span>}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="input"
        ref={inputRef}
        {...props}
      />
    </div>
  );
};

export default Input;
