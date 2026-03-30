import React, { useState, useRef, useEffect } from 'react';
import './Dropdown.css';

/**
 * Reusable dropdown component with click-outside handling
 * @param {Object} props
 * @param {React.ReactNode} props.trigger - The trigger element (button)
 * @param {React.ReactNode} props.children - Dropdown content
 * @param {string} props.className - Additional class names
 * @param {string} props.align - Alignment: 'left' | 'right'
 */
const Dropdown = ({ 
  trigger, 
  children, 
  className = '', 
  align = 'left',
  onOpenChange 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false);
        onOpenChange?.(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onOpenChange]);

  const handleToggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    onOpenChange?.(newState);
  };

  const handleClose = () => {
    setIsOpen(false);
    onOpenChange?.(false);
  };

  return (
    <div className={`dropdown ${className}`} ref={ref}>
      <div className="dropdown-trigger" onClick={handleToggle}>
        {typeof trigger === 'function' ? trigger({ isOpen }) : trigger}
      </div>
      {isOpen && (
        <div className={`dropdown-menu dropdown-align-${align}`}>
          {typeof children === 'function' ? children({ close: handleClose }) : children}
        </div>
      )}
    </div>
  );
};

export const DropdownItem = ({ 
  children, 
  onClick, 
  active = false, 
  disabled = false,
  icon,
  className = '' 
}) => (
  <button 
    className={`dropdown-item ${active ? 'active' : ''} ${disabled ? 'disabled' : ''} ${className}`} 
    onClick={disabled ? undefined : onClick}
    disabled={disabled}
  >
    {icon && <span className="dropdown-item-icon">{icon}</span>}
    {children}
  </button>
);

export const DropdownDivider = () => <div className="dropdown-divider" />;

export default Dropdown;
