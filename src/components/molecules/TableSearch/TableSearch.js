import React from 'react';
import './TableSearch.css';

/**
 * Search input for tables
 * @param {Object} props
 * @param {string} props.value - Search value
 * @param {function} props.onChange - Change handler
 * @param {string} props.placeholder - Placeholder text
 */
const TableSearch = ({ value, onChange, placeholder = 'Search...' }) => {
  return (
    <div className="table-search">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8"/>
        <path d="m21 21-4.35-4.35"/>
      </svg>
      <input
        type="text"
        className="table-search-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};

export default TableSearch;
