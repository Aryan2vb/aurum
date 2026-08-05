import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  createColumnHelper,
  flexRender,
} from '@tanstack/react-table';
import DashboardTemplate from '../../components/templates/DashboardTemplate/DashboardTemplate';
import Icon from '../../components/atoms/Icon/Icon';
import DateDisplay from '../../components/atoms/DateDisplay/DateDisplay';
import Toast from '../../components/atoms/Toast/Toast';
import { getStockBalances, getStockLedger, initializeOpeningBalance, getStockGroupSummary } from '../../services/stockService';
import { getMetalPurities } from '../../services/metalPuritiesService';
import { purityLabelsForMetal, withOrphanPurityOption } from '../../utils/metalPurities';
import './StockPage.css';

const columnHelper = createColumnHelper();
const formatType = (type) => {
  switch (type) {
    case 'OPENING_BALANCE': return 'Opening';
    case 'PURCHASE': return 'Purchase';
    case 'SALE': return 'Sale';
    case 'ADJUSTMENT': return 'Adjustment';
    default: return type;
  }
};

const SkeletonRows = ({ rows = 5, cols = 8 }) => (
  <>{Array.from({ length: rows }).map((_, ri) => (
    <tr key={ri}>{Array.from({ length: cols }).map((__, ci) => (
      <td key={ci} className="attio-td"><div className="skeleton-cell"><div className="skeleton-bar" style={{ width: ['40%', '60%', '80%'][(ri + ci) % 3] }} /></div></td>
    ))}</tr>
  ))}</>
);

const fmtAmt = (n) => n == null || parseFloat(n) === 0 ? '—' : '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const FALLBACK_PURITY_RANK = { '24K': 1, '22K': 2, '20K': 3, '18K': 4, F: 1, 925: 2 };
const getPurityRank = (purity, rankMap) =>
  (rankMap && rankMap[purity]) || FALLBACK_PURITY_RANK[purity] || 99;

/** Indian FY starts 1 Apr. Returns YYYY-MM-DD. */
const toDateInput = (d = new Date()) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};
const currentFyStartDate = (d = new Date()) => {
  const fyStartYear = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return `${fyStartYear}-04-01`;
};
const openingKey = (metalType, purity) => `${metalType}:${purity}`;

const emptyOpeningBalanceModal = () => ({
  metalType: 'GOLD',
  purity: '22K',
  quantity: '',
  rate: '',
  date: currentFyStartDate(),
});

const summaryRange = (preset, today = new Date()) => {
  const todayStr = toDateInput(today);
  if (preset === 'this_month') {
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    return { startDate: `${today.getFullYear()}-${mm}-01`, endDate: todayStr };
  }
  if (preset === 'last_month') {
    const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const last = new Date(today.getFullYear(), today.getMonth(), 0);
    return { startDate: toDateInput(first), endDate: toDateInput(last) };
  }
  return { startDate: currentFyStartDate(today), endDate: todayStr };
};

const SUMMARY_PRESETS = [
  { id: 'this_month', label: 'This Month' },
  { id: 'last_month', label: 'Last Month' },
  { id: 'this_fy', label: 'This FY' },
];

const formatDateReadable = (dStr) => {
  if (!dStr) return '';
  const [y, m, d] = dStr.split('-').map(Number);
  if (!y || !m || !d) return dStr;
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const buildColumns = () => [
  columnHelper.accessor('date', {
    id: 'date', header: 'Date', size: 140,
    cell: (info) => (info.getValue() ? <DateDisplay date={info.getValue()} format="absolute" size="sm" /> : '—'),
  }),
  columnHelper.accessor('transactionType', {
    id: 'transactionType', header: 'Type', size: 120,
    cell: (info) => <span className={`stock-badge type-${info.getValue()?.toLowerCase()}`}>{formatType(info.getValue())}</span>,
  }),
  columnHelper.accessor('metalType', {
    id: 'metalType', header: 'Metal', size: 90,
    cell: (info) => <span className={`metal-badge ${(info.getValue() || '').toLowerCase()}`}>{info.getValue()}</span>,
  }),
  columnHelper.accessor('purity', {
    id: 'purity', header: 'Purity', size: 80,
    cell: (info) => <span className="purity-badge">{info.getValue()}</span>,
  }),
  columnHelper.accessor('quantityIn', {
    id: 'quantityIn', header: 'In (g)', size: 100,
    cell: (info) => {
      const v = parseFloat(info.getValue() || 0);
      return v > 0 ? <span className="qty-in">+{v.toFixed(3)}</span> : '—';
    },
  }),
  columnHelper.accessor('quantityOut', {
    id: 'quantityOut', header: 'Out (g)', size: 100,
    cell: (info) => {
      const v = parseFloat(info.getValue() || 0);
      return v > 0 ? <span className="qty-out">−{v.toFixed(3)}</span> : '—';
    },
  }),
  columnHelper.accessor('rate', {
    id: 'rate', header: 'Rate', size: 110,
    cell: (info) => fmtAmt(info.getValue()),
  }),
  columnHelper.accessor('totalValue', {
    id: 'totalValue', header: 'Value', size: 120,
    cell: (info) => fmtAmt(info.getValue()),
  }),
  columnHelper.accessor('runningBalance', {
    id: 'runningBalance', header: 'Balance', size: 110,
    cell: (info) => {
      const v = parseFloat(info.getValue() || 0);
      return <strong className={v < 0 ? 'qty-out' : ''}>{v.toFixed(3)}</strong>;
    },
  }),
  columnHelper.accessor('referenceId', {
    id: 'referenceId', header: 'Ref', size: 120,
    cell: (info) => (info.getValue() ? <span className="reference-pill">{String(info.getValue()).slice(0, 8)}</span> : '—'),
  }),
  columnHelper.accessor('notes', {
    id: 'notes', header: 'Notes', size: 180,
    cell: (info) => <span className="ledger-note">{info.getValue() || '—'}</span>,
  }),
];

const StockPage = () => {
  const [balances, setBalances] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sorting, setSorting] = useState([]);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('live');
  const [summaryPreset, setSummaryPreset] = useState('this_fy');
  const [{ startDate, endDate }, setSummaryRange] = useState(() => summaryRange('this_fy'));
  const [summaryData, setSummaryData] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalData, setModalData] = useState(() => emptyOpeningBalanceModal());
  const [editingOpeningKey, setEditingOpeningKey] = useState(null);
  const [metalPurities, setMetalPurities] = useState([]);

  const goldPurityLabels = useMemo(
    () => purityLabelsForMetal(metalPurities, 'GOLD'),
    [metalPurities],
  );
  const silverPurityLabels = useMemo(
    () => purityLabelsForMetal(metalPurities, 'SILVER'),
    [metalPurities],
  );
  const modalPurityOptions = useMemo(() => {
    const base =
      modalData.metalType === 'SILVER' ? silverPurityLabels : goldPurityLabels;
    return withOrphanPurityOption(base, modalData.purity);
  }, [modalData.metalType, modalData.purity, goldPurityLabels, silverPurityLabels]);

  const purityRankMap = useMemo(() => {
    const map = {};
    metalPurities.forEach((row) => {
      map[row.label] = (row.sortOrder ?? 0) + 1;
    });
    return map;
  }, [metalPurities]);

  const openingByKey = useMemo(() => {
    const map = new Map();
    ledger.forEach((entry) => {
      if (entry.transactionType !== 'OPENING_BALANCE') return;
      map.set(openingKey(entry.metalType, entry.purity), entry);
    });
    return map;
  }, [ledger]);

  const closeModal = useCallback(() => {
    if (modalLoading) return;
    setIsModalOpen(false);
    setEditingOpeningKey(null);
    setModalData(emptyOpeningBalanceModal());
  }, [modalLoading]);

  const openOpeningModal = useCallback((balance) => {
    if (balance) {
      const key = openingKey(balance.metalType, balance.purity);
      const existing = openingByKey.get(key);
      setEditingOpeningKey(key);
      setModalData({
        metalType: balance.metalType,
        purity: balance.purity,
        quantity: existing?.quantityIn != null ? String(existing.quantityIn) : '',
        rate: existing?.rate != null ? String(existing.rate) : '',
        date: existing?.date
          ? String(existing.date).slice(0, 10)
          : currentFyStartDate(),
      });
    } else {
      setEditingOpeningKey(null);
      const defaultMetal = 'GOLD';
      const labels = purityLabelsForMetal(metalPurities, defaultMetal);
      setModalData({
        ...emptyOpeningBalanceModal(),
        metalType: defaultMetal,
        purity: labels[0] || '22K',
      });
    }
    setIsModalOpen(true);
  }, [openingByKey, metalPurities]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [balRes, ledRes, purityRes] = await Promise.all([
        getStockBalances(),
        getStockLedger(),
        getMetalPurities(false).catch(() => []),
      ]);
      setBalances(balRes || []);
      setLedger(ledRes || []);
      setMetalPurities(Array.isArray(purityRes) ? purityRes : []);
    } catch (err) {
      setError(err.message || 'Failed to load stock data');
    } finally {
      setLoading(false);
    }
  }, []);

  const generateSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);
      const res = await getStockGroupSummary(startDate, endDate);
      setSummaryData(res || []);
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to generate stock summary' });
    } finally {
      setSummaryLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (activeTab === 'summary') generateSummary();
  }, [activeTab, generateSummary]);

  useEffect(() => {
    if (!isModalOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') closeModal(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isModalOpen, closeModal]);

  const handleModalChange = (e) => {
    const { name, value } = e.target;
    setModalData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === 'metalType') {
        const labels = purityLabelsForMetal(metalPurities, value);
        updated.purity = labels[0] || (value === 'GOLD' ? '22K' : 'F');
      }
      return updated;
    });
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!modalData.quantity || parseFloat(modalData.quantity) <= 0) {
      setToast({ type: 'error', message: 'Enter a valid weight quantity' });
      return;
    }
    if (!modalData.rate || parseFloat(modalData.rate) <= 0) {
      setToast({ type: 'error', message: 'Enter a valid rate' });
      return;
    }
    if (!modalData.date) {
      setToast({ type: 'error', message: 'Select a date' });
      return;
    }

    try {
      setModalLoading(true);
      await initializeOpeningBalance({
        metalType: modalData.metalType,
        purity: modalData.purity,
        quantity: parseFloat(modalData.quantity),
        rate: parseFloat(modalData.rate),
        date: modalData.date,
      });
      setToast({ type: 'success', message: editingOpeningKey ? 'Opening stock updated' : 'Opening stock saved' });
      setIsModalOpen(false);
      setEditingOpeningKey(null);
      setModalData(emptyOpeningBalanceModal());
      loadData();
      if (activeTab === 'summary') generateSummary();
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to initialize opening balance' });
    } finally {
      setModalLoading(false);
    }
  };

  const applySummaryPreset = (preset) => {
    setSummaryPreset(preset);
    setSummaryRange(summaryRange(preset));
  };

  const groupedSummary = useMemo(() => {
    const groups = { GOLD: [], SILVER: [] };
    summaryData.forEach((item) => {
      if (groups[item.metalType]) groups[item.metalType].push(item);
    });
    const sortFn = (a, b) => getPurityRank(a.purity, purityRankMap) - getPurityRank(b.purity, purityRankMap);
    groups.GOLD.sort(sortFn);
    groups.SILVER.sort(sortFn);
    return groups;
  }, [summaryData, purityRankMap]);

  const calculatedTotals = useMemo(() => {
    const totals = {
      GOLD: { opQty: 0, opVal: 0, inQty: 0, inVal: 0, outQty: 0, outVal: 0, clQty: 0, clVal: 0 },
      SILVER: { opQty: 0, opVal: 0, inQty: 0, inVal: 0, outQty: 0, outVal: 0, clQty: 0, clVal: 0 },
    };
    summaryData.forEach((item) => {
      const g = item.metalType;
      if (!totals[g]) return;
      totals[g].opQty += item.opening.quantity;
      totals[g].opVal += item.opening.value;
      totals[g].inQty += item.inwards.quantity;
      totals[g].inVal += item.inwards.value;
      totals[g].outQty += item.outwards.quantity;
      totals[g].outVal += item.outwards.value;
      totals[g].clQty += item.closing.quantity;
      totals[g].clVal += item.closing.value;
    });
    return totals;
  }, [summaryData]);

  const renderSummaryRows = () => {
    const rows = [];
    const fmtRate = (qty, val) => (Number(qty) !== 0 && Number(val) !== 0) ? Math.abs(Number(val) / Number(qty)).toFixed(2) : '—';
    const fmtVal = (val) => {
      const v = Number(val) || 0;
      return v !== 0 ? `${v < 0 ? '−' : ''}₹${Math.abs(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';
    };
    const fmtQty = (qty) => {
      const q = Number(qty) || 0;
      return q !== 0 ? q.toFixed(3) : '—';
    };
    const fmtItemRate = (rate, qty) => (Number(qty) !== 0 && Number(rate) !== 0) ? Math.abs(Number(rate)).toFixed(2) : '—';

    const pushMetalBlock = (metal, items, tot) => {
      if (!items.length) return;
      items.forEach((item) => {
        rows.push(
          <tr key={`${metal}-${item.purity}`} className="summary-purity-row">
            <td className="attio-td purity-cell">{metal} · {item.purity}</td>
            <td className="attio-td num">{fmtQty(item.opening.quantity)}</td>
            <td className="attio-td num">{fmtItemRate(item.opening.rate, item.opening.quantity)}</td>
            <td className="attio-td num">{fmtVal(item.opening.value)}</td>
            <td className="attio-td num">{fmtQty(item.inwards.quantity)}</td>
            <td className="attio-td num">{fmtItemRate(item.inwards.rate, item.inwards.quantity)}</td>
            <td className="attio-td num">{fmtVal(item.inwards.value)}</td>
            <td className="attio-td num">{fmtQty(item.outwards.quantity)}</td>
            <td className="attio-td num">{fmtItemRate(item.outwards.rate, item.outwards.quantity)}</td>
            <td className="attio-td num">{fmtVal(item.outwards.value)}</td>
            <td className="attio-td num">{fmtQty(item.closing.quantity)}</td>
            <td className="attio-td num">{fmtItemRate(item.closing.rate, item.closing.quantity)}</td>
            <td className="attio-td num">{fmtVal(item.closing.value)}</td>
          </tr>,
        );
      });
      rows.push(
        <tr key={`${metal}-total`} className="summary-grand-row">
          <td className="attio-td">{metal} Total</td>
          <td className="attio-td num">{fmtQty(tot.opQty)}</td>
          <td className="attio-td num">{fmtRate(tot.opQty, tot.opVal)}</td>
          <td className="attio-td num">{fmtVal(tot.opVal)}</td>
          <td className="attio-td num">{fmtQty(tot.inQty)}</td>
          <td className="attio-td num">{fmtRate(tot.inQty, tot.inVal)}</td>
          <td className="attio-td num">{fmtVal(tot.inVal)}</td>
          <td className="attio-td num">{fmtQty(tot.outQty)}</td>
          <td className="attio-td num">{fmtRate(tot.outQty, tot.outVal)}</td>
          <td className="attio-td num">{fmtVal(tot.outVal)}</td>
          <td className="attio-td num">{fmtQty(tot.clQty)}</td>
          <td className="attio-td num">{fmtRate(tot.clQty, tot.clVal)}</td>
          <td className="attio-td num">{fmtVal(tot.clVal)}</td>
        </tr>,
      );
    };

    pushMetalBlock('GOLD', groupedSummary.GOLD, calculatedTotals.GOLD);
    pushMetalBlock('SILVER', groupedSummary.SILVER, calculatedTotals.SILVER);
    return rows;
  };

  const columns = useMemo(() => buildColumns(), []);
  const table = useReactTable({
    data: ledger,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const colCount = columns.length;
  const balanceRows = useMemo(() => [...balances].sort((a, b) => {
    if (a.metalType !== b.metalType) return a.metalType.localeCompare(b.metalType);
    return getPurityRank(a.purity, purityRankMap) - getPurityRank(b.purity, purityRankMap);
  }), [balances, purityRankMap]);

  const modalValue = modalData.quantity && modalData.rate
    ? parseFloat(modalData.quantity) * parseFloat(modalData.rate)
    : 0;

  return (
    <DashboardTemplate headerTitle="Stock & Inventory" headerTabs={[]}>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      <div className="stock-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'live'}
          className={`tab-btn${activeTab === 'live' ? ' active' : ''}`}
          onClick={() => setActiveTab('live')}
        >
          <Icon name="product" size={14} />
          Balances
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'summary'}
          className={`tab-btn${activeTab === 'summary' ? ' active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          <Icon name="file" size={14} />
          Group Summary
        </button>
      </div>

      {activeTab === 'live' ? (
        <div className="stock-live-pane">
          <div className="stock-balances-container">
            <div className="stock-balances-header">
              <h2 className="stock-section-title">Balances</h2>
              <div className="stock-balances-actions">
                <Link to="/settings#metal-purities" className="attio-secondary-btn">
                  Manage purities
                </Link>
                <button type="button" className="attio-primary-btn" onClick={() => openOpeningModal()}>
                  <Icon name="add" size={14} /><span>Opening Stock</span>
                </button>
              </div>
            </div>

            {error && (
              <div className="stock-inline-error">
                <span>{error}</span>
                <button type="button" className="attio-primary-btn" onClick={loadData}>Retry</button>
              </div>
            )}

            <div className="stock-balance-panel">
              {!loading && balances.length === 0 && !error && (
                <div className="stock-empty-card">
                  <Icon name="product" size={32} color="var(--text-tertiary)" />
                  <p>No stock balances yet.</p>
                  <button type="button" className="attio-primary-btn" onClick={() => openOpeningModal()}>
                    <Icon name="add" size={14} /><span>Set opening stock</span>
                  </button>
                </div>
              )}
              {loading && Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="stock-balance-skeleton" />
              ))}
              {!loading && balanceRows.length > 0 && (
                <table className="stock-balance-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th className="num">Balance</th>
                      <th className="num">Updated</th>
                      <th className="actions-col" aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {balanceRows.map((bal) => {
                      const quantity = Number(bal.quantity || 0);
                      const hasOpening = openingByKey.has(openingKey(bal.metalType, bal.purity));
                      return (
                        <tr key={bal.id} className={quantity < 0 ? 'negative-row' : ''}>
                          <td>
                            <span className={`balance-item metal-${bal.metalType.toLowerCase()}`}>
                              <span className="balance-metal">{bal.metalType}</span>
                              <span className="balance-purity">{bal.purity}</span>
                            </span>
                          </td>
                          <td className={`balance-quantity num${quantity < 0 ? ' negative' : ''}`}>
                            {Number(quantity).toFixed(3)}<span className="unit"> g</span>
                          </td>
                          <td className="balance-updated num">
                            {bal.updatedAt ? <DateDisplay date={bal.updatedAt} format="relative" size="sm" /> : '—'}
                          </td>
                          <td className="balance-actions">
                            <button
                              type="button"
                              className="balance-edit"
                              onClick={() => openOpeningModal(bal)}
                            >
                              {hasOpening ? 'Edit' : 'Set opening'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="attio-table-container stock-ledger-container">
            <div className="attio-header">
              <div className="attio-header-left">
                <span className="saas-view-label">Recent movements</span>
              </div>
              <div className="attio-header-right">
                <button type="button" className="attio-secondary-btn" onClick={loadData} disabled={loading}>
                  <Icon name="refresh" size={14} className={loading ? 'spin' : ''} />
                  <span>{loading ? 'Refreshing…' : 'Refresh'}</span>
                </button>
              </div>
            </div>
            <div className="attio-table-wrapper">
              <table className={`attio-table${loading ? ' attio-skeleton-table' : ''}`}>
                <thead>
                  <tr>
                    {table.getHeaderGroups()[0]?.headers.map((header) => (
                      <th
                        key={header.id}
                        className="attio-th"
                        style={{ width: header.getSize() }}
                        onClick={!loading && header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                      >
                        <div className="attio-th-content">
                          <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                          {header.column.getIsSorted() && !loading && (
                            <svg className="attio-sort-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              {header.column.getIsSorted() === 'asc'
                                ? <path d="m18 15-6-6-6 6" />
                                : <path d="m6 9 6 6 6-6" />}
                            </svg>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <SkeletonRows cols={colCount} />
                  ) : table.getRowModel().rows.length === 0 ? (
                    <tr>
                      <td colSpan={colCount} className="attio-empty">
                        <Icon name="list" size={36} color="var(--text-tertiary)" />
                        <span>No ledger entries yet.</span>
                      </td>
                    </tr>
                  ) : (
                    table.getRowModel().rows.map((row) => (
                      <tr key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="attio-td">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="stock-summary-container">
          <div className="report-filter-bar">
            <div className="report-filter-presets" role="group" aria-label="Period">
              {SUMMARY_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`report-preset-btn${summaryPreset === p.id ? ' active' : ''}`}
                  onClick={() => applySummaryPreset(p.id)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="report-filter-right">
              <span className="period-chip">
                {formatDateReadable(startDate)} → {formatDateReadable(endDate)}
              </span>
              <button
                type="button"
                className="attio-secondary-btn compact-btn"
                onClick={() => window.print()}
                disabled={summaryLoading || summaryData.length === 0}
              >
                <Icon name="printer" size={14} /><span>Print</span>
              </button>
            </div>
          </div>

          <div className="print-report-container">
            <div className="print-report-header">
              <h2>Stock Group Summary</h2>
              <p className="print-only-range">{formatDateReadable(startDate)} to {formatDateReadable(endDate)}</p>
            </div>

            <div className="summary-table-shell">
              <table className="attio-table stock-summary-table">
                <thead>
                  <tr className="summary-head-groups">
                    <th rowSpan="2" className="attio-th sticky-col">Particulars</th>
                    <th colSpan="3" className="attio-th group-head">Opening</th>
                    <th colSpan="3" className="attio-th group-head">Inwards</th>
                    <th colSpan="3" className="attio-th group-head">Outwards</th>
                    <th colSpan="3" className="attio-th group-head last">Closing</th>
                  </tr>
                  <tr className="summary-head-sub">
                    {Array.from({ length: 4 }).map((_, gi) => (
                      <React.Fragment key={gi}>
                        <th className="attio-th num">Qty (g)</th>
                        <th className="attio-th num">Rate</th>
                        <th className={`attio-th num${gi < 3 ? ' group-end' : ''}`}>Value</th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {summaryLoading ? (
                    <SkeletonRows rows={6} cols={13} />
                  ) : summaryData.length === 0 ? (
                    <tr>
                      <td colSpan="13" className="attio-empty">
                        <Icon name="list" size={36} color="var(--text-tertiary)" />
                        <span>No movements in this period.</span>
                      </td>
                    </tr>
                  ) : (
                    renderSummaryRows()
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div
          className="stock-modal-backdrop"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
          role="presentation"
        >
          <div className="stock-modal-content" role="dialog" aria-modal="true" aria-labelledby="stock-ob-title">
            <div className="stock-modal-header">
              <div>
                <h3 id="stock-ob-title">{editingOpeningKey ? 'Edit opening stock' : 'Opening stock'}</h3>
                <p className="stock-modal-sub">
                  {editingOpeningKey
                    ? 'Update the starting balance for this metal purity.'
                    : 'Sets the starting balance for a metal purity.'}
                </p>
              </div>
              <button type="button" className="stock-modal-close" onClick={closeModal} aria-label="Close">
                <Icon name="close" size={18} />
              </button>
            </div>
            <form onSubmit={handleModalSubmit} className="stock-modal-form">
              <div className="form-row ob-meta-row">
                <div className="form-group">
                  <label htmlFor="ob-metal">Metal</label>
                  <select id="ob-metal" name="metalType" className="saas-select" value={modalData.metalType} onChange={handleModalChange} required disabled={Boolean(editingOpeningKey)}>
                    <option value="GOLD">Gold</option>
                    <option value="SILVER">Silver</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="ob-purity">Purity</label>
                  <select
                    id="ob-purity"
                    name="purity"
                    className="saas-select"
                    value={modalData.purity}
                    onChange={handleModalChange}
                    required
                    disabled={Boolean(editingOpeningKey)}
                  >
                    {modalPurityOptions.map((label) => (
                      <option key={label} value={label}>
                        {label === 'F' ? 'Fine (F)' : label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group ob-date-group">
                  <label htmlFor="ob-date">Date</label>
                  <input id="ob-date" type="date" name="date" className="saas-input" value={modalData.date} onChange={handleModalChange} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="ob-qty">Weight (g)</label>
                  <input id="ob-qty" type="number" step="0.001" name="quantity" className="saas-input" value={modalData.quantity} onChange={handleModalChange} placeholder="0.000" required />
                </div>
                <div className="form-group">
                  <label htmlFor="ob-rate">Rate (₹/g)</label>
                  <input id="ob-rate" type="number" step="0.01" name="rate" className="saas-input" value={modalData.rate} onChange={handleModalChange} placeholder="0.00" required />
                </div>
              </div>
              <div className="ob-value-preview">
                <span>Calculated value</span>
                <strong>
                  ₹{modalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
              </div>
              <div className="stock-modal-actions">
                <button type="button" className="attio-secondary-btn" onClick={closeModal} disabled={modalLoading}>Cancel</button>
                <button type="submit" className="attio-primary-btn" disabled={modalLoading}>
                  {modalLoading ? 'Saving…' : (editingOpeningKey ? 'Save changes' : 'Save opening')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardTemplate>
  );
};

export default StockPage;
