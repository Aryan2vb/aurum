import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  createColumnHelper,
  flexRender,
} from '@tanstack/react-table';
import DashboardTemplate from '../../components/templates/DashboardTemplate/DashboardTemplate';
import Icon from '../../components/atoms/Icon/Icon';
import Avatar from '../../components/atoms/Avatar/Avatar';
import Checkbox from '../../components/atoms/Checkbox/Checkbox';
import ColumnResizer from '../../components/atoms/ColumnResizer/ColumnResizer';
import AmountDisplay from '../../components/atoms/AmountDisplay/AmountDisplay';
import DateDisplay from '../../components/atoms/DateDisplay/DateDisplay';
import DateRangeFilter, { parseLocalYmd, toLocalYmd } from '../../components/molecules/DateRangeFilter/DateRangeFilter';
import EnumFilter from '../../components/molecules/EnumFilter/EnumFilter';
import ViewSelector from '../../components/molecules/ViewSelector/ViewSelector';
import ImportExportMenu from '../../components/molecules/ImportExportMenu/ImportExportMenu';
import Toast from '../../components/atoms/Toast/Toast';
import AdvancePanel from '../../components/organisms/AdvancePanel/AdvancePanel';
import { useColumnResize } from '../../hooks/useColumnResize';
import { getAdvancesReport } from '../../services/reportsService';
import { flattenAdvanceData, ADVANCE_COLUMN_GROUPS } from '../../utils/exportUtils';
import { getDateRangeFilenameQualifier } from '../../utils/exportFilename';
import '../../components/organisms/CustomerTable/CustomerTable.css';
import './AdvancePage.css';

const columnHelper = createColumnHelper();
const fmtAmt = (v) => v == null ? '—' : '₹' + Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ADVANCE_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Available balance' },
  { value: 'SETTLED', label: 'Settled' },
];
const ADVANCE_VIEWS = [
  { id: 'active', label: 'Active advances' },
  { id: 'settled', label: 'Settled history' },
  { id: 'all', label: 'All activity' },
];
const isActiveAdvance = (row) => Number(row.availableBalance || 0) > 0;
const getLastActivityDate = (row) => row.transactions?.reduce((latest, transaction) => (
  !latest || new Date(transaction.date) > new Date(latest) ? transaction.date : latest
), null) || row.lastReceivedAt;

const SkeletonRows = ({ rows = 8, cols = 9 }) => (
  <>{Array.from({ length: rows }).map((_, ri) => (
    <tr key={ri}>{Array.from({ length: cols }).map((__, ci) => (
      <td key={ci} className="attio-td"><div className="skeleton-cell"><div className="skeleton-bar" style={{ width: ['40%','60%','80%'][(ri+ci)%3] }} /></div></td>
    ))}</tr>
  ))}</>
);

const buildColumns = () => [
  columnHelper.display({
    id: 'select',
    size: 40,
    enableSorting: false,
    enableResizing: false,
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
  }),
  columnHelper.accessor('customerName', { id: 'customerName', header: 'Customer', size: 230,
    cell: ({ row }) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Avatar name={row.original.customerName} size="sm" />
        <div>
          <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{row.original.customerName}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>{row.original.customerCode}</div>
        </div>
      </div>
    ),
  }),
  columnHelper.accessor('phone', { id: 'phone', header: 'Phone', size: 125, cell: info => info.getValue() || '—' }),
  columnHelper.display({ id: 'status', header: 'Status', size: 120,
    cell: ({ row }) => <span className={`advance-status ${isActiveAdvance(row.original) ? 'is-active' : 'is-settled'}`}>
      {isActiveAdvance(row.original) ? 'Available' : 'Settled'}
    </span>,
  }),
  columnHelper.accessor('totalReceived', { id: 'totalReceived', header: 'Received', size: 120, cell: info => <AmountDisplay value={info.getValue()} size="sm" variant="positive" /> }),
  columnHelper.accessor('totalApplied', { id: 'totalApplied', header: 'Applied', size: 110,
    cell: info => { const v = parseFloat(info.getValue() || 0); return v > 0 ? <AmountDisplay value={v} size="sm" variant="negative" /> : <span style={{ color: 'var(--text-tertiary)' }}>—</span>; },
  }),
  columnHelper.display({ id: 'returned', header: 'Returned / sent', size: 138,
    accessorFn: (row) => Number(row.totalRefunded || 0) + Number(row.totalTransferOut || 0),
    cell: ({ getValue }) => getValue() > 0 ? <AmountDisplay value={getValue()} size="sm" variant="negative" /> : <span style={{ color: 'var(--text-tertiary)' }}>—</span>,
  }),
  columnHelper.display({ id: 'lastActivity', header: 'Last activity', size: 130,
    accessorFn: getLastActivityDate,
    cell: info => info.getValue() ? <DateDisplay date={info.getValue()} format="absolute" size="sm" /> : '—',
  }),
  columnHelper.accessor('availableBalance', { id: 'availableBalance', header: 'Balance', size: 120,
    cell: info => <AmountDisplay value={info.getValue()} size="sm" emphasis variant="positive" />,
  }),
];

const AdvancePage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [view, setView] = useState('active');
  const [statusFilter, setStatusFilter] = useState([]);
  const [sorting, setSorting] = useState([{ id: 'availableBalance', desc: true }]);
  const { columnSizing, resizeOptions } = useColumnResize('advanceTableColumnSizing');
  const [toast, setToast] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelCustomerId, setPanelCustomerId] = useState(null);
  const [panelCustomerName, setPanelCustomerName] = useState('');
  const [rowSelection, setRowSelection] = useState({});

  const loadData = useCallback(async () => {
    try { setLoading(true); setError(null); const res = await getAdvancesReport(); setData(res?.customers || []); }
    catch (err) { setError(err.message || 'Failed to load'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { loadData(); }, [loadData]);

  const openPanel = useCallback((row) => { setPanelCustomerId(row.customerId); setPanelCustomerName(row.customerName); setPanelOpen(true); }, []);

  const filteredData = useMemo(() => data.filter((r) => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || r.customerName?.toLowerCase().includes(q) || r.customerCode?.toLowerCase().includes(q) || r.phone?.includes(q);
    const transactions = r.transactions || r.deposits || [];
    const matchesDate = (!dateFrom && !dateTo) || transactions.some((transaction) => {
      const day = String(transaction.date || '').slice(0, 10);
      return (!dateFrom || day >= dateFrom) && (!dateTo || day <= dateTo);
    });
    const active = isActiveAdvance(r);
    const matchesView = view === 'all' || (view === 'active' ? active : !active);
    const matchesStatus = statusFilter.length === 0
      || (active && statusFilter.includes('ACTIVE'))
      || (!active && statusFilter.includes('SETTLED'));
    return matchesSearch && matchesDate && matchesView && matchesStatus;
  }), [data, search, dateFrom, dateTo, statusFilter, view]);

  // Clear selection when rows leave the current view / filter result
  const filteredIds = useMemo(() => new Set(filteredData.map(r => r.customerId)), [filteredData]);
  useEffect(() => {
    setRowSelection(prev => {
      const next = {};
      let changed = false;
      for (const id in prev) {
        if (filteredIds.has(id)) {
          next[id] = true;
        } else {
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [filteredIds]);

  const columns = useMemo(() => buildColumns(), []);

  const selectedCount = Object.keys(rowSelection).length;

  // Export data: selected rows or all filtered rows
  const exportData = useMemo(() => {
    if (selectedCount > 0) {
      return filteredData.filter(r => rowSelection[r.customerId]);
    }
    return filteredData;
  }, [filteredData, rowSelection, selectedCount]);

  const filenameQualifier = useMemo(
    () => (dateFrom || dateTo) ? getDateRangeFilenameQualifier({ dateFrom, dateTo }) : undefined,
    [dateFrom, dateTo],
  );

  const totals = useMemo(() => ({
    totalReceived: filteredData.reduce((s, r) => s + parseFloat(r.totalReceived || 0), 0),
    totalApplied: filteredData.reduce((s, r) => s + parseFloat(r.totalApplied || 0), 0),
    totalReturned: filteredData.reduce((s, r) => s + parseFloat(r.totalRefunded || 0) + parseFloat(r.totalTransferOut || 0), 0),
    availableBalance: filteredData.reduce((s, r) => s + parseFloat(r.availableBalance || 0), 0),
  }), [filteredData]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, columnSizing, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getRowId: row => row.customerId,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    ...resizeOptions,
  });

  const activeFilterCount = statusFilter.length + Number(Boolean(dateFrom || dateTo));

  const colCount = columns.length;

  return (
    <DashboardTemplate headerTitle="Advance" headerTabs={[]}>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
      <div className="attio-table-container">
        <div className="attio-header">
          <div className="attio-header-left">
            <ViewSelector currentView={view} views={ADVANCE_VIEWS} onViewChange={setView} />
          </div>
          <div className="attio-header-right">
            <ImportExportMenu
              data={exportData}
              filename="Advance Report"
              filenameQualifier={filenameQualifier}
              sheetName="Advance Report"
              flattenRow={flattenAdvanceData}
              selectedCount={selectedCount}
              resourceName="advances"
              columnGroups={ADVANCE_COLUMN_GROUPS}
            />
            <button className="attio-primary-btn" onClick={() => { setPanelCustomerId(null); setPanelCustomerName(''); setPanelOpen(true); }}>
              <Icon name="add" size={14} /><span>New Advance</span>
            </button>
          </div>
        </div>
        <div className="saas-toolbar">
          <div className="saas-toolbar-search">
            <svg className="saas-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input type="text" className="saas-search-input" placeholder="Search customer…" value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button className="saas-search-clear" onClick={() => setSearch('')}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>}
          </div>
          <div className="saas-toolbar-filters" aria-label="Filter advances">
            <EnumFilter
              label="Balance"
              icon={<Icon name="status" size={14} />}
              value={statusFilter}
              options={ADVANCE_STATUS_OPTIONS}
              onChange={setStatusFilter}
              colorMap={{
                ACTIVE: { bg: 'rgba(34, 197, 94, 0.14)', color: '#16a34a' },
                SETTLED: { bg: 'rgba(107, 114, 128, 0.14)', color: '#6b7280' },
              }}
            />
            <DateRangeFilter
              label="Activity date"
              icon={<Icon name="date" size={14} />}
              start={parseLocalYmd(dateFrom)}
              end={parseLocalYmd(dateTo)}
              onChange={(start, end) => {
                setDateFrom(toLocalYmd(start));
                setDateTo(toLocalYmd(end));
              }}
            />
            {activeFilterCount > 0 && (
              <button type="button" className="saas-clear-filters" onClick={() => { setStatusFilter([]); setDateFrom(''); setDateTo(''); }}>
                <Icon name="close" size={12} /> Clear
              </button>
            )}
          </div>
          <div className="saas-toolbar-meta">
            <span className="saas-count">
              {selectedCount > 0
                ? `${selectedCount} selected`
                : `${filteredData.length} customer${filteredData.length !== 1 ? 's' : ''}`}
            </span>
            {selectedCount > 0 && (
              <button type="button" className="saas-clear-filters" onClick={() => setRowSelection({})}>
                <Icon name="close" size={12} /> Clear
              </button>
            )}
          </div>
        </div>
        <div className="attio-table-wrapper">
          {error ? (
            <div className="attio-empty"><span>{error}</span><button className="attio-primary-btn" onClick={loadData}>Retry</button></div>
          ) : (
            <table className={`attio-table ${loading ? 'attio-skeleton-table' : ''}`} style={{ width: table.getTotalSize(), minWidth: table.getTotalSize() }}>
              <thead><tr>
                {table.getHeaderGroups()[0]?.headers.map(header => (
                    <th key={header.id} className={`attio-th${header.id === 'select' ? ' attio-th-checkbox' : ''}`} style={{ width: header.getSize() }}
                    onClick={!loading && header.id !== 'select' && header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}>
                    <div className="attio-th-content">
                      <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                      {header.column.getIsSorted() && !loading && (
                        <svg className="attio-sort-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          {header.column.getIsSorted() === 'asc' ? <path d="m18 15-6-6-6 6"/> : <path d="m6 9 6 6 6-6"/>}
                        </svg>
                      )}
                    </div>
                    {header.id !== 'select' && <ColumnResizer header={header} />}
                  </th>
                ))}
              </tr></thead>
              <tbody>
                {loading ? <SkeletonRows cols={colCount} /> : table.getRowModel().rows.length === 0 ? (
                  <tr><td colSpan={colCount} className="attio-empty">
                    <Icon name="advance" size={36} color="var(--text-tertiary)" />
                    <span>{search ? 'No results' : 'No advance balances yet.'}</span>
                  </td></tr>
                ) : table.getRowModel().rows.map(row => (
                  <React.Fragment key={row.id}>
                    <tr
                      onClick={(e) => {
                        // Don't open panel when clicking on the checkbox column
                        if (e.target.closest('[role="checkbox"]') || e.target.closest('.attio-td-checkbox')) return;
                        openPanel(row.original);
                      }}
                      style={{ cursor: 'pointer' }}
                      className={row.getIsSelected() ? 'attio-row-selected' : ''}
                    >
                      {row.getVisibleCells().map(cell => (
                        <td
                          key={cell.id}
                          className={`attio-td${cell.column.id === 'select' ? ' attio-td-checkbox' : ''}`}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
              {!loading && filteredData.length > 0 && (
                <tfoot><tr>
                  <td className="attio-tf" colSpan={4}><span className="attio-tf-value">{filteredData.length} total</span></td>
                  <td className="attio-tf"><span className="attio-tf-value">{fmtAmt(totals.totalReceived)}</span></td>
                  <td className="attio-tf"><span className="attio-tf-value">{fmtAmt(totals.totalApplied)}</span></td>
                  <td className="attio-tf"><span className="attio-tf-value">{fmtAmt(totals.totalReturned)}</span></td>
                  <td className="attio-tf" />
                  <td className="attio-tf"><span className="attio-tf-value" style={{ color: 'var(--color-status-paid)', fontWeight: 600 }}>{fmtAmt(totals.availableBalance)}</span></td>
                </tr></tfoot>
              )}
            </table>
          )}
        </div>
      </div>
        <AdvancePanel isOpen={panelOpen} onClose={() => setPanelOpen(false)} customerId={panelCustomerId} customerName={panelCustomerName}
        onSuccess={() => { setToast({ type: 'success', message: 'Advance updated' }); loadData(); }} />
    </DashboardTemplate>
  );
};

export default AdvancePage;
