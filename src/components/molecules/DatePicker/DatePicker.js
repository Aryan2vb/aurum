import React, { useState } from 'react';
import Dropdown from '../../atoms/Dropdown/Dropdown';
import Icon from '../../atoms/Icon/Icon';
import CalendarPanel from '../DateRangeFilter/CalendarPanel';
import {
  formatDayLabel,
  parseLocalYmd,
  startOfDay,
  startOfMonth,
  toLocalYmd,
} from '../DateRangeFilter/dateRangePicker';
import '../DateRangeFilter/DateRangeFilter.css';
import './DatePicker.css';

const DatePicker = ({
  value = '',
  onChange,
  placeholder = 'Pick a date',
  disabled = false,
  required = false,
  min,
  max,
  id,
  name,
  className = '',
  triggerClassName = '',
  align = 'left',
  autoOpen = false,
}) => {
  const selected = parseLocalYmd(value);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(selected || new Date()));
  const [panel, setPanel] = useState('day');

  const handleOpenChange = (open) => {
    if (!open) return;
    setViewMonth(startOfMonth(parseLocalYmd(value) || new Date()));
    setPanel('day');
  };

  const label = selected ? `${formatDayLabel(selected)} ${selected.getFullYear()}` : placeholder;

  return (
    <Dropdown
      className={`date-picker ${className}`.trim()}
      align={align}
      defaultOpen={autoOpen && !disabled}
      onOpenChange={handleOpenChange}
      trigger={
        <button
          type="button"
          id={id}
          className={`date-picker-trigger ${!selected ? 'placeholder' : ''} ${triggerClassName}`.trim()}
          disabled={disabled}
        >
          <span>{label}</span>
          <Icon name="date" size={14} />
        </button>
      }
    >
      {({ close }) => (
        <div className="drp-card date-picker-card">
          <CalendarPanel
            viewMonth={viewMonth}
            onViewMonthChange={setViewMonth}
            panel={panel}
            onPanelChange={setPanel}
            selectedStart={selected}
            selectedEnd={selected}
            min={min}
            max={max}
            onDayClick={(date) => {
              onChange?.(toLocalYmd(startOfDay(date)));
              close();
            }}
          />
        </div>
      )}
    </Dropdown>
  );
};

export default DatePicker;
