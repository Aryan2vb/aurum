import React, { useState, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Dropdown, { DropdownItem, DropdownDivider } from '../../atoms/Dropdown/Dropdown';
import { buildExportFilename } from '../../../utils/exportFilename';
import { flattenInvoiceDataByPayment, ADVANCE_COLUMN_GROUPS, ADVANCE_COLUMNS } from '../../../utils/exportUtils';
import {
  appendAdvanceSummaryPage,
  appendAdvanceTotalsRow,
  isAdvanceTotalsRow,
} from '../../../utils/advanceReportSummary';
import {
  appendInvoicePeriodSummaryPage,
  fetchInvoicePeriodSummary,
  stampPdfPageFooters,
} from '../../../utils/invoicePeriodSummary';
import './ImportExportMenu.css';

const MM_TO_PT = 72 / 25.4;
export const FS_LANDSCAPE_FORMAT_PT = [345 * MM_TO_PT, 215 * MM_TO_PT];

// Icons
const DownloadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const UploadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);

const ChevronIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: '4px' }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

// ============================================
// COLUMN GROUPS (defines display order + grouping for the picker)
// ============================================
const INVOICE_COLUMN_GROUPS = [
  {
    id: 'invoice',
    label: 'Invoice Info',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
      </svg>
    ),
    cols: ['Serial No.', 'Invoice No.', 'Date'],
  },
  {
    id: 'customer',
    label: 'Customer Details',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
    cols: ['Customer Name', 'Last Name', 'Address', 'Contact No.', 'Gst No'],
  },
  {
    id: 'items',
    label: 'Item Details',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
        <line x1="7" y1="7" x2="7.01" y2="7"/>
      </svg>
    ),
    cols: ['Metal', 'Hsn', 'Item Name', 'Purity', 'Net Wt. Gold', 'Net Wt. Silver', 'Metel Rate PG', 'Labour PG', 'Labour Total', 'Hallmark Chrgs', 'Amount'],
  },
  {
    id: 'tax',
    label: 'Tax & Total',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
    cols: ['CGST', 'SGST', 'Round off', 'Total'],
  },
  {
    id: 'payment',
    label: 'Payment Details',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
        <line x1="1" y1="10" x2="23" y2="10"/>
      </svg>
    ),
    cols: ['UPI', 'Swipe', 'Cheque', 'Bank Transfer', 'Cash', 'Other'],
  },
  {
    id: 'payment_breakdown',
    label: 'Payment Breakdown',
    hint: '→ one row per payment',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="5" width="20" height="14" rx="2"/>
        <path d="M2 10h20"/>
      </svg>
    ),
    cols: ['Payment Date', 'Payment Mode', 'Payment Source', 'Payment Amount', 'Payment Ref'],
  },
];

// Group checkbox: renders a tri-state checkbox (all / partial / none)
const GroupCheckbox = ({ state, onChange }) => (
  <span
    className={`col-picker-group-checkbox ${state}`}
    onClick={onChange}
    role="checkbox"
    aria-checked={state === 'all' ? true : state === 'none' ? false : 'mixed'}
  >
    {state === 'all' && (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    )}
    {state === 'partial' && (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    )}
  </span>
);

// ============================================
// COLUMN PICKER MODAL
// ============================================
const ColumnPickerModal = ({ columns, onConfirm, onCancel, exportFormat, columnGroups }) => {
  // Use the provided column groups (advance, etc.) or fall back to invoice groups
  const groupSource = columnGroups || INVOICE_COLUMN_GROUPS;

  // Only include groups whose columns exist in the provided `columns` list
  const activeGroups = groupSource
    .map(g => ({ ...g, cols: g.cols.filter(c => columns.includes(c)) }))
    .filter(g => g.cols.length > 0);

  // If none of the groups cover all columns, fall back to a flat list
  const coveredCols = new Set(activeGroups.flatMap(g => g.cols));
  const uncoveredCols = columns.filter(c => !coveredCols.has(c));
  const groups = uncoveredCols.length > 0
    ? [...activeGroups, { id: '__other', label: 'Other', icon: null, cols: uncoveredCols }]
    : activeGroups;

  const [selected, setSelected] = useState(() => {
    const init = {};
    columns.forEach(col => { init[col] = true; });
    return init;
  });

  // All groups collapsed by default
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  const toggleExpand = useCallback((groupId) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(groupId) ? next.delete(groupId) : next.add(groupId);
      return next;
    });
  }, []);

  const selectedCols = columns.filter(col => selected[col]);
  const allSelected  = columns.every(col =>  selected[col]);

  const toggle = useCallback((col) => {
    setSelected(prev => ({ ...prev, [col]: !prev[col] }));
  }, []);

  const selectAll   = () => { const s = {}; columns.forEach(c => { s[c] = true;  }); setSelected(s); };
  const unselectAll = () => { const s = {}; columns.forEach(c => { s[c] = false; }); setSelected(s); };

  const toggleGroup = useCallback((groupCols) => {
    const allGroupSelected = groupCols.every(c => selected[c]);
    setSelected(prev => {
      const next = { ...prev };
      groupCols.forEach(c => { next[c] = !allGroupSelected; });
      return next;
    });
  }, [selected]);

  const getGroupState = (groupCols) => {
    const count = groupCols.filter(c => selected[c]).length;
    if (count === 0) return 'none';
    if (count === groupCols.length) return 'all';
    return 'partial';
  };

  const handleConfirm = () => {
    if (selectedCols.length === 0) return;
    onConfirm(selectedCols);
  };

  return (
    <div className="col-picker-overlay" onClick={onCancel}>
      <div className="col-picker-modal" onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="col-picker-header">
          <div className="col-picker-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
            </svg>
            <span>Select Columns to Export</span>
            <span className="col-picker-format-badge">{exportFormat.toUpperCase()}</span>
          </div>
          <button className="col-picker-close" onClick={onCancel}><CloseIcon /></button>
        </div>

        {/* ── Global actions ── */}
        <div className="col-picker-actions">
          <button
            className="col-picker-action-btn"
            onClick={allSelected ? unselectAll : selectAll}
          >
            {allSelected ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
                Unselect All
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Select All
              </>
            )}
          </button>
          <span className="col-picker-count">{selectedCols.length} / {columns.length} selected</span>
        </div>

        {/* ── Grouped column list ── */}
        <div className="col-picker-body">
          {groups.map(group => {
            const groupState = getGroupState(group.cols);
            const isExpanded = expandedGroups.has(group.id);
            return (
              <div key={group.id} className={`col-picker-group ${group.id === 'payment_breakdown' ? 'col-picker-group--payment' : ''}`}>
                {/* Group header row */}
                <div className="col-picker-group-header">
                  {/* Checkbox: select/deselect all in group */}
                  <span onClick={(e) => { e.stopPropagation(); toggleGroup(group.cols); }}>
                    <GroupCheckbox state={groupState} onChange={() => toggleGroup(group.cols)} />
                  </span>
                  {/* Rest of header: click to expand/collapse */}
                  <div className="col-picker-group-header-main" onClick={() => toggleExpand(group.id)}>
                    <span className="col-picker-group-icon">{group.icon}</span>
                    <span className="col-picker-group-label">{group.label}</span>
                    {group.hint && <span className="col-picker-group-hint">{group.hint}</span>}
                    <span className="col-picker-group-counter">
                      {group.cols.filter(c => selected[c]).length}/{group.cols.length}
                    </span>
                    {/* Chevron */}
                    <svg
                      className={`col-picker-chevron ${isExpanded ? 'expanded' : ''}`}
                      width="12" height="12" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="2.5"
                    >
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </div>
                </div>

                {/* Individual columns — only when expanded */}
                {isExpanded && (
                  <div className="col-picker-group-cols">
                    {group.cols.map((col, idx) => (
                      <label
                        key={col}
                        className={`col-picker-item ${selected[col] ? 'checked' : ''}`}
                        onClick={e => e.stopPropagation()}
                        title={col}
                      >
                        <input
                          type="checkbox"
                          className="col-picker-checkbox"
                          checked={!!selected[col]}
                          onChange={() => toggle(col)}
                          id={`col-picker-${group.id}-${idx}`}
                        />
                        <span className="col-picker-checkmark">
                          {selected[col] && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          )}
                        </span>
                        <span className="col-picker-label">{col}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Footer ── */}
        <div className="col-picker-footer">
          <button className="col-picker-cancel" onClick={onCancel}>Cancel</button>
          <button
            className="col-picker-export"
            onClick={handleConfirm}
            disabled={selectedCols.length === 0}
          >
            <DownloadIcon />
            Export {selectedCols.length > 0 ? `${selectedCols.length} columns` : ''}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Generic Import/Export menu component
 * @param {Object} props
 * @param {Array} props.data - Data to export
 * @param {string} props.filename - Base filename for exports
 * @param {string} props.filenameQualifier - Optional human-readable detail appended to the filename
 * @param {string} props.sheetName - Name of the worksheet in Excel
 * @param {function} props.onImport - Import handler (receives file). If null, import is hidden.
 * @param {function} props.flattenRow - Function to flatten a single row. Can return an object or array of objects.
 * @param {function} props.onExportTrigger - Optional async function to fetch data for export.
 * @param {function} props.onBillBookExport - Optional handler for exporting complete invoice bills.
 * @param {boolean} props.isLoading - Loading state for async export.
 * @param {number} props.selectedCount - Number of selected items (for display)
 * @param {string} props.resourceName - Name of the resource (e.g., 'customers', 'invoices')
 * @param {object} props.periodSummaryFilters - dateFrom/dateTo/customerId for the invoice PDF summary page
 * @param {Array} props.columnGroups - Optional column group definitions for the column picker (defaults to invoice groups)
 */
const ImportExportMenu = ({ 
  data = [], 
  filename = 'export',
  filenameQualifier,
  sheetName = 'Sheet1',
  onImport,
  flattenRow,
  onExportTrigger,
  onBillBookExport,
  isLoading = false,
  selectedCount = 0,
  resourceName = 'items',
  periodSummaryFilters = null,
  columnGroups = null,
}) => {
  const hasSelection = selectedCount > 0;

  // Rows the last export was built from; the invoice PDF summary page is computed from them.
  const sourceRowsRef = useRef([]);

  // Column picker state
  const [colPicker, setColPicker] = useState(null); // null | { format, columns, flattenedData }

  // All available invoice columns in display order
  const INVOICE_COLUMNS = [
    'Serial No.', 'Invoice No.', 'Date',
    'Customer Name', 'Last Name', 'Address', 'Contact No.',
    'Metal', 'Hsn', 'Item Name', 'Purity', 'Net Wt. Gold', 'Net Wt. Silver',
    'Metel Rate PG', 'Labour PG', 'Labour Total', 'Hallmark Chrgs', 'Amount',
    'CGST', 'SGST', 'Round off', 'Total',
    'UPI', 'Swipe', 'Cheque', 'Bank Transfer', 'Cash', 'Other',
    'Gst No',
    // ── Payment breakdown (one row per payment) ──
    'Payment Date', 'Payment Mode', 'Payment Source', 'Payment Amount', 'Payment Ref',
  ];

  // Columns that trigger per-payment row expansion
  const PAYMENT_DETAIL_COLS = new Set(['Payment Date', 'Payment Mode', 'Payment Source', 'Payment Amount', 'Payment Ref']);

  // selectedCols is optional — when provided and includes any PAYMENT_DETAIL_COLS,
  // we switch to the payment-aware flattener (one row per payment).
  const getFlattenedData = async (selectedCols = null) => {
    let dataToExport = data;
    
    if (onExportTrigger) {
      const fetchedData = await onExportTrigger();
      if (!fetchedData || (Array.isArray(fetchedData) && fetchedData.length === 0)) {
        return [];
      }
      dataToExport = fetchedData;
    }

    if (!flattenRow) {
      return dataToExport;
    }

    // Determine whether to use payment-aware flattening
    const usePaymentExpansion =
      resourceName === 'invoices' &&
      selectedCols !== null &&
      selectedCols.some(c => PAYMENT_DETAIL_COLS.has(c));

    const rowFlattener = usePaymentExpansion
      ? flattenInvoiceDataByPayment
      : flattenRow;
    
    // Some flattening functions (like for invoices) might return an array of rows per original item
    // We flatten everything into a single array
    let flattened = dataToExport.flatMap(item => {
      const result = rowFlattener(item);
      return Array.isArray(result) ? result : [result];
    });

    sourceRowsRef.current = dataToExport;

    // Post-processing for Invoices (Continuous Serial No. and Aggregation Row)
    if (resourceName === 'invoices' && flattened.length > 0) {
      // 1. Continuous Serial No.
      flattened = flattened.map((row, idx) => ({
        ...row,
        'Serial No.': idx + 1
      }));

      // 2. Calculation for Totals Row
      const numericColumns = usePaymentExpansion
        ? ['Net Wt. Gold', 'Net Wt. Silver', 'Amount', 'Labour Total',
           'Hallmark Chrgs', 'CGST', 'SGST', 'Round off', 'Total',
           'Payment Amount']
        : ['Net Wt. Gold', 'Net Wt. Silver', 'Amount', 'Labour Total',
           'Hallmark Chrgs', 'CGST', 'SGST', 'Round off', 'Total',
           'UPI', 'Swipe', 'Cheque', 'Bank Transfer', 'Cash', 'Other'];

      const totals = {
        'Serial No.': 'TOTAL',
        'Invoice No.': '',
        'Date': '',
        'Customer Name': '',
        'Last Name': '',
        'Item Name': `${flattened.length} rows`
      };

      numericColumns.forEach(col => {
        const sum = flattened.reduce((acc, row) => acc + (parseFloat(row[col]) || 0), 0);
        totals[col] = sum.toFixed(col.includes('Wt') ? 3 : 2);
      });

      flattened.push(totals);
    }

    // Advances: TOTAL row at the bottom, like the invoice report
    if (resourceName === 'advances' && flattened.length > 0) {
      flattened = appendAdvanceTotalsRow(flattened);
    }

    return flattened;
  };

  // ── Shared: prepare data then open column picker ──────────────────────────
  // We open the picker FIRST (with no data yet), then fetch on confirm so that
  // we know which columns the user wants before deciding which flattener to use.
  const openColPicker = async (format, close) => {
    if (!onExportTrigger && !hasSelection && data.length === 0) {
      alert(`Please select at least one ${resourceName} to export`);
      close();
      return;
    }

    // Determine columns to show in picker (no data fetch needed yet)
    let columns;
    if (resourceName === 'invoices') {
      columns = INVOICE_COLUMNS;
    } else if (resourceName === 'advances') {
      columns = ADVANCE_COLUMNS;
    } else {
      // For non-invoice resources, derive columns from the already-loaded data
      const headersSet = new Set();
      (data || []).forEach(item => Object.keys(item).forEach(k => headersSet.add(k)));
      columns = Array.from(headersSet);
    }

    close(); // close the dropdown
    // Pass null for flattenedData — we'll fetch after the user confirms columns
    setColPicker({ format, columns, flattenedData: null });
  };

  // ── Perform actual CSV export after column selection ──────────────────────
  const doExportCSV = useCallback((flattenedData, selectedCols) => {
    const rows = flattenedData.map(item =>
      selectedCols.map(h => item[h] ?? '')
    );

    const csvContent = [
      selectedCols.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = buildExportFilename(filename, 'csv', filenameQualifier);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [filename, filenameQualifier]);

  // ── Perform actual XLSX export after column selection ─────────────────────
  const doExportExcel = useCallback((flattenedData, selectedCols) => {
    let worksheet;
    const workbook = XLSX.utils.book_new();

    if (resourceName === 'invoices') {
      // Map selectedCols to their group categories for header rows
      const GROUP_DEFS = [
        { label: 'Customer Details',    cols: ['Customer Name', 'Last Name', 'Address', 'Contact No.'] },
        { label: 'Item Details',        cols: ['Metal', 'Hsn', 'Item Name', 'Purity', 'Net Wt. Gold', 'Net Wt. Silver', 'Metel Rate PG', 'Labour PG', 'Labour Total', 'Hallmark Chrgs', 'Amount', 'CGST', 'SGST', 'Round off'] },
        { label: 'Payment Details',     cols: ['UPI', 'Swipe', 'Cheque', 'Bank Transfer', 'Cash', 'Other'] },
        { label: 'Payment Breakdown',   cols: ['Payment Date', 'Payment Mode', 'Payment Source', 'Payment Amount', 'Payment Ref'] },
      ];
      // Columns that stand alone — header spans both rows (no group sub-label)
      const SOLO_COLS = new Set([
        'Serial No.', 'Invoice No.', 'Date', 'Total', 'Gst No',
        // Payment breakdown columns: each stands alone (no sub-row needed)
        'Payment Date', 'Payment Mode', 'Payment Source', 'Payment Amount', 'Payment Ref',
      ]);

      // Build group header row (row 1) and sub-label row (row 2)
      const headRow1 = [];
      const headRow2 = [];

      selectedCols.forEach(col => {
        if (SOLO_COLS.has(col)) {
          headRow1.push(col);
          headRow2.push('');        // blank in row 2 — will be merged vertically
        } else {
          const group = GROUP_DEFS.find(g => g.cols.includes(col));
          headRow1.push(group ? group.label : col);
          headRow2.push(col);
        }
      });


      // Build merge ranges: merge group header cells for consecutive same-group labels
      const merges = [];
      // Merge solo-col header cells row-wise (row 0 and row 1)
      selectedCols.forEach((col, colIdx) => {
        if (SOLO_COLS.has(col)) {
          merges.push({ s: { r: 0, c: colIdx }, e: { r: 1, c: colIdx } });
        }
      });
      // Merge consecutive identical group-header cells in row 0
      let i = 0;
      while (i < headRow1.length) {
        if (SOLO_COLS.has(selectedCols[i])) { i++; continue; }
        let j = i + 1;
        while (j < headRow1.length && headRow1[j] === headRow1[i] && !SOLO_COLS.has(selectedCols[j])) j++;
        if (j - i > 1) merges.push({ s: { r: 0, c: i }, e: { r: 0, c: j - 1 } });
        i = j;
      }

      const dataRows = flattenedData.map(row =>
        selectedCols.map(col => {
          const val = row[col] ?? '';
          return val;
        })
      );

      worksheet = XLSX.utils.aoa_to_sheet([headRow1, headRow2, ...dataRows]);
      worksheet['!merges'] = merges;

      // Auto-size columns
      const colWidths = selectedCols.map((col) => {
        let maxWidth = col.length;
        flattenedData.forEach(row => {
          const val = String(row[col] || '');
          if (val.length > maxWidth) maxWidth = val.length;
        });
        return { wch: Math.min(maxWidth + 2, 50) };
      });
      worksheet['!cols'] = colWidths;
    } else {
      // Generic: single-level header
      const dataRows = flattenedData.map(row => selectedCols.map(col => row[col] ?? ''));
      worksheet = XLSX.utils.aoa_to_sheet([selectedCols, ...dataRows]);

      const colWidths = selectedCols.map(col => {
        let maxWidth = col.length;
        flattenedData.forEach(row => {
          const val = String(row[col] || '');
          if (val.length > maxWidth) maxWidth = val.length;
        });
        return { wch: Math.min(maxWidth + 2, 50) };
      });
      worksheet['!cols'] = colWidths;
    }

    // Center all cells
    for (const key in worksheet) {
      if (key.startsWith('!')) continue;
      worksheet[key].s = {
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true }
      };
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, buildExportFilename(filename, 'xlsx', filenameQualifier));
  }, [filename, filenameQualifier, sheetName, resourceName]);

  // ── Handle confirmation from column picker ────────────────────────────────
  const handleColPickerConfirm = useCallback(async (selectedCols) => {
    if (!colPicker) return;
    const { format } = colPicker;
    setColPicker(null);

    // Now fetch data using the correct flattener (payment-aware if needed)
    const flattenedData = await getFlattenedData(selectedCols);
    if (!flattenedData || flattenedData.length === 0) return;

    if (format === 'csv') {
      doExportCSV(flattenedData, selectedCols);
    } else if (format === 'xlsx') {
      doExportExcel(flattenedData, selectedCols);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colPicker, doExportCSV, doExportExcel]);

  const handleColPickerCancel = useCallback(() => {
    setColPicker(null);
  }, []);

  // ── PDF export (unchanged — no column picker for PDF) ─────────────────────
  const exportToPDF = async (close) => {
    if (!onExportTrigger && !hasSelection && data.length === 0) {
      alert(`Please select at least one ${resourceName} to export`);
      close();
      return;
    }

    const flattenedData = await getFlattenedData();
    if (flattenedData.length === 0) {
      close();
      return;
    }

    // Separate totals row from data rows
    const isInvoice = resourceName === 'invoices';
    const isAdvance = resourceName === 'advances';
    let dataRows = flattenedData;
    let totalsRow = null;
    if (isAdvance && isAdvanceTotalsRow(flattenedData[flattenedData.length - 1])) {
      totalsRow = flattenedData[flattenedData.length - 1];
      dataRows = flattenedData.slice(0, -1);
    }
    if (isInvoice && flattenedData.length > 0) {
      const lastRow = flattenedData[flattenedData.length - 1];
      if (lastRow['Serial No.'] === 'TOTAL') {
        totalsRow = lastRow;
        dataRows = flattenedData.slice(0, -1);
      }
    }

    // Invoice PDFs end with a PERIOD SUMMARY page (sales, GST, collections, inventory flow).
    // A failed fetch must not block the export, so the page is simply left out.
    let periodSummary = null;
    if (isInvoice) {
      try {
        periodSummary = await fetchInvoicePeriodSummary(
          periodSummaryFilters || {},
          sourceRowsRef.current || [],
        );
      } catch (err) {
        console.error('Period summary fetch failed', err);
      }
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: FS_LANDSCAPE_FORMAT_PT });
    const pageW = doc.internal.pageSize.getWidth();

    // ── Title bar — black fill, white text (prints cleanly on green paper) ──
    doc.setFillColor(0, 0, 0);
    doc.rect(0, 0, pageW, 36, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    const title = isInvoice ? 'INVOICE REPORT' : (filename && filename !== 'export' ? filename.toUpperCase() : `${(resourceName || 'REPORT').toUpperCase()}`);
    doc.text(title, 28, 23);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    doc.text(`Generated: ${dateStr}`, pageW - 28, 23, { align: 'right' });
    doc.setTextColor(0, 0, 0);

    if (isInvoice) {
      // ── Column keys (match exportUtils order) ────────────────────────────
      const colKeys = [
        'Serial No.', 'Invoice No.', 'Date',
        'Customer Name', 'Last Name', 'Address', 'Contact No.',
        'Metal', 'Hsn', 'Item Name', 'Purity', 'Net Wt. Gold', 'Net Wt. Silver',
        'Metel Rate PG', 'Labour PG', 'Labour Total', 'Hallmark Chrgs', 'Amount', 'CGST', 'SGST', 'Round off',
        'Total',
        'UPI', 'Swipe', 'Cheque', 'Bank Transfer', 'Cash', 'Other',
        'Gst No'
      ];

      const subLabels = [
        'S.No', 'Invoice No.', 'Date',
        'Cust. Name', 'Last Name', 'Address', 'Contact',
        'Metal', 'HSN', 'Item', 'Purity', 'Wt. Gold', 'Wt. Silver',
        'Rate/g', 'Labour/g', 'Labour', 'Hallmark', 'Amount', 'CGST', 'SGST', 'Round off',
        'Total',
        'UPI', 'Swipe', 'Cheque', 'Bank Tfr', 'Cash', 'Other',
        'GST No'
      ];

      // Group definitions: [label, startColIdx, endColIdx (inclusive)]
      // Columns: 0=S.No, 1=Inv, 2=Date, 3-6=Customer(4), 7-20=Items(14: Metal,Hsn,Item,Purity,WtG,WtS,Rate,LabPG,Lab,Hall,Amt,CGST,SGST,Round), 21=Total, 22-27=Payment(6), 28=GSTNo
      const groups = [
        ['S.No',             0,  0],
        ['Invoice No.',      1,  1],
        ['Date',             2,  2],
        ['Customer Details', 3,  6],
        ['Item Details',     7, 20],
        ['Total',           21, 21],
        ['Payment Details', 22, 27],
        ['GST No',          28, 28],
      ];

      // Build group header row — show label only at the first col of each group
      const headRow1 = subLabels.map((_, colIdx) => {
        const group = groups.find(([, s, e]) => colIdx >= s && colIdx <= e);
        if (!group) return '';
        const [label, start] = group;
        return colIdx === start ? label : '';
      });

      // Build body
      const body = dataRows.map(row => colKeys.map(k => row[k] ?? ''));
      if (totalsRow) {
        body.push(colKeys.map(k => totalsRow[k] ?? ''));
      }

      // Column widths (raw proportions) — scaled to fit exactly within page margins
      const margin = { top: 44, left: 14, right: 14, bottom: 22 };
      const availableWidth = pageW - margin.left - margin.right;
      const rawWidths = [
        28, 68, 50,              // S.No, Invoice, Date
        58, 48, 68, 50,          // Customer (4)
        34, 34, 58, 34, 42, 42, 42, 42, 42, 42, 48, 36, 36, 38, // Items (14: Metal,Hsn,Item,Purity,WtG,WtS,Rate,LabPG,Lab,Hall,Amt,CGST,SGST,Round)
        48,                      // Total
        42, 38, 42, 48, 38, 38,  // Payment (6)
        52                       // GST No
      ];
      const rawTotal = rawWidths.reduce((a, b) => a + b, 0);
      const scale = availableWidth / rawTotal;
      const scaledWidths = rawWidths.map(w => w * scale);

      autoTable(doc, {
        startY: 44,
        margin,
        head: [headRow1, subLabels],
        body,
        // B&W palette — safe on green paper with a monochrome printer
        theme: 'grid',
        styles: {
          fontSize: 6.5,
          cellPadding: 2.5,
          halign: 'center',
          valign: 'middle',
          overflow: 'linebreak',
          textColor: [0, 0, 0],
          fillColor: false,          // transparent — green paper shows through
          lineColor: [80, 80, 80],
          lineWidth: 0.4,
        },
        headStyles: {
          fillColor: [60, 60, 60],   // dark gray — group header row
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 7,
        },
        alternateRowStyles: {
          fillColor: [220, 220, 220], // light gray stripe — subtle on green
        },
        columnStyles: scaledWidths.reduce((acc, w, i) => {
          acc[i] = { cellWidth: w };
          return acc;
        }, {}),
        didParseCell: (data) => {
          // Sub-header row (row index 1) — medium gray
          if (data.section === 'head' && data.row.index === 1) {
            data.cell.styles.fillColor = [120, 120, 120];
            data.cell.styles.textColor = [255, 255, 255];
            data.cell.styles.fontStyle = 'bold';
          }
          // Totals row (last body row) — white fill, bold, thick top border
          if (data.section === 'body' && totalsRow && data.row.index === body.length - 1) {
            data.cell.styles.fillColor = [255, 255, 255];
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fontSize = 7;
            data.cell.styles.lineWidth = { top: 1.2, right: 0.4, bottom: 0.4, left: 0.4 };
          }
        },
        didDrawPage: (data) => {
          // With a summary page the footers are stamped once at the end, with the final count.
          if (periodSummary) return;
          const pageCount = doc.internal.getNumberOfPages();
          doc.setFontSize(8);
          doc.setTextColor(80);
          doc.text(
            `Page ${data.pageNumber} of ${pageCount}`,
            pageW / 2,
            doc.internal.pageSize.getHeight() - 12,
            { align: 'center' }
          );
        },
      });

      if (periodSummary) {
        appendInvoicePeriodSummaryPage(doc, periodSummary);
        stampPdfPageFooters(doc);
      }

    } else {
      // ── Generic single-level table ────────────────────────────────────────
      const headers = Object.keys(flattenedData[0] || {});
      const body = dataRows.map(row => headers.map(h => row[h] ?? ''));
      if (totalsRow) body.push(headers.map(h => totalsRow[h] ?? ''));
      autoTable(doc, {
        startY: 44,
        head: [headers],
        body,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 3, halign: 'center', valign: 'middle', fillColor: false, lineColor: [80, 80, 80], lineWidth: 0.4 },
        headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [220, 220, 220] },
        didParseCell: (data) => {
          // Totals row (last body row) — white fill, bold, thick top border (same as invoices)
          if (data.section === 'body' && totalsRow && data.row.index === body.length - 1) {
            data.cell.styles.fillColor = [255, 255, 255];
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.lineWidth = { top: 1.2, right: 0.4, bottom: 0.4, left: 0.4 };
          }
        },
      });
      if (isAdvance) {
        appendAdvanceSummaryPage(doc, sourceRowsRef.current || []);
      }
      stampPdfPageFooters(doc);
    }

    doc.save(buildExportFilename(filename, 'pdf', filenameQualifier));
    close();
  };

  const handleImportClick = (close) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.xlsx';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file && onImport) {
        onImport(file);
      }
    };
    input.click();
    close();
  };

  const trigger = ({ isOpen }) => (
    <button className={`import-export-btn ${isOpen ? 'open' : ''} ${isLoading ? 'loading' : ''}`} disabled={isLoading}>
      {isLoading ? (
        <span className="btn-spinner" />
      ) : (
        <DownloadIcon />
      )}
      <span>{isLoading ? 'Preparing...' : (onImport ? 'Import / Export' : 'Export')}</span>
      {!isLoading && <ChevronIcon />}
    </button>
  );

  const exportLabel = hasSelection
    ? `Export ${selectedCount} selected as`
    : (onExportTrigger
        ? `Export all matching filters as`
        : `Export all visible rows as`);

  return (
    <>
      <Dropdown className="import-export-menu" trigger={trigger} align="right">
        {({ close }) => (
          <>
            <DropdownItem 
              icon={<DownloadIcon />} 
              onClick={() => openColPicker('csv', close)}
            >
              {exportLabel} CSV
            </DropdownItem>
            <DropdownItem 
              icon={<DownloadIcon />} 
              onClick={() => openColPicker('xlsx', close)}
            >
              {exportLabel} XLSX
            </DropdownItem>
            <DropdownItem 
              icon={<DownloadIcon />} 
              onClick={() => exportToPDF(close)}
            >
              {exportLabel} PDF
            </DropdownItem>
            {onBillBookExport && (
              <>
                <DropdownDivider />
                <DropdownItem
                  icon={<DownloadIcon />}
                  onClick={() => {
                    close();
                    onBillBookExport();
                  }}
                >
                  Bill Book PDF
                </DropdownItem>
              </>
            )}
            {onImport && (
              <>
                <DropdownDivider />
                <DropdownItem icon={<UploadIcon />} onClick={() => handleImportClick(close)}>
                  Import CSV
                </DropdownItem>
              </>
            )}
          </>
        )}
      </Dropdown>

      {/* Column Picker Modal — rendered outside the dropdown */}
      {colPicker && (
        <ColumnPickerModal
          columns={colPicker.columns}
          exportFormat={colPicker.format}
          columnGroups={columnGroups || (resourceName === 'advances' ? ADVANCE_COLUMN_GROUPS : null)}
          onConfirm={handleColPickerConfirm}
          onCancel={handleColPickerCancel}
        />
      )}
    </>
  );
};

export default ImportExportMenu;
