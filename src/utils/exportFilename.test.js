import { buildExportFilename, getDateRangeFilenameQualifier } from './exportFilename';

describe('export filename helpers', () => {
  it('formats a complete date range for an invoice report', () => {
    const qualifier = getDateRangeFilenameQualifier({
      dateFrom: '2026-06-01',
      dateTo: '2026-06-11',
    });

    expect(qualifier).toBe('01-Jun-2026 to 11-Jun-2026');
    expect(buildExportFilename('Invoice Report', 'pdf', qualifier))
      .toBe('Invoice Report - 01-Jun-2026 to 11-Jun-2026.pdf');
  });

  it('uses a single date when both range dates are the same', () => {
    expect(getDateRangeFilenameQualifier({
      dateFrom: '2026-06-11',
      dateTo: '2026-06-11',
    })).toBe('11-Jun-2026');
  });

  it('describes partial and empty date ranges', () => {
    expect(getDateRangeFilenameQualifier({ dateFrom: '2026-06-01' }))
      .toBe('From 01-Jun-2026');
    expect(getDateRangeFilenameQualifier({ dateTo: '2026-06-11' }))
      .toBe('Up to 11-Jun-2026');
    expect(getDateRangeFilenameQualifier({})).toBe('All Time');
  });
});
