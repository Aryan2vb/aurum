import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
} from '@tanstack/react-table';

// Atomic components
import Checkbox from '../../atoms/Checkbox/Checkbox';
import Icon from '../../atoms/Icon/Icon';
import EnumFilter from '../../molecules/EnumFilter/EnumFilter';
import BooleanFilter from '../../molecules/BooleanFilter/BooleanFilter';
import RangeFilter from '../../molecules/RangeFilter/RangeFilter';
import DateRangeFilter from '../../molecules/DateRangeFilter/DateRangeFilter';
import TextFilter from '../../molecules/TextFilter/TextFilter';
import ImportExportMenu from '../../molecules/ImportExportMenu/ImportExportMenu';
import Pagination from '../../molecules/Pagination/Pagination';
import CustomerInspectorPanel from '../CustomerInspectorPanel/CustomerInspectorPanel';
import { usePermission } from '../../../hooks/usePermission';

// Table-specific
import { customerColumns, defaultColumnOrder, calculateAge, hasPhone, columnTypes } from './columns';
import './CustomerTable.css';

const ColumnTypeIcon = ({ type }) => {
  const icons = {
    text: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>,
    number: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 17h16M4 12h16M4 7h16"/></svg>,
    date: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
    status: <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="6"/></svg>,
    link: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
    phone: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
    user: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    tag: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
    boolean: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/></svg>,
  };
  return <span className="attio-col-icon">{icons[type] || icons.text}</span>;
};

// ============================================
// SKELETON LOADING
// ============================================
// Skeleton columns config for loading state
const SKELETON_COLUMNS = [
  { id: 'fullName', hasAvatar: true },
  { id: 'customerCode' },
  { id: 'status' },
  { id: 'primaryPhone' },
  { id: 'preferredContact' },
  { id: 'gender' },
  { id: 'age' },
  { id: 'createdAt' },
  { id: 'createdBy' },
];

const skeletonWidths = ['40%', '50%', '60%', '70%', '80%'];
const getRandomWidth = (seed) => skeletonWidths[seed % skeletonWidths.length];

const SkeletonCell = ({ width = '60%', hasAvatar = false }) => (
  <div className="skeleton-cell">
    {hasAvatar && <div className="skeleton-avatar" />}
    <div className="skeleton-bar" style={{ width }} />
  </div>
);

// Skeleton rows component - only renders tbody skeleton rows
const SkeletonRows = ({ rows = 10, columns }) => (
  <>
    {Array.from({ length: rows }).map((_, rowIdx) => (
      <tr key={rowIdx} className="skeleton-row">
        <td className="attio-td attio-td-checkbox">
          <Checkbox disabled />
        </td>
        {columns.map((col, colIdx) => (
          <td 
            key={col.id} 
            className={`attio-td ${colIdx === 0 ? 'attio-td-pinned' : ''}`}
          >
            <SkeletonCell 
              hasAvatar={col.hasAvatar} 
              width={getRandomWidth(rowIdx + colIdx)}
            />
          </td>
        ))}
      </tr>
    ))}
  </>
);

// ============================================
// FILTER OPTIONS
// ============================================
const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'SUSPENDED', label: 'Suspended' },
];

const GENDER_OPTIONS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
];

const CONTACT_OPTIONS = [
  { value: 'CALL', label: 'Call' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'SMS', label: 'SMS' },
  { value: 'VISIT', label: 'Visit' },
  { value: 'EMAIL', label: 'Email' },
];

const STATUS_COLORS = {
  ACTIVE: { bg: 'rgba(74, 222, 128, 0.2)', color: '#4ade80' },
  INACTIVE: { bg: 'rgba(156, 163, 175, 0.2)', color: '#9ca3af' },
  CLOSED: { bg: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' },
  SUSPENDED: { bg: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24' },
};


// ============================================
// MAIN COMPONENT
// ============================================
const CustomerTable = ({ 
  data, 
  isLoading = false, 
  onCustomerCreated,
  onCSVUpload,
  pagination = null,
  currentPage = 1,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  searchQuery = '',
  onSearchChange,
  filters: externalFilters = {},
  onFiltersChange,
  useClientSideFiltering = false,
}) => {
  const navigate = useNavigate();
  const { can } = usePermission();
  const [sorting, setSorting] = useState([{ id: 'fullName', desc: false }]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [rowSelection, setRowSelection] = useState({});
  const [columnOrder, setColumnOrder] = useState(defaultColumnOrder);
  const [isCreateSlideOverOpen, setIsCreateSlideOverOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  
  // Use external filters if provided, otherwise use local state
  const [localFilters, setLocalFilters] = useState({
    status: [],
    gender: [],
    preferredContact: [],
    ageMin: null,
    ageMax: null,
    hasPhone: null,
    createdStart: null,
    createdEnd: null,
    address: '',
  });
  
  const filters = onFiltersChange ? externalFilters : localFilters;
  const setFilters = onFiltersChange ? onFiltersChange : setLocalFilters;

  // Use data directly (filtering is done server-side via API)
  // Only apply client-side filters if explicitly requested (e.g., for mock data)
  // or if NO external handlers are provided
  const filteredData = useMemo(() => {
    const isClientSide = useClientSideFiltering || (!onSearchChange && !onFiltersChange);
    
    // If using API search/filters and not explicitly requested client-side filtering, return data as-is
    if (!isClientSide) {
      return data;
    }
    
    // Otherwise, apply client-side filters (for mock data)
    let result = [...data];

    // Search query filter
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(c => 
        (c.fullName && c.fullName.toLowerCase().includes(q)) ||
        (c.customerCode && c.customerCode.toLowerCase().includes(q)) ||
        (c.contactDetails?.[0]?.primaryPhone && c.contactDetails[0].primaryPhone.includes(q)) ||
        (c.phone && c.phone.includes(q)) // Catch-all for phone
      );
    }

    // Status filter
    if (filters.status && filters.status.length > 0) {
      result = result.filter(c => filters.status.includes(c.status));
    }

    // Gender filter
    if (filters.gender && filters.gender.length > 0) {
      result = result.filter(c => c.gender && filters.gender.includes(c.gender));
    }

    // Contact method filter
    if (filters.preferredContact && filters.preferredContact.length > 0) {
      result = result.filter(c => {
        const m = c.contactDetails?.[0]?.preferredContactMethod;
        return m && filters.preferredContact.includes(m);
      });
    }

    // Age range filter
    if (filters.ageMin !== null || filters.ageMax !== null) {
      result = result.filter(c => {
        const age = calculateAge(c.dateOfBirth);
        if (age === null) return false;
        if (filters.ageMin !== null && age < filters.ageMin) return false;
        if (filters.ageMax !== null && age > filters.ageMax) return false;
        return true;
      });
    }

    // Has phone filter
    if (filters.hasPhone !== null) {
      result = result.filter(c => hasPhone(c.contactDetails) === filters.hasPhone);
    }

    // Date range filter
    if (filters.createdStart || filters.createdEnd) {
      result = result.filter(c => {
        if (!c.createdAt) return false;
        const created = new Date(c.createdAt);
        if (filters.createdStart && created < filters.createdStart) return false;
        if (filters.createdEnd && created > filters.createdEnd) return false;
        return true;
      });
    }

    // Address filter (searches in village, tehsil, district)
    if (filters.address && filters.address.trim()) {
      const addressLower = filters.address.toLowerCase().trim();
      result = result.filter(c => 
        c.locations?.some(loc => 
          loc.village?.toLowerCase().includes(addressLower) ||
          loc.tehsil?.toLowerCase().includes(addressLower) ||
          loc.district?.toLowerCase().includes(addressLower)
        )
      );
    }

    return result;
  }, [data, filters, onSearchChange, onFiltersChange, searchQuery, useClientSideFiltering]);

  // Aggregations
  const aggregations = useMemo(() => {
    const ages = filteredData.map(c => calculateAge(c.dateOfBirth)).filter(a => a !== null);
    const statusCounts = { ACTIVE: 0, INACTIVE: 0, CLOSED: 0, SUSPENDED: 0 };
    filteredData.forEach(c => { if (statusCounts[c.status] !== undefined) statusCounts[c.status]++; });
    
    const withPhone = filteredData.filter(c => hasPhone(c.contactDetails)).length;
    const completeness = filteredData.map(c => {
      let score = 0;
      if (c.fullName) score += 15;
      if (c.gender) score += 10;
      if (c.dateOfBirth) score += 15;
      if (c.contactDetails?.[0]?.primaryPhone) score += 20;
      if (c.contactDetails?.[0]?.secondaryPhone) score += 10;
      if (c.contactDetails?.[0]?.preferredContactMethod) score += 10;
      if (c.locations?.length > 0) score += 20;
      return score;
    });

    return {
      count: filteredData.length,
      statusCounts,
      activeCount: statusCounts.ACTIVE,
      inactiveCount: statusCounts.INACTIVE,
      avgAge: ages.length ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : null,
      minAge: ages.length ? Math.min(...ages) : null,
      maxAge: ages.length ? Math.max(...ages) : null,
      withPhone,
      withoutPhone: filteredData.length - withPhone,
      avgCompleteness: completeness.length ? Math.round(completeness.reduce((a, b) => a + b, 0) / completeness.length) : null,
    };
  }, [filteredData]);

  const clearAllFilters = useCallback(() => {
    const clearedFilters = { 
      status: [], 
      gender: [], 
      preferredContact: [], 
      ageMin: null, 
      ageMax: null, 
      hasPhone: null, 
      createdStart: null, 
      createdEnd: null,
      address: '',
    };
    setFilters(clearedFilters);
    if (onSearchChange) {
      onSearchChange('');
    }
  }, [onSearchChange, setFilters]);

  const handleClearSearch = useCallback(() => {
    if (onSearchChange) {
      onSearchChange('');
    }
  }, [onSearchChange]);

  const activeFilterCount = useMemo(() => {
    return [
      filters.status && filters.status.length > 0,
      filters.gender && filters.gender.length > 0,
      filters.preferredContact && filters.preferredContact.length > 0,
      filters.ageMin !== null || filters.ageMax !== null,
      filters.hasPhone !== null,
      filters.createdStart !== null || filters.createdEnd !== null,
      filters.address && filters.address.trim().length > 0,
      searchQuery && searchQuery.trim().length > 0,
    ].filter(Boolean).length;
  }, [filters, searchQuery]);

  const table = useReactTable({
    data: filteredData,
    columns: customerColumns,
    state: { sorting, columnVisibility, rowSelection, columnOrder },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onColumnOrderChange: setColumnOrder,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    enableRowSelection: true,
  });

  return (
    <div className="attio-table-container">
      {/* Header - always visible */}
      <div className="attio-header">
        <div className="attio-header-left">
          <ViewSelector 
            currentView={currentView}
            views={[{ id: 'all', label: 'All Customers' }]}
            onViewChange={setCurrentView}
          />
        </div>
        <div className="attio-header-right">
          {can('write') && (
            <>
              <ImportExportMenu 
                data={table.getSelectedRowModel().rows.map(row => row.original)}
                selectedCount={Object.keys(rowSelection).length}
                filename="customers"
                onImport={onCSVUpload}
              />
              <button 
                className="attio-primary-btn"
                onClick={() => setIsCreateSlideOverOpen(true)}
              >
                <Icon name="add" size={14} />
                <span>New Customer</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Clean SaaS-style Toolbar */}
      <div className="saas-toolbar">
        {/* Left: Search */}
        <div className="saas-toolbar-search">
          <svg className="saas-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            className="saas-search-input"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => onSearchChange ? onSearchChange(e.target.value) : null}
          />
          {searchQuery && (
            <button className="saas-search-clear" onClick={handleClearSearch}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* Center: Filters */}
        <div className="saas-toolbar-filters">
          <EnumFilter
            label="Status"
            icon={<Icon name="status" size={14} />}
            value={filters.status || []}
            options={STATUS_OPTIONS}
            onChange={(v) => setFilters(f => ({ ...f, status: v }))}
            colorMap={STATUS_COLORS}
          />
          <EnumFilter
            label="Gender"
            icon={<Icon name="gender" size={14} />}
            value={filters.gender || []}
            options={GENDER_OPTIONS}
            onChange={(v) => setFilters(f => ({ ...f, gender: v }))}
          />
          <RangeFilter
            label="Age"
            icon={<Icon name="age" size={14} />}
            min={filters.ageMin}
            max={filters.ageMax}
            onChange={(min, max) => setFilters(f => ({ ...f, ageMin: min, ageMax: max }))}
            placeholder={{ min: '18', max: '100' }}
          />
          <BooleanFilter
            label="Has phone"
            icon={<Icon name="phone" size={14} />}
            value={filters.hasPhone}
            onChange={(v) => setFilters(f => ({ ...f, hasPhone: v }))}
          />
          <EnumFilter
            label="Contact"
            icon={<Icon name="contact" size={14} />}
            value={filters.preferredContact || []}
            options={CONTACT_OPTIONS}
            onChange={(v) => setFilters(f => ({ ...f, preferredContact: v }))}
          />
          <DateRangeFilter
            label="Created"
            icon={<Icon name="date" size={14} />}
            start={filters.createdStart}
            end={filters.createdEnd}
            onChange={(s, e) => setFilters(f => ({ ...f, createdStart: s, createdEnd: e }))}
          />
          <TextFilter
            label="Address"
            icon={<Icon name="location" size={14} />}
            value={filters.address || ''}
            onChange={(v) => setFilters(f => ({ ...f, address: v }))}
            placeholder="Search address..."
          />
          {activeFilterCount > 0 && (
            <button className="saas-clear-filters" onClick={clearAllFilters}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Clear
            </button>
          )}
        </div>

        {/* Right: Actions & Count */}
        <div className="saas-toolbar-meta">
          <span className="saas-count">{aggregations.count} customers</span>
          <div className="saas-toolbar-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <ImportExportMenu 
              data={table.getSelectedRowModel().rows.map(row => row.original)}
              selectedCount={Object.keys(rowSelection).length}
              filename="customers"
              onImport={onCSVUpload}
            />
            <button 
              className="attio-primary-btn new-customer-btn"
              onClick={() => setIsCreateSlideOverOpen(true)}
            >
              <Icon name="add" size={14} />
              <span>New Customer</span>
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="attio-table-wrapper">
        <table className={`attio-table ${isLoading ? 'attio-skeleton-table' : ''}`}>
          <thead>
            <tr>
              {table.getHeaderGroups()[0]?.headers.map((header, idx) => {
                const colType = columnTypes[header.id];
                const isSorted = header.column.getIsSorted();
                return (
                  <th
                    key={header.id}
                    className={`attio-th ${idx === 0 ? 'attio-th-checkbox' : ''} ${idx === 1 ? 'attio-th-pinned' : ''}`}
                    style={{ width: header.getSize() }}
                    onClick={!isLoading && header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                  >
                    {header.id === 'select' ? (
                      <Checkbox 
                        checked={table.getIsAllRowsSelected()} 
                        indeterminate={table.getIsSomeRowsSelected()}
                        onChange={table.getToggleAllRowsSelectedHandler()}
                        disabled={isLoading}
                      />
                    ) : (
                      <div className="attio-th-content">
                        {colType && <ColumnTypeIcon type={colType} />}
                        <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                        {isSorted && !isLoading && (
                          <svg className="attio-sort-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            {isSorted === 'asc' ? <path d="m18 15-6-6-6 6"/> : <path d="m6 9 6 6 6-6"/>}
                          </svg>
                        )}
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <SkeletonRows rows={10} columns={SKELETON_COLUMNS} />
            ) : table.getRowModel().rows.length === 0 ? (
              <tr><td colSpan={table.getAllColumns().length} className="attio-empty">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                </svg>
                <span>No customers found</span>
              </td></tr>
            ) : (
              table.getRowModel().rows.map((row) => {
                const customer = row.original;
                return (
                  <tr 
                    key={row.id} 
                    className={row.getIsSelected() ? 'attio-row-selected' : ''}
                    onClick={(e) => {
                      // Don't open if clicking on checkbox cell or action buttons
                      if (e.target.closest('.checkbox') || e.target.closest('.attio-td-checkbox') || e.target.closest('button')) {
                        return;
                      }
                      // On mobile, navigate to full profile page instead of opening inspector
                      if (window.innerWidth <= 768) {
                        navigate(`/customers/${customer.id}`);
                        return;
                      }
                      // Open inspector panel on desktop
                      setSelectedCustomerId(customer.id);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    {row.getVisibleCells().map((cell, idx) => (
                      <td key={cell.id} className={`attio-td ${idx === 0 ? 'attio-td-checkbox' : ''} ${idx === 1 ? 'attio-td-pinned' : ''}`}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
          {/* Footer with Aggregations */}
          <tfoot>
            <tr>
              {table.getHeaderGroups()[0]?.headers.map((header, idx) => {
                const id = header.id;
                if (idx === 0) return <td key="f-0" className="attio-tf attio-tf-checkbox" />;
                if (idx === 1) return (
                  <td key="f-1" className="attio-tf attio-tf-pinned">
                    <span className="attio-tf-value">{isLoading ? '—' : aggregations.count} count</span>
                  </td>
                );
                
                if (isLoading) return <td key={`f-${id}`} className="attio-tf"><span className="attio-tf-add">—</span></td>;
                
                if (id === 'status') return <td key="f-status" className="attio-tf"><span className="attio-tf-status"><span className="tf-active">{aggregations.activeCount}</span> / <span className="tf-inactive">{aggregations.inactiveCount}</span></span></td>;
                if (id === 'age') return <td key="f-age" className="attio-tf"><span className="attio-tf-value">{aggregations.avgAge ?? '—'} avg</span></td>;
                if (id === 'hasPhone') return <td key="f-phone" className="attio-tf"><span className="attio-tf-value">{aggregations.withPhone} yes</span></td>;
                if (id === 'completeness') return <td key="f-comp" className="attio-tf"><span className="attio-tf-value">{aggregations.avgCompleteness ?? '—'}% avg</span></td>;
                
                return <td key={`f-${id}`} className="attio-tf"><span className="attio-tf-add">+ Add calculation</span></td>;
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <Pagination
          currentPage={currentPage}
          totalPages={pagination.totalPages}
          total={pagination.total}
          pageSize={pageSize}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}

      {/* Customer Inspector Panel - Used for both view and create modes */}
      {/* Create Mode */}
      <CustomerInspectorPanel
        isOpen={isCreateSlideOverOpen}
        onClose={() => setIsCreateSlideOverOpen(false)}
        customerId={null}
        mode="create"
        onSuccess={(newCustomer) => {
          setIsCreateSlideOverOpen(false);
          onCustomerCreated?.(newCustomer);
        }}
      />

      {/* View/Edit Mode */}
      <CustomerInspectorPanel
        isOpen={!!selectedCustomerId}
        onClose={() => setSelectedCustomerId(null)}
        customerId={selectedCustomerId}
        onSuccess={() => {
          onCustomerCreated?.(); // Refresh the table
        }}
      />
    </div>
  );
};

export default CustomerTable;
