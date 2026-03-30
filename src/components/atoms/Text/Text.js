import React from 'react';
import './Text.css';

const Text = ({ 
  children, 
  variant = 'body', 
  weight = 'normal',
  color,
  className = '',
  ...props 
}) => {
  return (
    <span
      className={`text text-${variant} text-${weight} ${className}`}
      style={{ color }}
      {...props}
    >
      {children}
    </span>
  );
};

export default Text;

