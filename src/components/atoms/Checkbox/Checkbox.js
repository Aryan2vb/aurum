import React from 'react';
import './Checkbox.css';

// SVG Icons
const CheckIcon = () => (
  <svg viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M10 3L4.5 8.5L2 6" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

const MinusIcon = () => (
  <svg viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M2.5 6H9.5" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      strokeLinecap="round"
    />
  </svg>
);

/**
 * Attio-style checkbox component
 * @param {Object} props
 * @param {boolean} props.checked - Whether checkbox is checked
 * @param {function} props.onChange - Change handler
 * @param {boolean} props.indeterminate - Indeterminate state (for "select all")
 * @param {boolean} props.disabled - Disabled state
 * @param {string} props.className - Additional class names
 */
const Checkbox = ({ 
  checked = false, 
  onChange, 
  indeterminate = false,
  disabled = false,
  className = '',
  ...props 
}) => {
  const handleClick = (e) => {
    if (disabled) return;
    e.stopPropagation();
    onChange?.(e);
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onChange?.(e);
    }
  };

  const isActive = checked || indeterminate;

  return (
    <div 
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      className={`checkbox ${isActive ? 'checkbox--active' : ''} ${indeterminate ? 'checkbox--indeterminate' : ''} ${disabled ? 'checkbox--disabled' : ''} ${className}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      {...props}
    >
      <div className="checkbox__box">
        <div className="checkbox__icon">
          {indeterminate ? <MinusIcon /> : <CheckIcon />}
        </div>
      </div>
    </div>
  );
};

export default Checkbox;
