import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  createColumnHelper,
  flexRender,
} from '@tanstack/react-table';
import DashboardTemplate from '../../components/templates/DashboardTemplate/DashboardTemplate';
import Icon from '../../components/atoms/Icon/Icon';
import Avatar from '../../components/atoms/Avatar/Avatar';
import AmountDisplay from '../../components/atoms/AmountDisplay/AmountDisplay';
import DateDisplay from '../../components/atoms/DateDisplay/DateDisplay';
import Toast from '../../components/atoms/Toast/Toast';
import AdvancePanel from '../../components/organisms/AdvancePanel/AdvancePanel';
import { getAdvancesReport } from '../../services/reportsService';
import { deleteAdvanceEntry } from '../../services/advanceService';
import '../../components/organisms/CustomerTable/CustomerTable.css';
import './AdvancePage.css';

const columnHelper = createColumnHelper();
const fmtAmt = (v) => v == null ? '—' : '₹' + Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d) => { if (!d) return '—'; try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return '—'; } };
const METHOD_LABELS = { CASH: 'Cash', UPI: 'UPI', BANK_TRANSFER: 'Bank Transfer', CHEQUE: 'Cheque', NEFT: 'NEFT', RTGS: 'RTGS', IMPS: 'IMPS', OTHER: 'Other' };

const SkeletonRows = ({ rows = 8, cols = 9 }) => (
  <>{Array.from({ length: rows }).map((_, ri) => (
    <tr key={ri}>{Array.from({ length: cols }).map((__, ci) => (
      <td key={ci} className="attio-td"><div className="skeleton-cell"><div className="skeleton-bar" style={{ width: ['40%','60%','80%'][(ri+ci)%3] }} /></div></td>
    ))}</tr>
  ))}</>
);

const buildColumns = (onManage) => [
  columnHelper.display({ id: 'expander', size: 36, header: () => null,
    cell: ({ row }) => row.original.deposits?.length > 0 ? (
      <button className="advance-expand-btn" onClick={e => { e.stopPropagation(); row.toggleExpanded(); }}>
        {row.getIsExpanded() ? '▾' : '▸'}
      </button>
    ) : null,
  }),
  columnHelper.accessor('customerName', { id: 'customerName', header: 'Customer', size: 220,
    cell: ({ row }) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Avatar name={row.original.customerName || row.original.phone || 'Customer'} size="sm" />
        <div>
          <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{row.original.customerName || row.original.phone || 'Customer'}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>{row.original.customerCode}</div>
        </div>
      </div>
    ),
  }),
  columnHelper.accessor('phone', { id: 'phone', header: 'Phone', size: 120, cell: info => info.getValue() || '—' }),
  columnHelper.accessor('totalReceived', { id: 'totalReceived', header: 'Received', size: 120, cell: info => <AmountDisplay value={info.getValue()} size="sm" /> }),
  columnHelper.accessor('totalApplied', { id: 'totalApplied', header: 'Applied', size: 110,
    cell: info => { const v = parseFloat(info.getValue() || 0); return v > 0 ? <AmountDisplay value={v} size="sm" variant="negative" /> : <span style={{ color: 'var(--text-tertiary)' }}>—</span>; },
  }),
  columnHelper.accessor('totalRefunded', { id: 'totalRefunded', header: 'Refunded', size: 110,
    cell: info => { const v = parseFloat(info.getValue() || 0); return v > 0 ? <AmountDisplay value={v} size="sm" variant="negative" /> : <span style={{ color: 'var(--text-tertiary)' }}>—</span>; },
  }),
  columnHelper.accessor('lastReceivedAt', { id: 'lastReceivedAt', header: 'Last Deposit', size: 120,
    cell: info => info.getValue() ? <DateDisplay date={info.getValue()} format="absolute" size="sm" /> : '—',
  }),
  columnHelper.accessor('availableBalance', { id: 'availableBalance', header: 'Balance', size: 120,
    cell: info => <AmountDisplay value={info.getValue()} size="sm" emphasis variant="positive" />,
  }),
  columnHelper.display({ id: 'actions', header: '', size: 60,
    cell: ({ row }) => (
      <button className="attio-icon-btn" title="Manage" onClick={e => { e.stopPropagation(); onManage(row.original); }}>
        <Icon name="edit" size={14} />
      </button>
    ),
  }),
];

const AdvancePage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [sorting, setSorting] = useState([{ id: 'availableBalance', desc: true }]);
  const [expanded, setExpanded] = useState({});
  const [toast, setToast] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelCustomerId, setPanelCustomerId] = useState(null);
  const [panelCustomerName, setPanelCustomerName] = useState('');

  const loadData = useCallback(async () => {
    try { setLoading(true); setError(null); const res = await getAdvancesReport(); setData(res?.customers || []); }
    catch (err) { setError(err.message || 'Failed to load'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { loadData(); }, [loadData]);

  const openPanel = useCallback((row) => { setPanelCustomerId(row.customerId); setPanelCustomerName(row.customerName); setPanelOpen(true); }, []);
  const columns = useMemo(() => buildColumns(openPanel), [openPanel]);

  const filteredData = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(r => r.customerName?.toLowerCase().includes(q) || r.customerCode?.toLowerCase().includes(q) || r.phone?.includes(q));
  }, [data, search]);

  const totals = useMemo(() => ({
    totalReceived: filteredData.reduce((s, r) => s + parseFloat(r.totalReceived || 0), 0),
    totalApplied: filteredData.reduce((s, r) => s + parseFloat(r.totalApplied || 0), 0),
    totalRefunded: filteredData.reduce((s, r) => s + parseFloat(r.totalRefunded || 0), 0),
    availableBalance: filteredData.reduce((s, r) => s + parseFloat(r.availableBalance || 0), 0),
  }), [filteredData]);

  const table = useReactTable({
    data: filteredData, columns,
    state: { sorting, expanded },
    onSortingChange: setSorting, onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(), getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: row => (row.original.deposits?.length || 0) > 0,
  });

  const colCount = columns.length;

  return (
    <DashboardTemplate headerTitle="Advance" headerTabs={[]}>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
      <div className="attio-table-container">
        <div className="attio-header">
          <div className="attio-header-left"><span className="saas-view-label">All Advances</span></div>
          <div className="attio-header-right">
            <button className="attio-primary-btn" onClick={() => { setPanelCustomerId(null); setPanelCustomerName(''); setPanelOpen(true); }}>
              <Icon name="add" size={14} /><span>Add Advance</span>
            </button>
          </div>
        </div>
        <div className="saas-toolbar">
          <div className="saas-toolbar-search">
            <svg className="saas-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input type="text" className="saas-search-input" placeholder="Search customer…" value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button className="saas-search-clear" onClick={() => setSearch('')}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>}
          </div>
          <div className="saas-toolbar-meta"><span className="saas-count">{filteredData.length} customer{filteredData.length !== 1 ? 's' : ''}</span></div>
        </div>
        <div className="attio-table-wrapper">
          {error ? (
            <div className="attio-empty"><span>{error}</span><button className="attio-primary-btn" onClick={loadData}>Retry</button></div>
          ) : (
            <table className={`attio-table ${loading ? 'attio-skeleton-table' : ''}`}>
              <thead><tr>
                {table.getHeaderGroups()[0]?.headers.map(header => (
                  <th key={header.id} className="attio-th" style={{ width: header.getSize() }}
                    onClick={!loading && header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}>
                    <div className="attio-th-content">
                      <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                      {header.column.getIsSorted() && !loading && (
                        <svg className="attio-sort-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          {header.column.getIsSorted() === 'asc' ? <path d="m18 15-6-6-6 6"/> : <path d="m6 9 6 6 6-6"/>}
                        </svg>
                      )}
                    </div>
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
                    <tr className={row.getIsExpanded() ? 'advance-row-expanded' : ''} onClick={() => openPanel(row.original)} style={{ cursor: 'pointer' }}>
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className="attio-td">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                      ))}
                    </tr>
                    {row.getIsExpanded() && row.original.deposits?.map((dep, i) => (
                      <tr key={`${row.id}-d-${i}`} className="advance-deposit-row">
                        <td className="attio-td" />
                        <td className="attio-td advance-deposit-label" colSpan={2}>
                          <span className="advance-deposit-icon">↳</span>
                          <span className="advance-deposit-method">{METHOD_LABELS[dep.paymentMethod] || 'Deposit'}</span>
                          {dep.description && <span className="advance-deposit-desc">{dep.description}</span>}
                        </td>
                        <td className="attio-td"><AmountDisplay value={dep.amount} size="sm" variant="positive" /></td>
                        <td className="attio-td" /><td className="attio-td" />
                        <td className="attio-td"><span className="advance-deposit-date">{fmtDate(dep.date)}</span></td>
                        <td className="attio-td" />
                        <td className="attio-td">
                          <button
                            className="advance-deposit-delete"
                            title="Delete this entry"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!window.confirm(`Delete advance of ${fmtAmt(dep.amount)}? This will reduce the customer's balance.`)) return;
                              deleteAdvanceEntry(row.original.customerId, dep.id)
                                .then(() => { setToast({ type: 'success', message: 'Entry deleted' }); loadData(); })
                                .catch(err => setToast({ type: 'error', message: err.message || 'Failed to delete' }));
                            }}
                          >
                            <Icon name="close" size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
              {!loading && filteredData.length > 0 && (
                <tfoot><tr>
                  <td className="attio-tf" /><td className="attio-tf" colSpan={2}><span className="attio-tf-value">{filteredData.length} total</span></td>
                  <td className="attio-tf"><span className="attio-tf-value">{fmtAmt(totals.totalReceived)}</span></td>
                  <td className="attio-tf"><span className="attio-tf-value">{fmtAmt(totals.totalApplied)}</span></td>
                  <td className="attio-tf"><span className="attio-tf-value">{fmtAmt(totals.totalRefunded)}</span></td>
                  <td className="attio-tf" />
                  <td className="attio-tf"><span className="attio-tf-value" style={{ color: 'var(--color-status-paid)', fontWeight: 600 }}>{fmtAmt(totals.availableBalance)}</span></td>
                  <td className="attio-tf" />
                </tr></tfoot>
              )}
            </table>
          )}
        </div>
      </div>
      <AdvancePanel isOpen={panelOpen} onClose={() => setPanelOpen(false)} customerId={panelCustomerId} customerName={panelCustomerName}
        onSuccess={() => { setToast({ type: 'success', message: 'Advance saved' }); loadData(); }} />
    </DashboardTemplate>
  );
};

export default AdvancePage;
