import React from 'react';
import StatusPill from '../../atoms/StatusPill/StatusPill';
import NameCell from '../../atoms/NameCell/NameCell';
import EmailCell from '../../atoms/EmailCell/EmailCell';
import './CustomerRow.css';

const CustomerRow = ({ customer, style, onClick, visibleColumns, allColumns }) => {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'N/A';
    }
  };

  const getCellValue = (columnId) => {
    switch (columnId) {
      case 'customerCode':
        return customer.customerCode || 'N/A';
      case 'fullName':
        return customer.fullName || 'N/A';
      case 'gender':
        return customer.gender || 'N/A';
      case 'status':
        return customer.status;
      case 'primaryPhone':
        const contactDetails = customer.contactDetails;
        return contactDetails && contactDetails.length > 0
          ? contactDetails[0].primaryPhone || 'N/A'
          : 'N/A';
      case 'dateOfBirth':
        return formatDate(customer.dateOfBirth);
      case 'createdBy':
        return customer.createdBy?.email || 'N/A';
      case 'createdAt':
        return formatDateTime(customer.createdAt);
      default:
        return 'N/A';
    }
  };

  const renderCell = (column) => {
    const value = getCellValue(column.id);

    switch (column.id) {
      case 'status':
        return <StatusPill status={value} />;
      case 'createdBy':
        return <EmailCell email={value} />;
      case 'fullName':
        return <NameCell name={value} />;
      default:
        return <span className="customer-cell-text customer-cell-muted">{value}</span>;
    }
  };

  const visibleCols = allColumns.filter((col) => visibleColumns.includes(col.id));
  const gridTemplateColumns = visibleCols
    .map((col) => (col.id === 'fullName' ? '1fr' : `${col.size || 140}px`))
    .join(' ');

  return (
    <div
      className="customer-row"
      style={{ ...style, gridTemplateColumns }}
      onClick={onClick}
      role="row"
    >
      {visibleCols.map((column) => (
        <div key={column.id} className="customer-row-cell">
          {renderCell(column)}
        </div>
      ))}
    </div>
  );
};

export default CustomerRow;
