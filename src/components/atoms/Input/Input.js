import React from 'react';
import './Input.css';

const Input = ({ 
  type = 'text', 
  placeholder, 
  value, 
  onChange, 
  className = '',
  icon,
  ...props 
}) => {
  return (
    <div className={`input-wrapper ${icon ? 'input-wrapper-with-icon' : ''} ${className}`}>
      {icon && <span className="input-icon">{icon}</span>}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="input"
        {...props}
      />
    </div>
  );
};

export default Input;

