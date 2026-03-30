import React from 'react';
import FilterButton from '../../atoms/FilterButton/FilterButton';
import Dropdown from '../../atoms/Dropdown/Dropdown';
import './TextFilter.css';

/**
 * Text input filter component
 * @param {Object} props
 * @param {string} props.label - Filter label
 * @param {React.ReactNode} props.icon - Icon element
 * @param {string} props.value - Current filter value
 * @param {function} props.onChange - Change handler (receives new value)
 * @param {string} props.placeholder - Input placeholder
 */
const TextFilter = ({ 
  label, 
  icon, 
  value = '', 
  onChange, 
  placeholder = 'Enter text...'
}) => {
  const isActive = value && value.trim().length > 0;

  const handleChange = (e) => {
    onChange(e.target.value);
  };

  const handleClear = () => {
    onChange('');
  };

  const trigger = ({ isOpen }) => (
    <FilterButton
      icon={icon}
      label={label}
      value={isActive ? value : null}
      isActive={isActive}
      isOpen={isOpen}
    />
  );

  return (
    <Dropdown className="text-filter" trigger={trigger} align="left">
      {({ close }) => (
        <div className="text-filter-content">
          <div className="text-filter-header">
            <span className="text-filter-title">{label}</span>
            {isActive && (
              <button 
                className="text-filter-clear" 
                onClick={handleClear}
                aria-label="Clear filter"
              >
                Clear
              </button>
            )}
          </div>
          <input
            type="text"
            className="text-filter-input"
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            autoFocus
          />
        </div>
      )}
    </Dropdown>
  );
};

export default TextFilter;
