import React from 'react';
import Dropdown from '../../atoms/Dropdown/Dropdown';
import FilterButton from '../../atoms/FilterButton/FilterButton';
import Pill from '../../atoms/Pill/Pill';
import './EnumFilter.css';

/**
 * Multi-select enum filter with pill selection
 * @param {Object} props
 * @param {string} props.label - Filter label
 * @param {React.ReactNode} props.icon - Icon element
 * @param {Array} props.value - Selected values array
 * @param {Array<{value: string, label: string}>} props.options - Available options
 * @param {function} props.onChange - Change handler (receives new array)
 * @param {Object} props.colorMap - Optional color map for options {value: {bg, color}}
 */
const EnumFilter = ({ 
  label, 
  icon, 
  value = [], 
  options, 
  onChange, 
  colorMap 
}) => {
  const activeCount = value.length;

  const getDisplayValue = () => {
    if (activeCount === 0) return null;
    if (activeCount === 1) {
      return options.find(o => o.value === value[0])?.label;
    }
    return `${activeCount} selected`;
  };

  const handlePillClick = (optValue) => {
    if (value.includes(optValue)) {
      onChange(value.filter(v => v !== optValue));
    } else {
      onChange([...value, optValue]);
    }
  };

  const handleClear = () => onChange([]);

  return (
    <Dropdown
      className="enum-filter"
      trigger={
        <FilterButton
          icon={icon}
          label={label}
          value={getDisplayValue()}
          active={activeCount > 0}
        />
      }
    >
      <div className="enum-filter-content">
        <div className="enum-filter-header">{label} is</div>
        <div className="enum-filter-pills">
          {options.map(opt => (
            <Pill
              key={opt.value}
              label={opt.label}
              active={value.includes(opt.value)}
              activeStyle={colorMap?.[opt.value]}
              onClick={() => handlePillClick(opt.value)}
            />
          ))}
        </div>
        {activeCount > 0 && (
          <button className="enum-filter-clear" onClick={handleClear}>
            Clear
          </button>
        )}
      </div>
    </Dropdown>
  );
};

export default EnumFilter;
