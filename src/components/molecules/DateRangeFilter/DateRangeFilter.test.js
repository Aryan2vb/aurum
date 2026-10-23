import {
  detectPreset,
  formatPreview,
  formatRangeLabel,
  getDecadeYears,
  getMonthCells,
  getPresetRange,
  parseLocalYmd,
  toLocalYmd,
} from './dateRangePicker';

describe('dateRangePicker helpers', () => {
  const today = new Date(2026, 7, 27); // Thursday 27 Aug 2026

  test('getPresetRange last week is previous Mon–Sun', () => {
    expect(toLocalYmd(getPresetRange('week', today).start)).toBe('2026-08-17');
    expect(toLocalYmd(getPresetRange('week', today).end)).toBe('2026-08-23');
  });

  test('getPresetRange last week from a Monday still uses the previous week', () => {
    const monday = new Date(2026, 7, 24);
    expect(toLocalYmd(getPresetRange('week', monday).start)).toBe('2026-08-17');
    expect(toLocalYmd(getPresetRange('week', monday).end)).toBe('2026-08-23');
  });

  test('getPresetRange last month is previous calendar month', () => {
    expect(toLocalYmd(getPresetRange('month', today).start)).toBe('2026-07-01');
    expect(toLocalYmd(getPresetRange('month', today).end)).toBe('2026-07-31');
  });

  test('getPresetRange last year is previous calendar year', () => {
    expect(toLocalYmd(getPresetRange('year', today).start)).toBe('2025-01-01');
    expect(toLocalYmd(getPresetRange('year', today).end)).toBe('2025-12-31');
  });

  test('getPresetRange this month spans the current calendar month', () => {
    expect(toLocalYmd(getPresetRange('thisMonth', today).start)).toBe('2026-08-01');
    expect(toLocalYmd(getPresetRange('thisMonth', today).end)).toBe('2026-08-31');
  });

  test('getPresetRange this FY runs 1 April – 31 March', () => {
    expect(toLocalYmd(getPresetRange('thisFy', today).start)).toBe('2026-04-01');
    expect(toLocalYmd(getPresetRange('thisFy', today).end)).toBe('2027-03-31');
    const feb = new Date(2027, 1, 10);
    expect(toLocalYmd(getPresetRange('thisFy', feb).start)).toBe('2026-04-01');
    expect(toLocalYmd(getPresetRange('thisFy', feb).end)).toBe('2027-03-31');
  });

  test('detectPreset recognises the current-period presets', () => {
    const fy = getPresetRange('thisFy', today);
    expect(detectPreset(fy.start, fy.end, today)).toBe('thisFy');
    const m = getPresetRange('thisMonth', today);
    expect(detectPreset(m.start, m.end, today)).toBe('thisMonth');
  });

  test('getDecadeYears returns a 12-year block containing the year', () => {
    expect(getDecadeYears(2026)).toEqual([
      2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027,
    ]);
  });

  test('getMonthCells is Monday-first and includes adjacent-month days', () => {
    const cells = getMonthCells(new Date(2023, 9, 1)); // October 2023 starts Sunday
    expect(toLocalYmd(cells[0].date)).toBe('2023-09-25');
    expect(cells[0].inMonth).toBe(false);
    expect(cells[6].inMonth).toBe(true);
    expect(toLocalYmd(cells[6].date)).toBe('2023-10-01');
    expect(toLocalYmd(cells[cells.length - 1].date)).toBe('2023-11-05');
    expect(cells.length % 7).toBe(0);
  });

  test('detectPreset matches computed ranges', () => {
    const week = getPresetRange('week', today);
    expect(detectPreset(week.start, week.end, today)).toBe('week');
    expect(detectPreset(new Date(2026, 2, 1), new Date(2026, 2, 20), today)).toBe('custom');
  });

  test('toLocalYmd / parseLocalYmd round-trip without UTC shift', () => {
    const d = parseLocalYmd('2026-06-01');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(5);
    expect(d.getDate()).toBe(1);
    expect(toLocalYmd(d)).toBe('2026-06-01');
  });

  test('formatRangeLabel covers custom ranges', () => {
    expect(formatRangeLabel(new Date(2026, 2, 1), new Date(2026, 2, 20)))
      .toBe('Mar 01 – Mar 20, 2026');
  });

  test('formatPreview shows pick-end then the full range', () => {
    expect(formatPreview(new Date(2026, 7, 1), null)).toEqual({
      from: '1 Aug',
      to: 'Pick end date',
      pending: true,
    });
    expect(formatPreview(new Date(2026, 7, 1), new Date(2026, 7, 15))).toEqual({
      from: '1 Aug',
      to: '15 Aug, 2026',
      pending: false,
    });
  });

  test('toLocalYmd/parseLocalYmd round-trip keeps the calendar day in any timezone', () => {
    const { start, end } = getPresetRange('week', new Date(2026, 9, 23));
    expect(toLocalYmd(start)).toBe('2026-10-12');
    expect(toLocalYmd(end)).toBe('2026-10-18');
    expect(toLocalYmd(parseLocalYmd('2026-10-12'))).toBe('2026-10-12');
  });
});
