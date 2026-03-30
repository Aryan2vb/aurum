import React from 'react';
import Dropdown from '../../atoms/Dropdown/Dropdown';
import FilterButton from '../../atoms/FilterButton/FilterButton';
import './BooleanFilter.css';

/**
 * Boolean yes/no filter
 * @param {Object} props
 * @param {string} props.label - Filter label
 * @param {React.ReactNode} props.icon - Icon element
 * @param {boolean|null} props.value - Current value (true, false, or null)
 * @param {function} props.onChange - Change handler
 */
const BooleanFilter = ({ label, icon, value, onChange }) => {
  const hasValue = value !== null;

  const getDisplayValue = () => {
    if (value === null) return null;
    return value ? 'Yes' : 'No';
  };

  return (
    <Dropdown
      className="boolean-filter"
      trigger={
        <FilterButton
          icon={icon}
          label={label}
          value={getDisplayValue()}
          active={hasValue}
        />
      }
    >
      <div className="boolean-filter-content">
        <div className="boolean-filter-header">{label}</div>
        <div className="boolean-filter-options">
          <button 
            className={`boolean-option ${value === true ? 'active yes' : ''}`}
            onClick={() => onChange(value === true ? null : true)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 6 9 17l-5-5"/>
            </svg>
            Yes
          </button>
          <button 
            className={`boolean-option ${value === false ? 'active no' : ''}`}
            onClick={() => onChange(value === false ? null : false)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
            No
          </button>
        </div>
      </div>
    </Dropdown>
  );
};

export default BooleanFilter;
