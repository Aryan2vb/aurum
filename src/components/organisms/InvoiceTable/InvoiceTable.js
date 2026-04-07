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
  { id: 'invoiceNumber' },
  { id: 'date' },
  { id: 'customer' },
  { id: 'total' },
  { id: 'balance' },
  { id: 'status' },
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
            className={`attio-td ${colIdx === 0 ? 'attio-td-pinned' : ''}`}
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
  showItems = false,
  onToggleShowItems,
}) => {
  const { can } = usePermission('invoices');
  const [sorting, setSorting] = useState([{ id: 'date', desc: true }]);
  const [rowSelection, setRowSelection] = useState({});
  const [exporting, setExporting] = useState(false);
  const tableRef = React.useRef(null);

  // Process data for the table based on showItems toggle
  const processedData = useMemo(() => {
    if (showItems) {
      // Flatten into rows per item
      const flatRows = [];
      data.forEach((invoice, invIdx) => {
        const items = invoice.items || [];
        items.forEach((item, itemIdx) => {
          const itemAmount = parseFloat(item.taxableAmount || item.totalAmount || 0);
          flatRows.push({
            ...invoice,
            ...item,
            id: `${invoice.id}-${item.id || itemIdx}`,
            invoiceId: invoice.id,
            isSubRow: true,
            sn: flatRows.length + 1,
            ledgerMetal: item.metalType === 'SILVER' ? 'Silver' : 'Gold',
            ledgerItemName: item.description,
            purity: item.purityLabel || item.purity || '',
            ledgerGrossWeight: item.grossWeight || 0,
            ledgerNetWeightGold: item.metalType !== 'SILVER' ? (parseFloat(item.netWeight) || 0) : 0,
            ledgerNetWeightSilver: item.metalType === 'SILVER' ? (parseFloat(item.netWeight) || 0) : 0,
            ledgerMetalRate: item.effectiveRate || item.metalRate || 0,
            ledgerLabourTotal: parseFloat(item.makingChargesAmount || item.makingCharges || 0),
            ledgerAmount: itemAmount,
            ledgerBank: invoice.modeOfPayment !== 'CASH' ? itemAmount : 0,
            ledgerCash: invoice.modeOfPayment === 'CASH' ? itemAmount : 0,
          });
        });
      });
      return flatRows;
    }

    // Default: Aggregated view (1 row per invoice)
    return data.map((invoice, idx) => {
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

      const labourTotal = items.reduce((sum, i) => sum + (Number(i.makingChargesAmount || i.makingCharges) || 0), 0);

      return {
        ...invoice,
        sn: idx + 1,
        ledgerMetal: metalLabel,
        ledgerItemName: items.map(i => i.description).join(', '),
        ledgerNetWeightGold: netWeightGold,
        ledgerNetWeightSilver: netWeightSilver,
        ledgerLabourTotal: labourTotal,
        ledgerGst: (Number(invoice.cgstAmount || 0) + Number(invoice.sgstAmount || 0)),
        ledgerBank: (invoice.modeOfPayment !== 'CASH') ? invoice.totalAmount : 0,
        ledgerCash: (invoice.modeOfPayment === 'CASH') ? invoice.totalAmount : 0,
      };
    });
  }, [data, showItems]);

  // Aggregations — always from base invoice data for accuracy
  const aggregations = useMemo(() => {
    let totalValue = 0, goldWt = 0, silverWt = 0, totalGst = 0, totalBank = 0, totalCash = 0;

    data.forEach(inv => {
      totalValue += Number(inv.totalAmount || 0);
      totalGst += Number(inv.cgstAmount || 0) + Number(inv.sgstAmount || 0);
      if (inv.modeOfPayment === 'CASH') totalCash += Number(inv.totalAmount || 0);
      else totalBank += Number(inv.totalAmount || 0);
      (inv.items || []).forEach(item => {
        if (item.metalType === 'SILVER') silverWt += Number(item.netWeight || 0);
        else goldWt += Number(item.netWeight || 0);
      });
    });

    return {
      count: showItems ? processedData.length : data.length,
      label: showItems ? 'items' : 'invoices',
      total: totalValue,
      goldWt, silverWt, totalGst, totalBank, totalCash,
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
    columnHelper.accessor('invoiceNumber', {
      header: 'Invoice No.',
      cell: info => <span className="attio-td-value">{info.getValue() || 'DRAFT'}</span>,
      size: 110,
    }),
    columnHelper.accessor('invoiceDate', {
      header: 'Date',
      cell: info => formatDate(info.getValue()),
      size: 90,
    }),
    columnHelper.accessor(row => row.customer?.fullName || row.buyerSnapshot?.name || '', {
      id: 'customer',
      header: 'Customer Name',
      size: 160,
    }),
    columnHelper.accessor(row => {
      const name = row.customer?.fullName || row.buyerSnapshot?.name || '';
      return name.split(' ').slice(1).join(' ') || '';
    }, {
      id: 'lastName',
      header: 'Last Name',
      size: 100,
    }),
    columnHelper.accessor(row => row.buyerSnapshot?.address || '', {
      id: 'address',
      header: 'Address',
      size: 150,
    }),
    columnHelper.accessor(row => row.buyerSnapshot?.phone || row.customer?.contactDetails?.[0]?.primaryPhone || '', {
      id: 'phone',
      header: 'Contact No.',
      size: 110,
    }),
    columnHelper.accessor('ledgerMetal', {
      header: 'Metal',
      size: 90,
    }),
    columnHelper.accessor(row => row.hsnSac || row.items?.[0]?.hsnSac || '', {
      id: 'hsn',
      header: 'Hsn',
      size: 90,
    }),
    columnHelper.accessor('ledgerItemName', {
      header: 'Item Name',
      size: 180,
    }),
    columnHelper.accessor('purity', {
      header: 'Purity',
      size: 80,
    }),
    columnHelper.accessor('ledgerNetWeightGold', {
      header: 'Net Wt. Gold',
      cell: info => Number(info.getValue() || 0).toFixed(3),
      size: 100,
    }),
    columnHelper.accessor('ledgerNetWeightSilver', {
      header: 'Net Wt. Silver',
      cell: info => Number(info.getValue() || 0).toFixed(3),
      size: 100,
    }),
    columnHelper.accessor('ledgerMetalRate', {
      header: 'Metal Rate PG',
      cell: info => info.getValue() ? formatCurrency(info.getValue()) : '—',
      size: 110,
    }),
    columnHelper.accessor(row => row.ledgerAmount || row.subtotal, {
      id: 'amount',
      header: 'Amount',
      cell: info => formatCurrency(info.getValue()),
      size: 110,
    }),
    columnHelper.accessor('labourRate', {
      header: 'Labour PG',
      cell: info => info.getValue() ? formatCurrency(info.getValue()) : '—',
      size: 90,
    }),
    columnHelper.accessor('ledgerLabourTotal', {
      header: 'LabourTotal',
      cell: info => formatCurrency(info.getValue()),
      size: 110,
    }),
    columnHelper.accessor('huid', {
      header: 'HUID',
      size: 100,
    }),
    columnHelper.accessor('ledgerGst', {
      header: 'Gst 3%',
      cell: info => formatCurrency(info.getValue()),
      size: 100,
    }),
    columnHelper.accessor('roundOff', {
      header: 'Round off',
      cell: info => Number(info.getValue() || 0).toFixed(2),
      size: 80,
    }),
    columnHelper.accessor('totalAmount', {
      header: 'Total',
      cell: info => <span className="fw-600">{formatCurrency(info.getValue())}</span>,
      size: 110,
    }),
    columnHelper.accessor('ledgerBank', {
      header: 'Bank',
      cell: info => formatCurrency(info.getValue()),
      size: 110,
    }),
    columnHelper.accessor('ledgerCash', {
      header: 'Cash',
      cell: info => formatCurrency(info.getValue()),
      size: 110,
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <button className="attio-icon-btn" onClick={() => onViewInvoice?.(row.original.invoiceId || row.original.id)}>
          <Icon name="eye" size={14} />
        </button>
      ),
      size: 60,
    }),
  ], [onViewInvoice]);

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
                      className={`attio-th ${idx === 0 ? 'attio-th-checkbox' : ''} ${header.id === 'invoiceNumber' ? 'attio-th-pinned' : ''}`}
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
                    <td key={cell.id} className={`attio-td ${idx === 0 ? 'attio-td-checkbox' : ''} ${cell.column.id === 'invoiceNumber' ? 'attio-td-pinned' : ''}`}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
          {/* Footer with sums */}
          {!isLoading && data.length > 0 && (
            <tfoot>
              <tr>
                {table.getAllColumns().map((col) => {
                  const totals = {
                    sn: `${aggregations.count} ${aggregations.label}`,
                    ledgerNetWeightGold: Number(aggregations.goldWt).toFixed(3),
                    ledgerNetWeightSilver: Number(aggregations.silverWt).toFixed(3),
                    ledgerGst: formatCurrency(aggregations.totalGst),
                    totalAmount: formatCurrency(aggregations.total),
                    ledgerBank: formatCurrency(aggregations.totalBank),
                    ledgerCash: formatCurrency(aggregations.totalCash),
                  };
                  const val = totals[col.id];
                  return (
                    <td key={col.id} className="attio-tf">
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
