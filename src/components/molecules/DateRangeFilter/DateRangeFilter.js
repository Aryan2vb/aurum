import React from 'react';
import Dropdown from '../../atoms/Dropdown/Dropdown';
import FilterButton from '../../atoms/FilterButton/FilterButton';
import './DateRangeFilter.css';

/**
 * Date range filter (start/end dates)
 * @param {Object} props
 * @param {string} props.label - Filter label
 * @param {React.ReactNode} props.icon - Icon element
 * @param {Date|null} props.start - Start date
 * @param {Date|null} props.end - End date
 * @param {function} props.onChange - Change handler (start, end)
 */
const DateRangeFilter = ({ label, icon, start, end, onChange }) => {
  const hasValue = start !== null || end !== null;

  const formatDateInput = (date) => {
    if (!date) return '';
    return new Date(date).toISOString().split('T')[0];
  };

  const handleClear = () => onChange(null, null);

  return (
    <Dropdown
      className="date-range-filter"
      trigger={
        <FilterButton
          icon={icon}
          label={label}
          value={hasValue ? 'Custom range' : null}
          placeholder="between..."
          active={hasValue}
        />
      }
    >
      <div className="date-range-content">
        <div className="date-range-header">{label} between</div>
        <div className="date-range-fields">
          <div className="date-field">
            <label>From</label>
            <input
              type="date"
              className="date-input"
              value={formatDateInput(start)}
              onChange={(e) => onChange(e.target.value ? new Date(e.target.value) : null, end)}
            />
          </div>
          <div className="date-field">
            <label>To</label>
            <input
              type="date"
              className="date-input"
              value={formatDateInput(end)}
              onChange={(e) => onChange(start, e.target.value ? new Date(e.target.value) : null)}
            />
          </div>
        </div>
        {hasValue && (
          <button className="date-range-clear" onClick={handleClear}>
            Clear
          </button>
        )}
      </div>
    </Dropdown>
  );
};

export default DateRangeFilter;
