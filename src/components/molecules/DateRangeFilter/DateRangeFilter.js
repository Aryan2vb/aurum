import React, { useMemo } from 'react';
import Dropdown from '../../atoms/Dropdown/Dropdown';
import FilterButton from '../../atoms/FilterButton/FilterButton';
import './DateRangeFilter.css';

/**
 * Filter presets for quick selection
 */
const PRESETS = [
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: 'fy', label: 'Current FY' }
];

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

  const applyPreset = (id) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let s, e;

    switch (id) {
      case '7d':
        s = new Date(today);
        s.setDate(today.getDate() - 7);
        e = today;
        break;
      case '30d':
        s = new Date(today);
        s.setDate(today.getDate() - 30);
        e = today;
        break;
      case 'fy':
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth(); // 0-indexed, April is 3
        const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;
        s = new Date(fyStartYear, 3, 1); // April 1st
        e = today;
        break;
      default:
        return;
    }
    onChange(s, e);
  };

  const activePresetLabel = useMemo(() => {
    if (!start || !end) return null;
    
    // Convert to simple date strings for comparison
    const sStr = formatDateInput(start);
    const eStr = formatDateInput(end);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayStr = formatDateInput(today);
    
    // Check presets
    const d7 = new Date(today);
    d7.setDate(today.getDate() - 7);
    if (sStr === formatDateInput(d7) && eStr === todayStr) return 'Last 7 days';
    
    const d30 = new Date(today);
    d30.setDate(today.getDate() - 30);
    if (sStr === formatDateInput(d30) && eStr === todayStr) return 'Last 30 days';
    
    const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const fyStart = new Date(fyStartYear, 3, 1);
    if (sStr === formatDateInput(fyStart) && eStr === todayStr) return 'Current FY';
    
    return 'Custom range';
  }, [start, end]);

  return (
    <Dropdown
      className="date-range-filter"
      trigger={
        <FilterButton
          icon={icon}
          label={label}
          value={hasValue ? activePresetLabel : null}
          placeholder="between..."
          active={hasValue}
        />
      }
    >
      <div className="date-range-content">
        <div className="date-range-presets">
          {PRESETS.map((preset) => (
            <button key={preset.id} className="preset-btn" onClick={() => applyPreset(preset.id)}>
              {preset.label}
            </button>
          ))}
        </div>
        <div className="date-range-header">Or custom range</div>
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
