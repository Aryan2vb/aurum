import fs from 'fs';
import { getAdvanceTotalIn as getTotalIn } from '../../utils/advanceTotals';
import path from 'path';

describe('AdvancePage selection and exports', () => {
  const advancePageSource = fs.readFileSync(path.join(__dirname, 'AdvancePage.js'), 'utf8');

  it('restores the leftmost checkbox selection column', () => {
    expect(advancePageSource).toContain("id: 'select'");
    expect(advancePageSource).toContain('<Checkbox');
    expect(advancePageSource).toContain('rowSelection');
    expect(advancePageSource).toContain('setRowSelection');
  });

  it('wires up ImportExportMenu with Advance Report filename and customer balance flattener', () => {
    expect(advancePageSource).toContain('<ImportExportMenu');
    expect(advancePageSource).toContain('filename="Advance Report"');
    expect(advancePageSource).toContain('resourceName="advances"');
    expect(advancePageSource).toContain('flattenRow={flattenAdvanceData}');
    expect(advancePageSource).toContain('columnGroups={ADVANCE_COLUMN_GROUPS}');
  });

  it('exports selected rows when selected, otherwise filtered rows', () => {
    expect(advancePageSource).toContain('selectedCount > 0');
    expect(advancePageSource).toContain('exportData');
  });

  it('clears selection when filtered rows change', () => {
    expect(advancePageSource).toContain('filteredIds');
    expect(advancePageSource).toContain('setRowSelection');
  });

  it('does not contain delete action in the table (keeps deletion in slide-over only)', () => {
    expect(advancePageSource).not.toContain('deleteAdvanceEntry');
    expect(advancePageSource).not.toContain('Delete this entry');
  });

  it('Received includes transfers in and corrections, so each row adds up to the balance', () => {
    const row = {
      customerName: 'Aryan Soni',
      totalReceived: '10000',
      totalApplied: '1000',
      totalTransferOut: '0',
      totalTransferIn: '1000',
      totalRefunded: '0',
      totalCorrectionCredit: '90',
      totalCorrectionDebit: '0',
      availableBalance: '10090',
    };
    const received = getTotalIn(row);
    expect(received).toBe(11090);
    const returned = Number(row.totalRefunded) + Number(row.totalTransferOut);
    expect(received - Number(row.totalApplied) - returned).toBe(Number(row.availableBalance));
  });
});
