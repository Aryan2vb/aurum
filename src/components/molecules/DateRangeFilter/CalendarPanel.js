import React, { useMemo } from 'react';
import Icon from '../../atoms/Icon/Icon';
import {
  MONTHS_SHORT,
  getDecadeYears,
  getMonthCells,
  isInRange,
  toLocalYmd,
} from './dateRangePicker';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const CalendarPanel = ({
  viewMonth,
  onViewMonthChange,
  panel,
  onPanelChange,
  selectedStart,
  selectedEnd,
  onDayClick,
  onDayEnter,
  onDayLeave,
  min,
  max,
}) => {
  const cells = useMemo(() => getMonthCells(viewMonth), [viewMonth]);
  const years = useMemo(() => getDecadeYears(viewMonth.getFullYear()), [viewMonth]);
  const monthName = viewMonth.toLocaleString('en-US', { month: 'long' });
  const viewYear = viewMonth.getFullYear();
  const minYmd = min || null;
  const maxYmd = max || null;

  const shiftView = (delta) => {
    if (panel === 'year') {
      onViewMonthChange(new Date(viewMonth.getFullYear() + delta * 12, viewMonth.getMonth(), 1));
      return;
    }
    if (panel === 'month') {
      onViewMonthChange(new Date(viewMonth.getFullYear() + delta, viewMonth.getMonth(), 1));
      return;
    }
    onViewMonthChange(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + delta, 1));
  };

  return (
    <div className="drp-calendar">
      <div className="drp-cal-header">
        <button type="button" className="drp-nav" aria-label="Previous" onClick={() => shiftView(-1)}>
          <Icon name="arrowLeft" size={16} />
        </button>
        <div className="drp-cal-title-row">
          {panel === 'day' && (
            <>
              <button type="button" className="drp-title-btn" onClick={() => onPanelChange('month')}>
                {monthName}
              </button>
              <button type="button" className="drp-title-btn" onClick={() => onPanelChange('year')}>
                {viewYear}
              </button>
            </>
          )}
          {panel === 'month' && (
            <button type="button" className="drp-title-btn" onClick={() => onPanelChange('year')}>
              {viewYear}
            </button>
          )}
          {panel === 'year' && (
            <span className="drp-cal-title">{years[0]} – {years[years.length - 1]}</span>
          )}
        </div>
        <button type="button" className="drp-nav" aria-label="Next" onClick={() => shiftView(1)}>
          <Icon name="arrowRight" size={16} />
        </button>
      </div>

      {panel === 'day' && (
        <>
          <div className="drp-weekdays">
            {WEEKDAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="drp-grid" onMouseLeave={onDayLeave}>
            {cells.map(({ date, inMonth }) => {
              const ymd = toLocalYmd(date);
              const isStart = selectedStart && ymd === toLocalYmd(selectedStart);
              const isEnd = selectedEnd && ymd === toLocalYmd(selectedEnd);
              const inRange = isInRange(date, selectedStart, selectedEnd);
              const disabled = Boolean((minYmd && ymd < minYmd) || (maxYmd && ymd > maxYmd));
              const className = [
                'drp-day',
                inMonth ? '' : 'out-month',
                inRange ? 'in-range' : '',
                isStart ? 'range-start' : '',
                isEnd ? 'range-end' : '',
                disabled ? 'disabled' : '',
              ].filter(Boolean).join(' ');

              return (
                <button
                  key={ymd}
                  type="button"
                  className={className}
                  disabled={disabled}
                  onClick={() => !disabled && onDayClick(date)}
                  onMouseEnter={() => onDayEnter?.(date)}
                >
                  <span className="drp-day-num">{date.getDate()}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {panel === 'month' && (
        <div className="drp-picker-grid">
          {MONTHS_SHORT.map((name, monthIndex) => (
            <button
              key={name}
              type="button"
              className={`drp-picker-cell ${monthIndex === viewMonth.getMonth() ? 'active' : ''}`}
              onClick={() => {
                onViewMonthChange(new Date(viewYear, monthIndex, 1));
                onPanelChange('day');
              }}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {panel === 'year' && (
        <div className="drp-picker-grid">
          {years.map((year) => (
            <button
              key={year}
              type="button"
              className={`drp-picker-cell ${year === viewYear ? 'active' : ''}`}
              onClick={() => {
                onViewMonthChange(new Date(year, viewMonth.getMonth(), 1));
                onPanelChange('month');
              }}
            >
              {year}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CalendarPanel;
