import React from 'react';
import Dropdown from '../../atoms/Dropdown/Dropdown';
import FilterButton from '../../atoms/FilterButton/FilterButton';
import './RangeFilter.css';

/**
 * Numeric range filter (min/max)
 * @param {Object} props
 * @param {string} props.label - Filter label
 * @param {React.ReactNode} props.icon - Icon element
 * @param {number|null} props.min - Minimum value
 * @param {number|null} props.max - Maximum value
 * @param {function} props.onChange - Change handler (min, max)
 * @param {Object} props.placeholder - Placeholder text {min, max}
 */
const RangeFilter = ({ 
  label, 
  icon, 
  min, 
  max, 
  onChange, 
  placeholder = { min: '0', max: '∞' } 
}) => {
  const hasValue = min !== null || max !== null;

  const getDisplayValue = () => {
    if (!hasValue) return null;
    if (min !== null && max !== null) return `${min} - ${max}`;
    if (min !== null) return `≥ ${min}`;
    return `≤ ${max}`;
  };

  const handleClear = () => onChange(null, null);

  return (
    <Dropdown
      className="range-filter"
      trigger={
        <FilterButton
          icon={icon}
          label={label}
          value={getDisplayValue()}
          active={hasValue}
        />
      }
    >
      <div className="range-filter-content">
        <div className="range-filter-header">{label} is between</div>
        <div className="range-filter-inputs">
          <input
            type="number"
            className="range-input"
            value={min ?? ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null, max)}
            placeholder={placeholder.min}
          />
          <span className="range-separator">and</span>
          <input
            type="number"
            className="range-input"
            value={max ?? ''}
            onChange={(e) => onChange(min, e.target.value ? Number(e.target.value) : null)}
            placeholder={placeholder.max}
          />
        </div>
        {hasValue && (
          <button className="range-filter-clear" onClick={handleClear}>
            Clear
          </button>
        )}
      </div>
    </Dropdown>
  );
};

export default RangeFilter;
