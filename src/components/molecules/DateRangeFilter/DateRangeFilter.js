import React, { useMemo, useState } from 'react';
import Dropdown from '../../atoms/Dropdown/Dropdown';
import FilterButton from '../../atoms/FilterButton/FilterButton';
import CalendarPanel from './CalendarPanel';
import {
  PRESETS,
  detectPreset,
  formatPreview,
  formatRangeLabel,
  getPresetRange,
  orderedRange,
  startOfDay,
  startOfMonth,
} from './dateRangePicker';
import './DateRangeFilter.css';

export { toLocalYmd, parseLocalYmd } from './dateRangePicker';

const RangePreview = ({ preview, previewLabel }) => (
  <div className={`drp-preview ${!preview.start ? 'empty' : ''}`}>
    <span className="drp-preview-from">{previewLabel.from}</span>
    {previewLabel.to && (
      <>
        <span className="drp-preview-arrow">→</span>
        <span className={`drp-preview-to ${previewLabel.pending ? 'waiting' : ''}`}>
          {previewLabel.to}
        </span>
      </>
    )}
  </div>
);

const DateRangeFilter = ({ label, icon, start, end, onChange, align = 'left', clearable = true }) => {
  const [draftStart, setDraftStart] = useState(() => (start ? startOfDay(start) : null));
  const [draftEnd, setDraftEnd] = useState(() => (end ? startOfDay(end) : null));
  const [mode, setMode] = useState(() => detectPreset(start, end));
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(end || start || new Date()));
  const [hoverDay, setHoverDay] = useState(null);
  const [panel, setPanel] = useState('day');

  const hasValue = start != null || end != null;

  const committedLabel = useMemo(() => {
    if (!start && !end) return null;
    const preset = detectPreset(start, end);
    if (preset !== 'custom') return PRESETS.find((p) => p.id === preset).label;
    return formatRangeLabel(start, end);
  }, [start, end]);

  const handleOpenChange = (open) => {
    if (!open) return;
    const s = start ? startOfDay(start) : null;
    const e = end ? startOfDay(end) : null;
    setDraftStart(s);
    setDraftEnd(e);
    setMode(detectPreset(s, e));
    setViewMonth(startOfMonth(e || s || new Date()));
    setHoverDay(null);
    setPanel('day');
  };

  const selectPreset = (id) => {
    setMode(id);
    setHoverDay(null);
    setPanel('day');
    if (id === 'custom') return;
    const range = getPresetRange(id);
    setDraftStart(range.start);
    setDraftEnd(range.end);
    setViewMonth(startOfMonth(range.end));
  };

  const handleDayClick = (date) => {
    setMode('custom');
    if (!draftStart || draftEnd) {
      setDraftStart(date);
      setDraftEnd(null);
      setHoverDay(null);
      return;
    }
    if (date < draftStart) {
      setDraftEnd(draftStart);
      setDraftStart(date);
    } else {
      setDraftEnd(date);
    }
    setHoverDay(null);
  };

  const preview = orderedRange(
    draftStart,
    mode === 'custom' && draftStart && !draftEnd && hoverDay ? hoverDay : draftEnd
  );

  const canApply = Boolean(draftStart && draftEnd);
  const previewLabel = formatPreview(preview.start, preview.end);

  return (
    <Dropdown
      className="date-range-filter"
      align={align}
      onOpenChange={handleOpenChange}
      trigger={
        <FilterButton
          icon={icon}
          label={label}
          value={hasValue ? committedLabel : null}
          placeholder="between..."
          active={hasValue}
        />
      }
    >
      {({ close }) => (
        <div className="drp-card">
          <RangePreview preview={preview} previewLabel={previewLabel} />

          <div className="drp-sidebar">
            <div className="drp-presets">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={`drp-preset ${mode === preset.id ? 'active' : ''}`}
                  onClick={() => selectPreset(preset.id)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="drp-actions">
              {clearable && hasValue && (
                <button
                  type="button"
                  className="drp-clear"
                  onClick={() => {
                    onChange(null, null);
                    close();
                  }}
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                className="drp-apply"
                disabled={!canApply}
                onClick={() => {
                  if (!canApply) return;
                  onChange(draftStart, draftEnd);
                  close();
                }}
              >
                Apply
              </button>
            </div>
          </div>

          <CalendarPanel
            viewMonth={viewMonth}
            onViewMonthChange={setViewMonth}
            panel={panel}
            onPanelChange={setPanel}
            selectedStart={preview.start}
            selectedEnd={preview.end}
            onDayClick={handleDayClick}
            onDayEnter={(date) => mode === 'custom' && setHoverDay(date)}
            onDayLeave={() => setHoverDay(null)}
          />
        </div>
      )}
    </Dropdown>
  );
};

export default DateRangeFilter;
