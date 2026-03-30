import React from 'react';
import './FilterButton.css';

/**
 * Semantic filter button used in filter bars
 * @param {Object} props
 * @param {React.ReactNode} props.icon - Icon element
 * @param {string} props.label - Filter label
 * @param {string} props.value - Current value display
 * @param {string} props.placeholder - Placeholder when no value
 * @param {boolean} props.active - Whether filter has active value
 * @param {function} props.onClick - Click handler
 * @param {string} props.className - Additional class names
 */
const FilterButton = ({ 
  icon, 
  label, 
  value, 
  placeholder = 'is...', 
  active = false,
  onClick,
  className = '' 
}) => {
  return (
    <button 
      className={`filter-button ${active ? 'active' : ''} ${className}`}
      onClick={onClick}
    >
      {icon && <span className="filter-button-icon">{icon}</span>}
      <span className="filter-button-label">{label}</span>
      {value ? (
        <span className="filter-button-value">{value}</span>
      ) : (
        <span className="filter-button-placeholder">{placeholder}</span>
      )}
    </button>
  );
};

export default FilterButton;
