import React from 'react';
import './Pill.css';

/**
 * Clickable pill/chip component for multi-select filters
 * @param {Object} props
 * @param {string} props.label - Pill text
 * @param {boolean} props.active - Whether pill is selected
 * @param {function} props.onClick - Click handler
 * @param {Object} props.activeStyle - Custom style when active (bg, color, borderColor)
 * @param {string} props.className - Additional class names
 */
const Pill = ({ 
  label, 
  active = false, 
  onClick, 
  activeStyle,
  className = '' 
}) => {
  const style = active && activeStyle ? {
    backgroundColor: activeStyle.bg,
    color: activeStyle.color,
    borderColor: activeStyle.borderColor || activeStyle.color,
  } : {};

  return (
    <button
      className={`pill ${active ? 'active' : ''} ${className}`}
      onClick={onClick}
      style={style}
    >
      {label}
    </button>
  );
};

export default Pill;
