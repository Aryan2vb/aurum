import React from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Dropdown, { DropdownItem, DropdownDivider } from '../../atoms/Dropdown/Dropdown';
import { buildExportFilename } from '../../../utils/exportFilename';
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
  resourceName = 'items'
}) => {
  const hasSelection = selectedCount > 0;

  const getFlattenedData = async () => {
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
    
    // Some flattening functions (like for invoices) might return an array of rows per original item
    // We flatten everything into a single array
    let flattened = dataToExport.flatMap(item => {
      const result = flattenRow(item);
      return Array.isArray(result) ? result : [result];
    });

    // Post-processing for Invoices (Continuous Serial No. and Aggregation Row)
    if (resourceName === 'invoices' && flattened.length > 0) {
      // 1. Continuous Serial No.
      flattened = flattened.map((row, idx) => ({
        ...row,
        'Serial No.': idx + 1
      }));

      // 2. Calculation for Totals Row
      const numericColumns = [
        'Net Wt. Gold', 'Net Wt. Silver', 'Amount', 'Labour Total', 
        'Hallmark Chrgs', 'Gst 3%', 'Round off', 'Total', 'UPI', 'Swipe', 'Cheque', 'Bank Transfer', 'Cash', 'Other'
      ];

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

    return flattened;
  };

  const exportToCSV = async (close) => {
    // If onExportTrigger is not provided, we must have selection or data
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
    
    // Get all unique headers across all items
    const headersSet = new Set();
    flattenedData.forEach(item => {
      Object.keys(item).forEach(key => headersSet.add(key));
    });
    const headers = Array.from(headersSet);

    // Build CSV content
    const rows = flattenedData.map(item => 
      headers.map(h => item[h] ?? '')
    );
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = buildExportFilename(filename, 'csv', filenameQualifier);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    close();
  };

  const exportToExcel = async (close) => {
    // If onExportTrigger is not provided, we must have selection or data
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

    // Create workbook and worksheet
    let worksheet;
    const workbook = XLSX.utils.book_new();

    if (resourceName === 'invoices') {
      const headers = [
        ["Serial No.", "Invoice No.", "Date", "Customer Details", "", "", "", "Item Details", "", "", "", "", "", "", "", "", "", "", "", "", "Total", "Payment Details", "", "", "", "", "", "Gst No"],
        ["", "", "", "Customer Name", "Last Name", "Address", "Contact No.", "Metal", "Hsn", "Item Name", "Purity", "Net Wt. Gold", "Net Wt. Silver", "Metal Rate PG", "Labour PG", "Labour Total", "Hallmark Chrgs", "Amount", "Gst 3%", "Round off", "", "UPI", "Swipe", "Cheque", "Bank Transfer", "Cash", "Other", ""]
      ];

      const dataRows = flattenedData.map(row => [
        row['Serial No.'],
        row['Invoice No.'],
        row['Date'],
        row['Customer Name'],
        row['Last Name'],
        row['Address'],
        row['Contact No.'],
        row['Metal'],
        row['Hsn'],
        row['Item Name'],
        row['Purity'],
        row['Net Wt. Gold'],
        row['Net Wt. Silver'],
        row['Metel Rate PG'] || row['Metal Rate PG'],
        row['Labour PG'],
        row['Labour Total'],
        row['Hallmark Chrgs'],
        row['Amount'],
        row['Gst 3%'],
        row['Round off'],
        row['Total'],
        row['UPI'],
        row['Swipe'],
        row['Cheque'],
        row['Bank Transfer'],
        row['Cash'],
        row['Other'],
        row['Gst No']
      ]);

      worksheet = XLSX.utils.aoa_to_sheet([...headers, ...dataRows]);

      worksheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } }, // Serial No.
        { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } }, // Invoice No.
        { s: { r: 0, c: 2 }, e: { r: 1, c: 2 } }, // Date
        { s: { r: 0, c: 3 }, e: { r: 0, c: 6 } }, // Customer Details
        { s: { r: 0, c: 7 }, e: { r: 0, c: 19 } }, // Item Details
        { s: { r: 0, c: 20 }, e: { r: 1, c: 20 } }, // Total
        { s: { r: 0, c: 21 }, e: { r: 0, c: 26 } }, // Payment Details
        { s: { r: 0, c: 27 }, e: { r: 1, c: 27 } }  // Gst No
      ];

      // Auto-size columns for double header worksheet
      const colWidths = [];
      const columnKeys = [
        'Serial No.', 'Invoice No.', 'Date', 'Customer Name', 'Last Name', 'Address', 'Contact No.',
        'Metal', 'Hsn', 'Item Name', 'Purity', 'Net Wt. Gold', 'Net Wt. Silver', 'Metal Rate PG',
        'Labour PG', 'Labour Total', 'Hallmark Chrgs', 'Amount', 'Gst 3%', 'Round off', 'Total',
        'UPI', 'Swipe', 'Cheque', 'Bank Transfer', 'Cash', 'Other', 'Gst No'
      ];
      columnKeys.forEach((key, idx) => {
        let maxWidth = key.length;
        const checkKey = key === 'Metal Rate PG' ? 'Metel Rate PG' : key;
        flattenedData.forEach(row => {
          const val = String(row[checkKey] || row[key] || '');
          if (val.length > maxWidth) maxWidth = val.length;
        });
        colWidths[idx] = { wch: Math.min(maxWidth + 2, 50) };
      });
      worksheet['!cols'] = colWidths;
    } else {
      worksheet = XLSX.utils.json_to_sheet(flattenedData);

      // Auto-size columns for standard worksheet
      const colWidths = [];
      if (flattenedData.length > 0) {
        Object.keys(flattenedData[0]).forEach((key, idx) => {
          let maxWidth = key.length;
          flattenedData.forEach(row => {
            const val = String(row[key] || '');
            if (val.length > maxWidth) maxWidth = val.length;
          });
          colWidths[idx] = { wch: Math.min(maxWidth + 2, 50) };
        });
        worksheet['!cols'] = colWidths;
      }
    }

    // Center all cells in the worksheet
    for (const key in worksheet) {
      if (key.startsWith('!')) continue;
      worksheet[key].s = {
        alignment: {
          horizontal: 'center',
          vertical: 'center',
          wrapText: true
        }
      };
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Generate XLSX file and trigger download
    XLSX.writeFile(workbook, buildExportFilename(filename, 'xlsx', filenameQualifier));
    close();
  };

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
    let dataRows = flattenedData;
    let totalsRow = null;
    if (isInvoice && flattenedData.length > 0) {
      const lastRow = flattenedData[flattenedData.length - 1];
      if (lastRow['Serial No.'] === 'TOTAL') {
        totalsRow = lastRow;
        dataRows = flattenedData.slice(0, -1);
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
    const title = isInvoice ? 'INVOICE REPORT' : `${(resourceName || 'REPORT').toUpperCase()}`;
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
        'Metel Rate PG', 'Labour PG', 'Labour Total', 'Hallmark Chrgs', 'Amount', 'Gst 3%', 'Round off',
        'Total',
        'UPI', 'Swipe', 'Cheque', 'Bank Transfer', 'Cash', 'Other',
        'Gst No'
      ];

      const subLabels = [
        'S.No', 'Invoice No.', 'Date',
        'Cust. Name', 'Last Name', 'Address', 'Contact',
        'Metal', 'HSN', 'Item', 'Purity', 'Wt. Gold', 'Wt. Silver',
        'Rate/g', 'Labour/g', 'Labour', 'Hallmark', 'Amount', 'GST 3%', 'Round off',
        'Total',
        'UPI', 'Swipe', 'Cheque', 'Bank Tfr', 'Cash', 'Other',
        'GST No'
      ];

      // Group definitions: [label, startColIdx, endColIdx (inclusive)]
      const groups = [
        ['S.No',             0,  0],
        ['Invoice No.',      1,  1],
        ['Date',             2,  2],
        ['Customer Details', 3,  6],
        ['Item Details',     7, 19],
        ['Total',           20, 20],
        ['Payment Details', 21, 26],
        ['GST No',          27, 27],
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
        58, 48, 68, 50,          // Customer
        34, 34, 58, 34, 42, 42, 42, 42, 42, 42, 48, 38, 42, // Items
        48,                      // Total
        42, 38, 42, 48, 38, 38,  // Payment
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

    } else {
      // ── Generic single-level table ────────────────────────────────────────
      const headers = Object.keys(flattenedData[0] || {});
      autoTable(doc, {
        startY: 44,
        head: [headers],
        body: dataRows.map(row => headers.map(h => row[h] ?? '')),
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 3, halign: 'center', valign: 'middle', fillColor: false, lineColor: [80, 80, 80], lineWidth: 0.4 },
        headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [220, 220, 220] },
      });
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
    <Dropdown className="import-export-menu" trigger={trigger} align="right">
      {({ close }) => (
        <>
          <DropdownItem 
            icon={<DownloadIcon />} 
            onClick={() => exportToCSV(close)}
          >
            {exportLabel} CSV
          </DropdownItem>
          <DropdownItem 
            icon={<DownloadIcon />} 
            onClick={() => exportToExcel(close)}
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
  );
};

export default ImportExportMenu;
