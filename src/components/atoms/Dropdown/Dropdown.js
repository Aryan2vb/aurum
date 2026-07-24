import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const [menuStyle, setMenuStyle] = useState(null);
  const ref = useRef(null);
  const menuRef = useRef(null);

  useLayoutEffect(() => {
    if (!isOpen || !ref.current) {
      setMenuStyle(null);
      return;
    }
    const place = () => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const menuH = menuRef.current?.offsetHeight || 220;
      const gap = 4;
      const spaceBelow = window.innerHeight - rect.bottom - gap;
      const openUp = spaceBelow < menuH && rect.top > spaceBelow;
      const style = {
        position: 'fixed',
        zIndex: 10000,
        minWidth: Math.max(rect.width, 220),
        maxHeight: Math.min(320, window.innerHeight - 16),
        overflowY: 'auto',
      };
      if (openUp) {
        style.bottom = window.innerHeight - rect.top + gap;
        style.top = 'auto';
      } else {
        style.top = rect.bottom + gap;
        style.bottom = 'auto';
      }
      if (align === 'right') {
        style.right = Math.max(8, window.innerWidth - rect.right);
        style.left = 'auto';
      } else {
        style.left = Math.max(8, Math.min(rect.left, window.innerWidth - 228));
        style.right = 'auto';
      }
      setMenuStyle(style);
    };
    place();
    // Remeasure after paint once menu height is known
    const raf = requestAnimationFrame(place);
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [isOpen, align]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      const inTrigger = ref.current?.contains(e.target);
      const inMenu = menuRef.current?.contains(e.target);
      if (!inTrigger && !inMenu) {
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

  const menu = isOpen && menuStyle && createPortal(
    <div
      ref={menuRef}
      className={`dropdown-menu dropdown-menu-portal dropdown-align-${align}`}
      style={menuStyle}
    >
      {typeof children === 'function' ? children({ close: handleClose }) : children}
    </div>,
    document.body,
  );

  return (
    <div className={`dropdown ${className}`} ref={ref}>
      <div className="dropdown-trigger" onClick={handleToggle}>
        {typeof trigger === 'function' ? trigger({ isOpen }) : trigger}
      </div>
      {menu}
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
