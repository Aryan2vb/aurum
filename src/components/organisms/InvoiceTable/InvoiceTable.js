import React, { useState, useMemo, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';

// Atomic components
import Checkbox from '../../atoms/Checkbox/Checkbox';
import Icon from '../../atoms/Icon/Icon';
import EnumFilter from '../../molecules/EnumFilter/EnumFilter';
import DateRangeFilter from '../../molecules/DateRangeFilter/DateRangeFilter';
import ViewSelector from '../../molecules/ViewSelector/ViewSelector';
import ImportExportMenu from '../../molecules/ImportExportMenu/ImportExportMenu';
import Pagination from '../../molecules/Pagination/Pagination';
import { usePermission } from '../../../hooks/usePermission';
import { flattenInvoiceData } from '../../../utils/exportUtils';
import { getInvoices } from '../../../services/invoicesService';

import './InvoiceTable.css';

const columnHelper = createColumnHelper();

// Column types for icons (consistent with CustomerTable)
const columnTypes = {
  invoiceNumber: 'text',
  date: 'date',
  customer: 'user',
  total: 'number',
  paid: 'number',
  balance: 'number',
  status: 'status',
  actions: 'link',
};

const ColumnTypeIcon = ({ type }) => {
  const icons = {
    text: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>,
    number: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 17h16M4 12h16M4 7h16"/></svg>,
    date: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
    status: <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="6"/></svg>,
    link: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
    user: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  };
  return <span className="attio-col-icon">{icons[type] || icons.text}</span>;
};

// ============================================
// FORMATTERS
// ============================================
const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '—';
  return `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateString) => {
  if (!dateString) return '—';
  try {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  } catch {
    return '—';
  }
};

// ============================================
// OPTIONS
// ============================================
const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'UNPAID', label: 'Unpaid' },
  { value: 'PARTIAL', label: 'Partial' },
  { value: 'PAID', label: 'Paid' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const STATUS_COLORS = {
  DRAFT: { bg: 'rgba(156, 163, 175, 0.2)', color: '#9ca3af' },
  UNPAID: { bg: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' },
  PARTIAL: { bg: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24' },
  PAID: { bg: 'rgba(74, 222, 128, 0.2)', color: '#4ade80' },
  CANCELLED: { bg: 'rgba(0, 0, 0, 0.1)', color: '#555' },
};

// ============================================
// SKELETON LOADING
// ============================================
const SKELETON_COLUMNS = [
  { id: 'sn' },
  { id: 'actions' },
  { id: 'invoiceNumber' },
  { id: 'date' },
  { id: 'customer' },
  { id: 'lastName' },
  { id: 'ledgerAddress' },
  { id: 'ledgerPhone' },
  { id: 'ledgerMetal' },
  { id: 'ledgerHsn' },
  { id: 'ledgerItemName' },
  { id: 'ledgerPurity' },
  { id: 'ledgerNetWeightGold' },
  { id: 'ledgerNetWeightSilver' },
  { id: 'ledgerMetalRate' },
  { id: 'ledgerAmount' },
  { id: 'ledgerLabourPG' },
  { id: 'ledgerLabourTotal' },
  { id: 'ledgerHuid' },
  { id: 'ledgerGst' },
  { id: 'roundOff' },
  { id: 'totalAmount' },
  { id: 'ledgerBank' },
  { id: 'ledgerCash' }
];

const SkeletonCell = ({ width = '60%' }) => (
  <div className="skeleton-cell">
    <div className="skeleton-bar" style={{ width }} />
  </div>
);

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
            className={`attio-td ${['sn', 'actions', 'invoiceNumber'].includes(col.id) ? `attio-td-pinned-${col.id}` : ''}`}
          >
            <SkeletonCell width={['40%', '60%', '80%'][(rowIdx + colIdx) % 3]} />
          </td>
        ))}
      </tr>
    ))}
  </>
);

// ============================================
// MAIN COMPONENT
// ============================================
const InvoiceTable = ({ 
  data, 
  isLoading = false, 
  onViewInvoice,
  pagination = null,
  currentPage = 1,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  searchQuery = '',
  onSearchChange,
  filters = {},
  onFiltersChange,
  onRecordPayment,
  showItems = false,
  onToggleShowItems,
  navigate,
}) => {
  const { can } = usePermission('invoices');
  const [sorting, setSorting] = useState([{ id: 'date', desc: true }]);
  const [rowSelection, setRowSelection] = useState({});
  const [exporting, setExporting] = useState(false);
  const tableRef = React.useRef(null);

  // Process data for the table based on showItems toggle
  const processedData = useMemo(() => {
    if (showItems) {
      const flatRows = [];
      data.forEach((invoice) => {
        const buyer = invoice.buyerSnapshot?.data || invoice.buyerSnapshot || {};
        const items = invoice.items || [];
        items.forEach((item, itemIdx) => {
          const itemAmount = parseFloat(item.taxableAmount || item.totalAmount || 0);
          // Per-item GST: proportional share of invoice GST based on item amount vs subtotal
          const invoiceSubtotal = parseFloat(invoice.subtotal || invoice.taxableAmount || 0);
          const gstRatio = invoiceSubtotal > 0 ? itemAmount / invoiceSubtotal : 0;
          const itemGst = (Number(invoice.cgstAmount || 0) + Number(invoice.sgstAmount || 0) + Number(invoice.igstAmount || 0)) * gstRatio;

          flatRows.push({
            ...invoice,
            ...item,
            id: `${invoice.id}-${item.id || itemIdx}`,
            invoiceId: invoice.id,
            isSubRow: true,
            sn: flatRows.length + 1,
            // Buyer fields — buyerSnapshot is { version, data: {...} }
            ledgerAddress: buyer.address || '',
            ledgerPhone: buyer.phone || '',            // Item fields
            ledgerMetal: item.metalType === 'SILVER' ? 'Silver' : 'Gold',
            ledgerHsn: item.hsnSac || '',
            ledgerItemName: item.description || '',
            ledgerPurity: item.purityLabel || item.purity || '',
            ledgerNetWeightGold: item.metalType !== 'SILVER' ? (parseFloat(item.netWeight) || 0) : 0,
            ledgerNetWeightSilver: item.metalType === 'SILVER' ? (parseFloat(item.netWeight) || 0) : 0,
            // metalRate stored as rate per gram at purchase purity
            ledgerMetalRate: parseFloat(item.metalRate || 0),
            ledgerAmount: itemAmount,
            // Labour: makingCharges is the rate (per gram or flat), makingChargesAmount is the resolved ₹ amount
            ledgerLabourPG: parseFloat(item.makingCharges || 0),
            ledgerLabourTotal: parseFloat(item.makingChargesAmount || 0),
            ledgerHuid: item.huid || '',
            ledgerGst: itemGst,
            ledgerBank: invoice.modeOfPayment !== 'CASH' ? itemAmount : 0,
            ledgerCash: invoice.modeOfPayment === 'CASH' ? itemAmount : 0,
          });
        });
      });
      return flatRows;
    }

    // Default: Aggregated view (1 row per invoice)
    return data.map((invoice, idx) => {
      const buyer = invoice.buyerSnapshot?.data || invoice.buyerSnapshot || {};
      const items = invoice.items || [];
      const hasGold = items.some(i => i.metalType !== 'SILVER');
      const hasSilver = items.some(i => i.metalType === 'SILVER');

      let metalLabel = '';
      if (hasGold && hasSilver) metalLabel = 'Gold, Silver';
      else if (hasGold) metalLabel = 'Gold';
      else if (hasSilver) metalLabel = 'Silver';

      const netWeightGold = items
        .filter(i => i.metalType !== 'SILVER')
        .reduce((sum, i) => sum + (Number(i.netWeight) || 0), 0);
      const netWeightSilver = items
        .filter(i => i.metalType === 'SILVER')
        .reduce((sum, i) => sum + (Number(i.netWeight) || 0), 0);
      const labourTotal = items.reduce((sum, i) => sum + (Number(i.makingChargesAmount) || 0), 0);

      return {
        ...invoice,
        sn: idx + 1,
        // Buyer fields — fix: buyerSnapshot.data contains the actual fields
        ledgerAddress: buyer.address || '',
        ledgerPhone: buyer.phone || '',
        // Ledger computed fields
        ledgerMetal: metalLabel,
        ledgerHsn: items.map(i => i.hsnSac).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', '),
        ledgerItemName: items.map(i => i.description).filter(Boolean).join(', '),
        ledgerPurity: items.map(i => i.purityLabel || i.purity).filter(Boolean).join(', '),
        ledgerNetWeightGold: netWeightGold,
        ledgerNetWeightSilver: netWeightSilver,
        // No single metal rate in aggregated view
        ledgerMetalRate: items.length === 1 ? parseFloat(items[0].metalRate || 0) : null,
        ledgerAmount: parseFloat(invoice.taxableAmount || invoice.subtotal || 0),
        ledgerLabourPG: items.length === 1 ? parseFloat(items[0].makingCharges || 0) : null,
        ledgerLabourTotal: labourTotal,
        ledgerHuid: items.map(i => i.huid).filter(Boolean).join(', '),
        ledgerGst: Number(invoice.cgstAmount || 0) + Number(invoice.sgstAmount || 0) + Number(invoice.igstAmount || 0),
        ledgerBank: invoice.modeOfPayment !== 'CASH' ? parseFloat(invoice.totalAmount || 0) : 0,
        ledgerCash: invoice.modeOfPayment === 'CASH' ? parseFloat(invoice.totalAmount || 0) : 0,
      };
    });
  }, [data, showItems]);

  const aggregations = useMemo(() => {
    let totalAmount = 0, goldWt = 0, silverWt = 0, totalGst = 0, totalBank = 0, totalCash = 0, labourTotal = 0;

    data.forEach(inv => {
      totalAmount += Number(inv.totalAmount || 0);
      totalGst += Number(inv.cgstAmount || 0) + Number(inv.sgstAmount || 0) + Number(inv.igstAmount || 0);
      if (inv.modeOfPayment === 'CASH') totalCash += Number(inv.totalAmount || 0);
      else totalBank += Number(inv.totalAmount || 0);
      (inv.items || []).forEach(item => {
        if (item.metalType === 'SILVER') silverWt += Number(item.netWeight || 0);
        else goldWt += Number(item.netWeight || 0);
        labourTotal += Number(item.makingChargesAmount || 0);
      });
    });

    return {
      count: showItems ? processedData.length : data.length,
      label: showItems ? 'items' : 'invoices',
      total: totalAmount,
      goldWt, silverWt, totalGst, totalBank, totalCash, labourTotal,
    };
  }, [data, showItems, processedData]);

  const clearAllFilters = useCallback(() => {
    onFiltersChange({
      status: null,
      dateFrom: null,
      dateTo: null,
    });
    onSearchChange('');
  }, [onFiltersChange, onSearchChange]);

  const activeFilterCount = useMemo(() => {
    return [
      filters.status,
      filters.dateFrom,
      filters.dateTo,
      searchQuery && searchQuery.trim().length > 0,
    ].filter(Boolean).length;
  }, [filters, searchQuery]);

  const handleDeepExport = async () => {
    try {
      setExporting(true);
      const selectedRows = tableRef.current?.getSelectedRowModel().rows ?? [];
      const selectedInvoiceIds = new Set(
        selectedRows.map(r => r.original.invoiceId || r.original.id)
      );

      const response = await getInvoices({
        ...filters,
        search: searchQuery,
        limit: 1000,
        includeItems: true,
      });

      if (response && response.data) {
        const mappedData = response.data.map((invoice) => ({
          ...invoice,
          remainingBalance: Number(invoice.totalAmount) - Number(invoice.paidAmount),
        }));

        return selectedInvoiceIds.size > 0
          ? mappedData.filter(inv => selectedInvoiceIds.has(inv.id))
          : mappedData;
      }
      return [];
    } catch (error) {
      console.error('Deep export failed', error);
      return [];
    } finally {
      setExporting(false);
    }
  };

  const columns = useMemo(() => [
    columnHelper.display({
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllRowsSelected()}
          indeterminate={table.getIsSomeRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
        />
      ),
      size: 40,
    }),
    columnHelper.accessor('sn', {
      header: 'S.N',
      cell: info => info.getValue(),
      size: 50,
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const inv = row.original;
        const status = (inv.status || '').toUpperCase();
        const isDraft = status === 'DRAFT';
        const hasBalance = (status === 'UNPAID' || status === 'PARTIAL');
        
        return (
          <div className="attio-actions-cell compact">
            <button 
              className="attio-icon-btn view-btn compact" 
              onClick={() => onViewInvoice?.(inv.invoiceId || inv.id)}
              title="View"
            >
              <Icon name="eye" size={14} />
            </button>
            
            {isDraft && (
              <button 
                className="attio-icon-btn edit-btn compact" 
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/invoices/edit/${inv.id}`);
                }}
                title="Edit"
              >
                <Icon name="edit" size={14} />
              </button>
            )}

            {hasBalance && (
              <button 
                className="attio-icon-btn payment-btn compact" 
                onClick={(e) => {
                  e.stopPropagation();
                  onRecordPayment?.(inv);
                }}
                title="Pay"
              >
                <Icon name="payment" size={14} />
              </button>
            )}
          </div>
        );
      },
      size: 100,
    }),
    // Invoice No.
    columnHelper.accessor('invoiceNumber', {
      header: 'Invoice No.',
      cell: info => <span className="attio-td-value">{info.getValue() || 'DRAFT'}</span>,
      size: 110,
    }),
    // Date
    columnHelper.accessor('invoiceDate', {
      header: 'Date',
      cell: info => formatDate(info.getValue()),
      size: 90,
    }),
    // Customer Name (first name)
    columnHelper.accessor(row => {
      const name = row.customer?.fullName || row.buyerSnapshot?.data?.name || row.buyerSnapshot?.name || '';
      return name.split(' ')[0] || name;
    }, {
      id: 'customer',
      header: 'Customer Name',
      size: 140,
    }),
    // Last Name
    columnHelper.accessor(row => {
      const name = row.customer?.fullName || row.buyerSnapshot?.data?.name || row.buyerSnapshot?.name || '';
      return name.split(' ').slice(1).join(' ') || '';
    }, {
      id: 'lastName',
      header: 'Last Name',
      size: 110,
    }),
    // Address — FIXED: buyerSnapshot.data.address
    columnHelper.accessor('ledgerAddress', {
      header: 'Address',
      size: 150,
    }),
    // Contact No — FIXED: buyerSnapshot.data.phone
    columnHelper.accessor('ledgerPhone', {
      header: 'Contact No.',
      size: 120,
    }),
    // Metal
    columnHelper.accessor('ledgerMetal', {
      header: 'Metal',
      size: 80,
    }),
    // HSN
    columnHelper.accessor('ledgerHsn', {
      header: 'Hsn',
      size: 80,
    }),
    // Item Name
    columnHelper.accessor('ledgerItemName', {
      header: 'Item Name',
      size: 180,
    }),
    // Purity — ADDED (was missing)
    columnHelper.accessor('ledgerPurity', {
      header: 'Purity',
      size: 80,
    }),
    // Net Wt. Gold
    columnHelper.accessor('ledgerNetWeightGold', {
      header: 'Net Wt. Gold',
      cell: info => Number(info.getValue() || 0).toFixed(3),
      size: 100,
    }),
    // Net Wt. Silver
    columnHelper.accessor('ledgerNetWeightSilver', {
      header: 'Net Wt. Silver',
      cell: info => Number(info.getValue() || 0).toFixed(3),
      size: 100,
    }),
    // Metal Rate PG — FIXED: reads ledgerMetalRate (mapped correctly from item.metalRate)
    columnHelper.accessor('ledgerMetalRate', {
      header: 'Metal Rate PG',
      cell: info => info.getValue() != null ? formatCurrency(info.getValue()) : '—',
      size: 110,
    }),
    // Amount (taxable, pre-GST)
    columnHelper.accessor('ledgerAmount', {
      header: 'Amount',
      cell: info => formatCurrency(info.getValue()),
      size: 110,
    }),
    // Labour PG — FIXED: was reading nonexistent 'labourRate', now reads ledgerLabourPG
    columnHelper.accessor('ledgerLabourPG', {
      header: 'Labour PG',
      cell: info => info.getValue() != null ? formatCurrency(info.getValue()) : '—',
      size: 90,
    }),
    // Labour Total (resolved ₹ making charges)
    columnHelper.accessor('ledgerLabourTotal', {
      header: 'Labour Total',
      cell: info => formatCurrency(info.getValue()),
      size: 110,
    }),
    // HUID
    columnHelper.accessor('ledgerHuid', {
      header: 'HUID',
      size: 100,
    }),
    // GST
    columnHelper.accessor('ledgerGst', {
      header: 'GST 3%',
      cell: info => formatCurrency(info.getValue()),
      size: 100,
    }),
    // Round Off
    columnHelper.accessor('roundOff', {
      header: 'Round off',
      cell: info => Number(info.getValue() || 0).toFixed(2),
      size: 80,
    }),
    // Total
    columnHelper.accessor('totalAmount', {
      header: 'Total',
      cell: info => <span className="fw-600">{formatCurrency(info.getValue())}</span>,
      size: 110,
    }),
    // Bank
    columnHelper.accessor('ledgerBank', {
      header: 'Bank',
      cell: info => formatCurrency(info.getValue()),
      size: 110,
    }),
    // Cash
    columnHelper.accessor('ledgerCash', {
      header: 'Cash',
      cell: info => formatCurrency(info.getValue()),
      size: 110,
    }),
  ], [onViewInvoice, onRecordPayment, navigate]);

  const table = useReactTable({
    data: processedData,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    enableRowSelection: true,
  });
  tableRef.current = table;

  return (
    <div className="attio-table-container">
      {/* Header */}
      <div className="attio-header">
        <div className="attio-header-left">
          <ViewSelector 
            currentView="all"
            views={[{ id: 'all', label: 'All Invoices' }]}
            onViewChange={() => {}}
          />
        </div>
        <div className="attio-header-right">
          {can('write') && (
            <ImportExportMenu 
              data={[]} // Will be fetched on click for deep export
              selectedCount={Object.keys(rowSelection).length}
              filename="invoices"
              sheetName="Invoices"
              resourceName="invoices"
              flattenRow={flattenInvoiceData}
              onExportTrigger={handleDeepExport} // New prop for async deep fetch
              isLoading={exporting}
            />
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="saas-toolbar">
        <div className="saas-toolbar-search">
          <svg className="saas-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            className="saas-search-input"
            placeholder="Search invoice no or customer..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button className="saas-search-clear" onClick={() => onSearchChange('')}>
              <Icon name="close" size={14} />
            </button>
          )}
        </div>

        <div className="saas-toolbar-filters">
          <EnumFilter
            label="Status"
            icon={<Icon name="status" size={14} />}
            value={filters.status ? [filters.status] : []}
            options={STATUS_OPTIONS}
            onChange={(v) => onFiltersChange({ ...filters, status: v[0] || null })}
            colorMap={STATUS_COLORS}
          />
          <DateRangeFilter
            label="Date Range"
            icon={<Icon name="date" size={14} />}
            start={filters.dateFrom ? new Date(filters.dateFrom) : null}
            end={filters.dateTo ? new Date(filters.dateTo) : null}
            onChange={(s, e) => onFiltersChange({ 
              ...filters, 
              dateFrom: s ? s.toISOString().split('T')[0] : null, 
              dateTo: e ? e.toISOString().split('T')[0] : null 
            })}
          />
          <div className="ledger-toggle-container">
             <label className="toggle-switch">
                <input type="checkbox" checked={showItems} onChange={onToggleShowItems} />
                <span className="slider round"></span>
             </label>
             <span className="toggle-label">Show Items</span>
          </div>
          {activeFilterCount > 0 && (
            <button className="saas-clear-filters" onClick={clearAllFilters}>
              <Icon name="close" size={12} />
              Clear
            </button>
          )}
        </div>

        <div className="saas-toolbar-meta">
          <span className="saas-count">{aggregations.count} {aggregations.label}</span>
        </div>
      </div>

      {/* Table Content */}
      <div className="attio-table-wrapper">
        <table className={`attio-table ${isLoading ? 'attio-skeleton-table' : ''}`}>
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header, idx) => {
                  const colType = columnTypes[header.id];
                  return (
                    <th
                      key={header.id}
                      className={`attio-th ${idx === 0 ? 'attio-th-checkbox' : ''} ${['sn', 'actions', 'invoiceNumber'].includes(header.id) ? `attio-th-pinned-${header.id}` : ''}`}
                      style={{ width: header.getSize() }}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="attio-th-content">
                        {colType && <ColumnTypeIcon type={colType} />}
                        <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                        {header.column.getIsSorted() && (
                          <svg className="attio-sort-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            {header.column.getIsSorted() === 'asc' ? <path d="m18 15-6-6-6 6"/> : <path d="m6 9 6 6 6-6"/>}
                          </svg>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              <SkeletonRows columns={SKELETON_COLUMNS} />
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="attio-empty">
                  <div className="empty-state-content">
                    <Icon name="fileText" size={40} />
                    <p>No invoices found matching current filters.</p>
                  </div>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map(row => (
                <tr key={row.id} className={row.getIsSelected() ? 'attio-row-selected' : ''}>
                  {row.getVisibleCells().map((cell, idx) => (
                    <td key={cell.id} className={`attio-td ${idx === 0 ? 'attio-td-checkbox' : ''} ${['sn', 'actions', 'invoiceNumber'].includes(cell.column.id) ? `attio-td-pinned-${cell.column.id}` : ''}`}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
          {!isLoading && data.length > 0 && (
            <tfoot>
              <tr>
                {table.getAllColumns().map((col) => {
                  const totals = {
                    sn: `${aggregations.count} ${aggregations.label}`,
                    ledgerNetWeightGold: Number(aggregations.goldWt).toFixed(3),
                    ledgerNetWeightSilver: Number(aggregations.silverWt).toFixed(3),
                    ledgerLabourTotal: formatCurrency(aggregations.labourTotal),
                    ledgerGst: formatCurrency(aggregations.totalGst),
                    totalAmount: formatCurrency(aggregations.total),
                    ledgerBank: formatCurrency(aggregations.totalBank),
                    ledgerCash: formatCurrency(aggregations.totalCash),
                  };
                  const val = totals[col.id];
                  return (
                    <td key={col.id} className={`attio-tf ${['sn', 'actions', 'invoiceNumber'].includes(col.id) ? `attio-tf-pinned-${col.id}` : ''}`}>
                      {val && <span className={`attio-tf-value${col.id === 'totalAmount' ? ' fw-600' : ''}`}>{val}</span>}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

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
    </div>
  );
};

export default InvoiceTable;
