export const PRESETS = [
  { id: 'week', label: 'Last Week' },
  { id: 'month', label: 'Last Month' },
  { id: 'year', label: 'Last Year' },
  { id: 'custom', label: 'Custom' },
];

export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const startOfDay = (date) => {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

export const startOfMonth = (date) => {
  const d = startOfDay(date);
  return new Date(d.getFullYear(), d.getMonth(), 1);
};

export const toLocalYmd = (date) => {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const parseLocalYmd = (ymd) => {
  if (!ymd) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd));
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
};

export const getPresetRange = (id, today = new Date()) => {
  const t = startOfDay(today);
  if (id === 'week') {
    const mondayIndex = (t.getDay() + 6) % 7;
    const thisMonday = new Date(t.getFullYear(), t.getMonth(), t.getDate() - mondayIndex);
    const start = new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate() - 7);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
    return { start, end };
  }
  if (id === 'month') {
    return {
      start: new Date(t.getFullYear(), t.getMonth() - 1, 1),
      end: new Date(t.getFullYear(), t.getMonth(), 0),
    };
  }
  if (id === 'year') {
    const y = t.getFullYear() - 1;
    return { start: new Date(y, 0, 1), end: new Date(y, 11, 31) };
  }
  return { start: null, end: null };
};

export const detectPreset = (start, end, today = new Date()) => {
  if (!start || !end) return 'custom';
  const s = toLocalYmd(start);
  const e = toLocalYmd(end);
  for (const id of ['week', 'month', 'year']) {
    const range = getPresetRange(id, today);
    if (toLocalYmd(range.start) === s && toLocalYmd(range.end) === e) return id;
  }
  return 'custom';
};

export const getMonthCells = (viewMonth) => {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startOffset = (first.getDay() + 6) % 7;
  const lastMonIdx = (last.getDay() + 6) % 7;
  const cells = [];
  for (let day = 1 - startOffset; day <= last.getDate() + (6 - lastMonIdx); day += 1) {
    const date = new Date(year, month, day);
    cells.push({ date, inMonth: date.getMonth() === month });
  }
  return cells;
};

export const getDecadeYears = (year) => {
  const start = Math.floor(year / 12) * 12;
  return Array.from({ length: 12 }, (_, i) => start + i);
};

export const formatDayLabel = (date) => {
  if (!date) return '';
  const d = startOfDay(date);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
};

export const formatPreview = (start, end) => {
  if (!start) return { from: 'Pick a start date', to: null, pending: true };
  const fromDay = formatDayLabel(start);
  if (!end) return { from: fromDay, to: 'Pick end date', pending: true };
  const s = startOfDay(start);
  const e = startOfDay(end);
  return {
    from: s.getFullYear() === e.getFullYear() ? fromDay : `${fromDay} ${s.getFullYear()}`,
    to: `${formatDayLabel(end)}, ${e.getFullYear()}`,
    pending: false,
  };
};

export const formatRangeLabel = (start, end) => {
  if (!start && !end) return null;
  const fmt = (d) => `${MONTHS_SHORT[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}`;
  const s = start ? startOfDay(start) : null;
  const e = end ? startOfDay(end) : null;
  if (s && e) {
    if (toLocalYmd(s) === toLocalYmd(e)) return `${fmt(s)}, ${e.getFullYear()}`;
    if (s.getFullYear() === e.getFullYear()) return `${fmt(s)} – ${fmt(e)}, ${e.getFullYear()}`;
    return `${fmt(s)}, ${s.getFullYear()} – ${fmt(e)}, ${e.getFullYear()}`;
  }
  return fmt(s || e);
};

export const orderedRange = (start, end) => {
  if (!start || !end) return { start, end };
  if (toLocalYmd(start) <= toLocalYmd(end)) return { start, end };
  return { start: end, end: start };
};

export const isInRange = (day, start, end) => {
  if (!start || !end) return false;
  const t = toLocalYmd(day);
  return t >= toLocalYmd(start) && t <= toLocalYmd(end);
};
