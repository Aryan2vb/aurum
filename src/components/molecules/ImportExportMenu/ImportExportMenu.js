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
 * Flatten nested customer object into a single-level object for export
 * This exports ALL data from the API response
 */
const flattenCustomerData = (customer) => {
  const flattened = {
    // Basic info
    id: customer.id || '',
    customerCode: customer.customerCode || '',
    fullName: customer.fullName || '',
    gender: customer.gender || '',
    dateOfBirth: customer.dateOfBirth || '',
    status: customer.status || '',
    createdAt: customer.createdAt || '',
    updatedAt: customer.updatedAt || '',
    
    // Created by
    createdById: customer.createdBy?.id || '',
    createdByEmail: customer.createdBy?.email || '',
    createdByName: customer.createdBy?.name || '',
    
    // Updated by
    updatedById: customer.updatedBy?.id || '',
    updatedByEmail: customer.updatedBy?.email || '',
    updatedByName: customer.updatedBy?.name || '',
  };

  // Contact details (flatten first contact)
  const contact = customer.contactDetails?.[0] || {};
  flattened.contactDetailId = contact.id || '';
  flattened.primaryPhone = contact.primaryPhone || '';
  flattened.secondaryPhone = contact.secondaryPhone || '';
  flattened.preferredContactMethod = contact.preferredContactMethod || '';
  flattened.contactNotes = contact.notes || '';

  // Locations (flatten all locations with numbered prefix)
  const locations = customer.locations || [];
  locations.forEach((loc, idx) => {
    const prefix = `location${idx + 1}_`;
    flattened[`${prefix}id`] = loc.id || '';
    flattened[`${prefix}type`] = loc.type || '';
    flattened[`${prefix}addressLine1`] = loc.addressLine1 || '';
    flattened[`${prefix}addressLine2`] = loc.addressLine2 || '';
    flattened[`${prefix}city`] = loc.city || '';
    flattened[`${prefix}state`] = loc.state || '';
    flattened[`${prefix}postalCode`] = loc.postalCode || '';
    flattened[`${prefix}country`] = loc.country || '';
    flattened[`${prefix}isPrimary`] = loc.isPrimary ? 'Yes' : 'No';
    flattened[`${prefix}landmark`] = loc.landmark || '';
  });

  // Social contexts (flatten all with numbered prefix)
  const socialContexts = customer.socialContexts || [];
  socialContexts.forEach((sc, idx) => {
    const prefix = `socialContext${idx + 1}_`;
    flattened[`${prefix}id`] = sc.id || '';
    flattened[`${prefix}platform`] = sc.platform || '';
    flattened[`${prefix}handle`] = sc.handle || '';
    flattened[`${prefix}profileUrl`] = sc.profileUrl || '';
  });

  // Documents (flatten all with numbered prefix)
  const documents = customer.documents || [];
  documents.forEach((doc, idx) => {
    const prefix = `document${idx + 1}_`;
    flattened[`${prefix}id`] = doc.id || '';
    flattened[`${prefix}type`] = doc.type || '';
    flattened[`${prefix}number`] = doc.number || '';
    flattened[`${prefix}issuedAt`] = doc.issuedAt || '';
    flattened[`${prefix}expiresAt`] = doc.expiresAt || '';
  });

  // Accounts (flatten all with numbered prefix)
  const accounts = customer.accounts || [];
  accounts.forEach((acc, idx) => {
    const prefix = `account${idx + 1}_`;
    flattened[`${prefix}id`] = acc.id || '';
    flattened[`${prefix}type`] = acc.type || '';
    flattened[`${prefix}accountNumber`] = acc.accountNumber || '';
    flattened[`${prefix}bankName`] = acc.bankName || '';
    flattened[`${prefix}ifscCode`] = acc.ifscCode || '';
    flattened[`${prefix}isPrimary`] = acc.isPrimary ? 'Yes' : 'No';
  });

  // Meta tracking (flatten all with numbered prefix)
  const metaTrackings = customer.metaTrackings || [];
  metaTrackings.forEach((meta, idx) => {
    const prefix = `metaTracking${idx + 1}_`;
    flattened[`${prefix}id`] = meta.id || '';
    flattened[`${prefix}key`] = meta.key || '';
    flattened[`${prefix}value`] = meta.value || '';
  });

  return flattened;
};

/**
 * Import/Export menu component
 * @param {Object} props
 * @param {Array} props.data - Data to export (selected customers)
 * @param {string} props.filename - Base filename for exports
 * @param {function} props.onImport - Import handler (receives file)
 * @param {number} props.selectedCount - Number of selected items (for display)
 */
const ImportExportMenu = ({ 
  data = [], 
  filename = 'export',
  onImport,
  selectedCount = 0
}) => {
  const hasSelection = selectedCount > 0;

  const exportToCSV = (close) => {
    if (!hasSelection) {
      alert('Please select at least one customer to export');
      close();
      return;
    }

    // Flatten all customer data
    const flattenedData = data.map(flattenCustomerData);
    
    // Get all unique headers across all customers
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

  const exportToExcel = (close) => {
    if (!hasSelection) {
      alert('Please select at least one customer to export');
      close();
      return;
    }

    // Flatten all customer data
    const flattenedData = data.map(flattenCustomerData);

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(flattenedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers');

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
    <button className={`import-export-btn ${isOpen ? 'open' : ''}`}>
      <DownloadIcon />
      <span>Import / Export</span>
      <ChevronIcon />
    </button>
  );

  const exportLabel = hasSelection 
    ? `Export ${selectedCount} selected as` 
    : 'Select customers to export';

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
          <DropdownDivider />
          <DropdownItem icon={<UploadIcon />} onClick={() => handleImportClick(close)}>
            Import CSV
          </DropdownItem>
        </>
      )}
    </Dropdown>
  );
};

export default ImportExportMenu;
