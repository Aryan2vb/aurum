import React from 'react';
import * as XLSX from 'xlsx';
import Dropdown, { DropdownItem, DropdownDivider } from '../../atoms/Dropdown/Dropdown';
import './ImportExportMenu.css';

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
 * @param {string} props.sheetName - Name of the worksheet in Excel
 * @param {function} props.onImport - Import handler (receives file). If null, import is hidden.
 * @param {function} props.flattenRow - Function to flatten a single row. Can return an object or array of objects.
 * @param {function} props.onExportTrigger - Optional async function to fetch data for export.
 * @param {boolean} props.isLoading - Loading state for async export.
 * @param {number} props.selectedCount - Number of selected items (for display)
 * @param {string} props.resourceName - Name of the resource (e.g., 'customers', 'invoices')
 */
const ImportExportMenu = ({ 
  data = [], 
  filename = 'export',
  sheetName = 'Sheet1',
  onImport,
  flattenRow,
  onExportTrigger,
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
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
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
    XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
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
