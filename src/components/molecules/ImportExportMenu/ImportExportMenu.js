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
    return dataToExport.flatMap(item => {
      const result = flattenRow(item);
      return Array.isArray(result) ? result : [result];
    });
  };

  const exportToCSV = async (close) => {
    if (!hasSelection) {
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
    if (!hasSelection) {
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
    const worksheet = XLSX.utils.json_to_sheet(flattenedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Auto-size columns
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
    : `Select ${resourceName} to export`;

  return (
    <Dropdown className="import-export-menu" trigger={trigger} align="right">
      {({ close }) => (
        <>
          <DropdownItem 
            icon={<DownloadIcon />} 
            onClick={() => exportToCSV(close)}
            disabled={!hasSelection}
          >
            {exportLabel} CSV
          </DropdownItem>
          <DropdownItem 
            icon={<DownloadIcon />} 
            onClick={() => exportToExcel(close)}
            disabled={!hasSelection}
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
