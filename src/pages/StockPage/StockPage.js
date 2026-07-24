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
import DateDisplay from '../../components/atoms/DateDisplay/DateDisplay';
import Toast from '../../components/atoms/Toast/Toast';
import { getStockBalances, getStockLedger, initializeOpeningBalance, getStockGroupSummary } from '../../services/stockService';
import './StockPage.css';

const columnHelper = createColumnHelper();
const formatType = (type) => {
  switch (type) {
    case 'OPENING_BALANCE': return 'Opening Balance';
    case 'PURCHASE': return 'Purchase';
    case 'SALE': return 'Sale';
    case 'ADJUSTMENT': return 'Adjustment';
    default: return type;
  }
};

const SkeletonRows = ({ rows = 5, cols = 8 }) => (
  <>{Array.from({ length: rows }).map((_, ri) => (
    <tr key={ri}>{Array.from({ length: cols }).map((__, ci) => (
      <td key={ci} className="attio-td"><div className="skeleton-cell"><div className="skeleton-bar" style={{ width: ['40%','60%','80%'][(ri+ci)%3] }} /></div></td>
    ))}</tr>
  ))}</>
);

const fmtAmt = (n) => n == null || parseFloat(n) === 0 ? '—' : "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtWeight = (n) => `${Number(n || 0).toFixed(3)} g`;
const getPurityRank = (purity) => ({ '24K': 1, '22K': 2, '20K': 3, '18K': 4, F: 1, 925: 2 }[purity] || 99);

const buildColumns = () => [
  columnHelper.accessor('date', { id: 'date', header: 'Date', size: 160,
    cell: info => info.getValue() ? <DateDisplay date={info.getValue()} format="absolute" size="sm" /> : '—',
  }),
  columnHelper.accessor('transactionType', { id: 'transactionType', header: 'Type', size: 140,
    cell: info => <span className={`stock-badge type-${info.getValue()?.toLowerCase()}`}>{formatType(info.getValue())}</span>,
  }),
  columnHelper.accessor('metalType', { id: 'metalType', header: 'Metal', size: 100 }),
  columnHelper.accessor('purity', { id: 'purity', header: 'Purity', size: 100 }),
  columnHelper.accessor('quantityIn', { id: 'quantityIn', header: 'Inward (g)', size: 120,
    cell: info => { const v = parseFloat(info.getValue() || 0); return v > 0 ? <span style={{ color: 'var(--success)' }}>+{v.toFixed(3)}</span> : '—'; },
  }),
  columnHelper.accessor('quantityOut', { id: 'quantityOut', header: 'Outward (g)', size: 120,
    cell: info => { const v = parseFloat(info.getValue() || 0); return v > 0 ? <span style={{ color: 'var(--error)' }}>-{v.toFixed(3)}</span> : '—'; },
  }),
  columnHelper.accessor('rate', { id: 'rate', header: 'Rate', size: 110,
    cell: info => fmtAmt(info.getValue()),
  }),
  columnHelper.accessor('totalValue', { id: 'totalValue', header: 'Value', size: 120,
    cell: info => fmtAmt(info.getValue()),
  }),
  columnHelper.accessor('runningBalance', { id: 'runningBalance', header: 'Balance (g)', size: 120,
    cell: info => { const v = parseFloat(info.getValue() || 0); return <strong>{v.toFixed(3)}</strong>; },
  }),
  columnHelper.accessor('referenceId', {
    id: 'referenceId',
    header: 'Reference',
    size: 140,
    cell: info => info.getValue() ? <span className="reference-pill">{String(info.getValue()).slice(0, 8)}</span> : '—',
  }),
  columnHelper.accessor('notes', { id: 'notes', header: 'Notes', size: 200, cell: info => info.getValue() || '—' }),
];

const StockPage = () => {
  const [balances, setBalances] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sorting, setSorting] = useState([]);
  const [toast, setToast] = useState(null);
  
  // Tab Navigation State
  const [activeTab, setActiveTab] = useState('live');

  // Stock Summary Report Filter State
  const [startDate, setStartDate] = useState('2026-04-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [summaryData, setSummaryData] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalData, setModalData] = useState({
    metalType: 'GOLD',
    purity: '22K',
    quantity: '',
    rate: '',
    date: '2026-04-01',
  });

  const loadData = useCallback(async () => {
    try { 
      setLoading(true); 
      setError(null); 
      const [balRes, ledRes] = await Promise.all([
        getStockBalances(),
        getStockLedger()
      ]);
      setBalances(balRes || []); 
      setLedger(ledRes || []); 
    }
    catch (err) { setError(err.message || 'Failed to load stock data'); }
    finally { setLoading(false); }
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

  useEffect(() => { 
    loadData(); 
  }, [loadData]);

  useEffect(() => {
    if (activeTab === 'summary') {
      generateSummary();
    }
  }, [activeTab, generateSummary]);

  const handleModalChange = (e) => {
    const { name, value } = e.target;
    setModalData(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'metalType') {
        updated.purity = value === 'GOLD' ? '22K' : 'F';
      }
      return updated;
    });
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!modalData.quantity || parseFloat(modalData.quantity) <= 0) {
      setToast({ type: 'error', message: 'Please enter a valid weight quantity' });
      return;
    }
    if (!modalData.rate || parseFloat(modalData.rate) <= 0) {
      setToast({ type: 'error', message: 'Please enter a valid rate' });
      return;
    }
    if (!modalData.date) {
      setToast({ type: 'error', message: 'Please select a date' });
      return;
    }

    try {
      setModalLoading(true);
      await initializeOpeningBalance({
        metalType: modalData.metalType,
        purity: modalData.purity,
        quantity: parseFloat(modalData.quantity),
        rate: parseFloat(modalData.rate),
        date: new Date(modalData.date).toISOString()
      });
      setToast({ type: 'success', message: 'Opening balance saved successfully' });
      setIsModalOpen(false);
      setModalData({ metalType: 'GOLD', purity: '22K', quantity: '', rate: '', date: '2026-04-01' });
      loadData();
      if (activeTab === 'summary') generateSummary();
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to initialize opening balance' });
    } finally {
      setModalLoading(false);
    }
  };

  const applyPreset = (preset) => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    if (preset === 'this_month') {
      const start = `${yyyy}-${mm}-01`;
      setStartDate(start);
      setEndDate(todayStr);
    } else if (preset === 'last_month') {
      let lastMonthVal = today.getMonth() - 1;
      let lastMonthYear = yyyy;
      if (lastMonthVal < 0) {
        lastMonthVal = 11;
        lastMonthYear -= 1;
      }
      const lastMm = String(lastMonthVal + 1).padStart(2, '0');
      const start = `${lastMonthYear}-${lastMm}-01`;
      const lastDay = new Date(lastMonthYear, lastMonthVal + 1, 0).getDate();
      const end = `${lastMonthYear}-${lastMm}-${String(lastDay).padStart(2, '0')}`;
      setStartDate(start);
      setEndDate(end);
    } else if (preset === 'this_fy') {
      const fyStartYear = today.getMonth() >= 3 ? yyyy : yyyy - 1;
      const start = `${fyStartYear}-04-01`;
      const end = `${fyStartYear + 1}-03-31`;
      setStartDate(start);
      setEndDate(end);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Group summary mapping & calculations
  const groupedSummary = useMemo(() => {
    const groups = { GOLD: [], SILVER: [] };
    summaryData.forEach(item => {
      if (groups[item.metalType]) {
        groups[item.metalType].push(item);
      }
    });
    const purityOrder = { '24K': 1, '22K': 2, '20K': 3, '18K': 4, 'F': 1, '925': 2 };
    const sortFn = (a, b) => (purityOrder[a.purity] || 99) - (purityOrder[b.purity] || 99);
    groups.GOLD.sort(sortFn);
    groups.SILVER.sort(sortFn);
    return groups;
  }, [summaryData]);

  const calculatedTotals = useMemo(() => {
    const totals = {
      GOLD: { opQty: 0, opVal: 0, inQty: 0, inVal: 0, outQty: 0, outVal: 0, clQty: 0, clVal: 0 },
      SILVER: { opQty: 0, opVal: 0, inQty: 0, inVal: 0, outQty: 0, outVal: 0, clQty: 0, clVal: 0 },
      GRAND: { opQty: 0, opVal: 0, inQty: 0, inVal: 0, outQty: 0, outVal: 0, clQty: 0, clVal: 0 }
    };

    summaryData.forEach(item => {
      const g = item.metalType;
      if (totals[g]) {
        totals[g].opQty += item.opening.quantity;
        totals[g].opVal += item.opening.value;
        totals[g].inQty += item.inwards.quantity;
        totals[g].inVal += item.inwards.value;
        totals[g].outQty += item.outwards.quantity;
        totals[g].outVal += item.outwards.value;
        totals[g].clQty += item.closing.quantity;
        totals[g].clVal += item.closing.value;
      }
      totals.GRAND.opQty += item.opening.quantity;
      totals.GRAND.opVal += item.opening.value;
      totals.GRAND.inQty += item.inwards.quantity;
      totals.GRAND.inVal += item.inwards.value;
      totals.GRAND.outQty += item.outwards.quantity;
      totals.GRAND.outVal += item.outwards.value;
      totals.GRAND.clQty += item.closing.quantity;
      totals.GRAND.clVal += item.closing.value;
    });

    return totals;
  }, [summaryData]);

  const renderSummaryRows = () => {
    const rows = [];
    const fmtRate = (qty, val) => (Number(qty) !== 0 && Number(val) !== 0) ? Math.abs(Number(val) / Number(qty)).toFixed(2) : '—';
    const fmtVal = (val) => {
      const v = Number(val) || 0;
      return v !== 0 ? (v < 0 ? '-' : '') + "₹" + Math.abs(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
    };
    const fmtQty = (qty) => {
      const q = Number(qty) || 0;
      return q !== 0 ? q.toFixed(3) : '—';
    };
    const fmtItemRate = (rate, qty) => (Number(qty) !== 0 && Number(rate) !== 0) ? Math.abs(Number(rate)).toFixed(2) : '—';

    // Group GOLD
    if (groupedSummary.GOLD.length > 0) {
      const gTot = calculatedTotals.GOLD;
      rows.push(
        <tr key="gold-header" style={{ fontWeight: 'bold', backgroundColor: 'var(--bg-hover)' }}>
          <td className="attio-td">GOLD</td>
          <td className="attio-td" style={{ textAlign: 'right' }}>{fmtQty(gTot.opQty)}</td>
          <td className="attio-td" style={{ textAlign: 'right' }}>{fmtRate(gTot.opQty, gTot.opVal)}</td>
          <td className="attio-td" style={{ textAlign: 'right' }}>{fmtVal(gTot.opVal)}</td>
          <td className="attio-td" style={{ textAlign: 'right' }}>{fmtQty(gTot.inQty)}</td>
          <td className="attio-td" style={{ textAlign: 'right' }}>{fmtRate(gTot.inQty, gTot.inVal)}</td>
          <td className="attio-td" style={{ textAlign: 'right' }}>{fmtVal(gTot.inVal)}</td>
          <td className="attio-td" style={{ textAlign: 'right' }}>{fmtQty(gTot.outQty)}</td>
          <td className="attio-td" style={{ textAlign: 'right' }}>{fmtRate(gTot.outQty, gTot.outVal)}</td>
          <td className="attio-td" style={{ textAlign: 'right' }}>{fmtVal(gTot.outVal)}</td>
          <td className="attio-td" style={{ textAlign: 'right' }}>{fmtQty(gTot.clQty)}</td>
          <td className="attio-td" style={{ textAlign: 'right' }}>{fmtRate(gTot.clQty, gTot.clVal)}</td>
          <td className="attio-td" style={{ textAlign: 'right' }}>{fmtVal(gTot.clVal)}</td>
        </tr>
      );

      groupedSummary.GOLD.forEach(item => {
        rows.push(
          <tr key={`gold-${item.purity}`}>
            <td className="attio-td" style={{ paddingLeft: '2rem', fontStyle: 'italic' }}>{item.purity}</td>
            <td className="attio-td" style={{ textAlign: 'right' }}>{fmtQty(item.opening.quantity)}</td>
            <td className="attio-td" style={{ textAlign: 'right' }}>{fmtItemRate(item.opening.rate, item.opening.quantity)}</td>
            <td className="attio-td" style={{ textAlign: 'right' }}>{fmtVal(item.opening.value)}</td>
            <td className="attio-td" style={{ textAlign: 'right' }}>{fmtQty(item.inwards.quantity)}</td>
            <td className="attio-td" style={{ textAlign: 'right' }}>{fmtItemRate(item.inwards.rate, item.inwards.quantity)}</td>
            <td className="attio-td" style={{ textAlign: 'right' }}>{fmtVal(item.inwards.value)}</td>
            <td className="attio-td" style={{ textAlign: 'right' }}>{fmtQty(item.outwards.quantity)}</td>
            <td className="attio-td" style={{ textAlign: 'right' }}>{fmtItemRate(item.outwards.rate, item.outwards.quantity)}</td>
            <td className="attio-td" style={{ textAlign: 'right' }}>{fmtVal(item.outwards.value)}</td>
            <td className="attio-td" style={{ textAlign: 'right' }}>{fmtQty(item.closing.quantity)}</td>
            <td className="attio-td" style={{ textAlign: 'right' }}>{fmtItemRate(item.closing.rate, item.closing.quantity)}</td>
            <td className="attio-td" style={{ textAlign: 'right' }}>{fmtVal(item.closing.value)}</td>
          </tr>
        );
      });
    }

    // Group SILVER
    if (groupedSummary.SILVER.length > 0) {
      const sTot = calculatedTotals.SILVER;
      rows.push(
        <tr key="silver-header" style={{ fontWeight: 'bold', backgroundColor: 'var(--bg-hover)' }}>
          <td className="attio-td">SILVER</td>
          <td className="attio-td" style={{ textAlign: 'right' }}>{fmtQty(sTot.opQty)}</td>
          <td className="attio-td" style={{ textAlign: 'right' }}>{fmtRate(sTot.opQty, sTot.opVal)}</td>
          <td className="attio-td" style={{ textAlign: 'right' }}>{fmtVal(sTot.opVal)}</td>
          <td className="attio-td" style={{ textAlign: 'right' }}>{fmtQty(sTot.inQty)}</td>
          <td className="attio-td" style={{ textAlign: 'right' }}>{fmtRate(sTot.inQty, sTot.inVal)}</td>
          <td className="attio-td" style={{ textAlign: 'right' }}>{fmtVal(sTot.inVal)}</td>
          <td className="attio-td" style={{ textAlign: 'right' }}>{fmtQty(sTot.outQty)}</td>
          <td className="attio-td" style={{ textAlign: 'right' }}>{fmtRate(sTot.outQty, sTot.outVal)}</td>
          <td className="attio-td" style={{ textAlign: 'right' }}>{fmtVal(sTot.outVal)}</td>
          <td className="attio-td" style={{ textAlign: 'right' }}>{fmtQty(sTot.clQty)}</td>
          <td className="attio-td" style={{ textAlign: 'right' }}>{fmtRate(sTot.clQty, sTot.clVal)}</td>
          <td className="attio-td" style={{ textAlign: 'right' }}>{fmtVal(sTot.clVal)}</td>
        </tr>
      );

      groupedSummary.SILVER.forEach(item => {
        rows.push(
          <tr key={`silver-${item.purity}`}>
            <td className="attio-td" style={{ paddingLeft: '2rem', fontStyle: 'italic' }}>{item.purity}</td>
            <td className="attio-td" style={{ textAlign: 'right' }}>{fmtQty(item.opening.quantity)}</td>
            <td className="attio-td" style={{ textAlign: 'right' }}>{fmtItemRate(item.opening.rate, item.opening.quantity)}</td>
            <td className="attio-td" style={{ textAlign: 'right' }}>{fmtVal(item.opening.value)}</td>
            <td className="attio-td" style={{ textAlign: 'right' }}>{fmtQty(item.inwards.quantity)}</td>
            <td className="attio-td" style={{ textAlign: 'right' }}>{fmtItemRate(item.inwards.rate, item.inwards.quantity)}</td>
            <td className="attio-td" style={{ textAlign: 'right' }}>{fmtVal(item.inwards.value)}</td>
            <td className="attio-td" style={{ textAlign: 'right' }}>{fmtQty(item.outwards.quantity)}</td>
            <td className="attio-td" style={{ textAlign: 'right' }}>{fmtItemRate(item.outwards.rate, item.outwards.quantity)}</td>
            <td className="attio-td" style={{ textAlign: 'right' }}>{fmtVal(item.outwards.value)}</td>
            <td className="attio-td" style={{ textAlign: 'right' }}>{fmtQty(item.closing.quantity)}</td>
            <td className="attio-td" style={{ textAlign: 'right' }}>{fmtItemRate(item.closing.rate, item.closing.quantity)}</td>
            <td className="attio-td" style={{ textAlign: 'right' }}>{fmtVal(item.closing.value)}</td>
          </tr>
        );
      });
    }

    // Grand Total Row
    const grand = calculatedTotals.GRAND;
    rows.push(
      <tr key="grand-total" style={{ fontWeight: 'bold', borderTop: '2px solid var(--border-color)', borderBottom: '2px double var(--border-color)', backgroundColor: 'var(--bg-hover)' }}>
        <td className="attio-td">Grand Total</td>
        <td className="attio-td" style={{ textAlign: 'right' }}>{fmtQty(grand.opQty)}</td>
        <td className="attio-td" style={{ textAlign: 'right' }}>{fmtRate(grand.opQty, grand.opVal)}</td>
        <td className="attio-td" style={{ textAlign: 'right' }}>{fmtVal(grand.opVal)}</td>
        <td className="attio-td" style={{ textAlign: 'right' }}>{fmtQty(grand.inQty)}</td>
        <td className="attio-td" style={{ textAlign: 'right' }}>{fmtRate(grand.inQty, grand.inVal)}</td>
        <td className="attio-td" style={{ textAlign: 'right' }}>{fmtVal(grand.inVal)}</td>
        <td className="attio-td" style={{ textAlign: 'right' }}>{fmtQty(grand.outQty)}</td>
        <td className="attio-td" style={{ textAlign: 'right' }}>{fmtRate(grand.outQty, grand.outVal)}</td>
        <td className="attio-td" style={{ textAlign: 'right' }}>{fmtVal(grand.outVal)}</td>
        <td className="attio-td" style={{ textAlign: 'right' }}>{fmtQty(grand.clQty)}</td>
        <td className="attio-td" style={{ textAlign: 'right' }}>{fmtRate(grand.clQty, grand.clVal)}</td>
        <td className="attio-td" style={{ textAlign: 'right' }}>{fmtVal(grand.clVal)}</td>
      </tr>
    );

    return rows;
  };

  const columns = useMemo(() => buildColumns(), []);

  const table = useReactTable({
    data: ledger, columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(),
  });

  const colCount = columns.length;
  const stockMetrics = useMemo(() => {
    const totals = balances.reduce((acc, item) => {
      const qty = Number(item.quantity || 0);
      acc.totalWeight += qty;
      acc[item.metalType] = (acc[item.metalType] || 0) + qty;
      return acc;
    }, { totalWeight: 0, GOLD: 0, SILVER: 0 });

    return {
      totalWeight: totals.totalWeight,
      goldWeight: totals.GOLD,
      silverWeight: totals.SILVER,
      balanceGroups: balances.length,
      movementCount: ledger.length,
    };
  }, [balances, ledger.length]);
  const balanceRows = useMemo(() => {
    return [...balances].sort((a, b) => {
      if (a.metalType !== b.metalType) return a.metalType.localeCompare(b.metalType);
      return getPurityRank(a.purity) - getPurityRank(b.purity);
    });
  }, [balances]);

  // Format readable date interval for print header
  const formatDateReadable = (dStr) => {
    if (!dStr) return '';
    const d = new Date(dStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <DashboardTemplate headerTitle="Stock & Inventory" headerTabs={[]}>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
      
      {/* Custom Tabs Navigation */}
      <div className="stock-tabs">
        <button 
          type="button" 
          className={`tab-btn ${activeTab === 'live' ? 'active' : ''}`} 
          onClick={() => setActiveTab('live')}
        >
          <Icon name="product" size={14} />
          Live Balances & Ledger
        </button>
        <button 
          type="button" 
          className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`} 
          onClick={() => setActiveTab('summary')}
        >
          <Icon name="file" size={14} />
          Stock Group Summary
        </button>
      </div>

      {activeTab === 'live' ? (
        <>
          {/* Balances Section */}
          <div className="stock-balances-container">
            <div className="stock-balances-header">
              <div>
                <h2 className="stock-section-title">Inventory Snapshot</h2>
                <p className="stock-section-subtitle">Balances by metal and purity.</p>
              </div>
              <button className="attio-primary-btn" onClick={() => setIsModalOpen(true)}>
                <Icon name="add" size={14} /><span>Initialize Opening Stock</span>
              </button>
            </div>
            <div className="stock-summary-strip">
              <div className="stock-summary-item primary">
                <span>Total</span>
                <strong>{fmtWeight(stockMetrics.totalWeight)}</strong>
              </div>
              <div className="stock-summary-item">
                <span>Gold</span>
                <strong>{fmtWeight(stockMetrics.goldWeight)}</strong>
              </div>
              <div className={`stock-summary-item ${stockMetrics.silverWeight < 0 ? 'negative' : ''}`}>
                <span>Silver</span>
                <strong>{fmtWeight(stockMetrics.silverWeight)}</strong>
              </div>
              <div className="stock-summary-item">
                <span>Movements</span>
                <strong>{stockMetrics.movementCount}</strong>
              </div>
            </div>
            {error && <div className="attio-empty"><span>{error}</span><button className="attio-primary-btn" onClick={loadData}>Retry</button></div>}
            <div className="stock-balance-panel">
              {!loading && balances.length === 0 && !error && (
                <div className="stock-empty-card">
                  <Icon name="product" size={32} color="var(--text-tertiary)" />
                  <p>No stock balances found.</p>
                </div>
              )}
              {loading && Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="stock-balance-skeleton"></div>
              ))}
              {!loading && balanceRows.length > 0 && (
                <table className="stock-balance-table">
                  <thead>
                    <tr>
                      <th>Metal</th>
                      <th>Purity</th>
                      <th>Balance</th>
                      <th>Last Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balanceRows.map((bal) => {
                      const quantity = Number(bal.quantity || 0);
                      return (
                        <tr key={bal.id} className={quantity < 0 ? 'negative-row' : ''}>
                          <td><span className={`metal-badge ${bal.metalType.toLowerCase()}`}>{bal.metalType}</span></td>
                          <td><span className="purity-badge">{bal.purity}</span></td>
                          <td className={`balance-quantity ${quantity < 0 ? 'negative' : ''}`}>{fmtWeight(quantity)}</td>
                          <td className="balance-updated">{bal.updatedAt ? <DateDisplay date={bal.updatedAt} format="relative" size="sm" /> : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Ledger Table Section */}
          <div className="attio-table-container stock-ledger-container">
            <div className="attio-header">
              <div className="attio-header-left"><span className="saas-view-label">Recent Movements</span></div>
              <div className="attio-header-right">
                <button className="attio-secondary-btn" onClick={loadData}>
                  <Icon name="search" size={14} /><span>Refresh</span>
                </button>
              </div>
            </div>
            <div className="attio-table-wrapper">
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
                      <Icon name="list" size={36} color="var(--text-tertiary)" />
                      <span>No ledger entries found.</span>
                    </td></tr>
                  ) : table.getRowModel().rows.map(row => (
                    <tr key={row.id}>
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className="attio-td">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Stock Group Summary Report Tab */
        <div className="stock-summary-container">
          <div className="report-filter-bar glass-panel">
            <div className="form-group report-control">
              <label>Start Date</label>
              <input type="date" className="saas-input compact-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="form-group report-control">
              <label>End Date</label>
              <input type="date" className="saas-input compact-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="form-group report-control presets-control">
              <label>Quick Presets</label>
              <select className="saas-select compact-input" defaultValue="" onChange={(e) => applyPreset(e.target.value)}>
                <option value="" disabled>Select interval...</option>
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
                <option value="this_fy">This FY (Apr - Mar)</option>
              </select>
            </div>
            <div className="report-actions">
              <button className="attio-primary-btn compact-btn" onClick={generateSummary} disabled={summaryLoading}>
                <Icon name="file" size={14} /><span>{summaryLoading ? 'Generating...' : 'Generate Report'}</span>
              </button>
              <button className="attio-secondary-btn compact-btn" onClick={handlePrint} disabled={summaryLoading || summaryData.length === 0}>
                <Icon name="printer" size={14} /><span>Print Report</span>
              </button>
            </div>
          </div>

          <div className="print-report-container attio-table-container glass-panel">
            <div className="print-report-header">
              <h2>Stock Group Summary</h2>
              <p>
                {formatDateReadable(startDate)} to {formatDateReadable(endDate)}
              </p>
            </div>
            
            <div className="attio-table-wrapper" style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              <table className="attio-table" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-hover)' }}>
                    <th rowSpan="2" className="attio-th" style={{ verticalAlign: 'middle', fontWeight: '700', borderRight: '1px solid var(--border-color)' }}>Particulars</th>
                    <th colSpan="3" className="attio-th" style={{ textAlign: 'center', fontWeight: '700', borderBottom: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)', padding: '0.4rem' }}>Opening Balance</th>
                    <th colSpan="3" className="attio-th" style={{ textAlign: 'center', fontWeight: '700', borderBottom: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)', padding: '0.4rem' }}>Inwards</th>
                    <th colSpan="3" className="attio-th" style={{ textAlign: 'center', fontWeight: '700', borderBottom: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)', padding: '0.4rem' }}>Outwards</th>
                    <th colSpan="3" className="attio-th" style={{ textAlign: 'center', fontWeight: '700', borderBottom: '1px solid var(--border-color)', padding: '0.4rem' }}>Closing Balance</th>
                  </tr>
                  <tr style={{ backgroundColor: 'var(--bg-primary)' }}>
                    <th className="attio-th" style={{ textAlign: 'right', padding: '0.4rem', borderRight: '1px solid var(--border-light)' }}>Quantity (g)</th>
                    <th className="attio-th" style={{ textAlign: 'right', padding: '0.4rem', borderRight: '1px solid var(--border-light)' }}>Rate</th>
                    <th className="attio-th" style={{ textAlign: 'right', padding: '0.4rem', borderRight: '1px solid var(--border-color)' }}>Value</th>
                    <th className="attio-th" style={{ textAlign: 'right', padding: '0.4rem', borderRight: '1px solid var(--border-light)' }}>Quantity (g)</th>
                    <th className="attio-th" style={{ textAlign: 'right', padding: '0.4rem', borderRight: '1px solid var(--border-light)' }}>Rate</th>
                    <th className="attio-th" style={{ textAlign: 'right', padding: '0.4rem', borderRight: '1px solid var(--border-color)' }}>Value</th>
                    <th className="attio-th" style={{ textAlign: 'right', padding: '0.4rem', borderRight: '1px solid var(--border-light)' }}>Quantity (g)</th>
                    <th className="attio-th" style={{ textAlign: 'right', padding: '0.4rem', borderRight: '1px solid var(--border-light)' }}>Rate</th>
                    <th className="attio-th" style={{ textAlign: 'right', padding: '0.4rem', borderRight: '1px solid var(--border-color)' }}>Value</th>
                    <th className="attio-th" style={{ textAlign: 'right', padding: '0.4rem', borderRight: '1px solid var(--border-light)' }}>Quantity (g)</th>
                    <th className="attio-th" style={{ textAlign: 'right', padding: '0.4rem', borderRight: '1px solid var(--border-light)' }}>Rate</th>
                    <th className="attio-th" style={{ textAlign: 'right', padding: '0.4rem' }}>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryLoading ? (
                    <SkeletonRows rows={6} cols={13} />
                  ) : summaryData.length === 0 ? (
                    <tr>
                      <td colSpan="13" className="attio-empty" style={{ textAlign: 'center', padding: '3rem' }}>
                        <Icon name="list" size={36} color="var(--text-tertiary)" />
                        <span style={{ display: 'block', marginTop: '0.5rem' }}>No summary data matches the chosen date window.</span>
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

      {/* Opening Balance Modal */}
      {isModalOpen && (
        <div className="stock-modal-backdrop">
          <div className="stock-modal-content glass-panel animate-fade-in">
            <div className="stock-modal-header">
              <h3>Initialize Opening Stock</h3>
              <button className="stock-modal-close" onClick={() => setIsModalOpen(false)}>
                <Icon name="close" size={18} />
              </button>
            </div>
            <form onSubmit={handleModalSubmit} className="stock-modal-form">
              <div className="form-group">
                <label>Metal Type</label>
                <select name="metalType" className="saas-select" value={modalData.metalType} onChange={handleModalChange} required>
                  <option value="GOLD">Gold</option>
                  <option value="SILVER">Silver</option>
                </select>
              </div>
              <div className="form-group">
                <label>Purity</label>
                {modalData.metalType === 'GOLD' ? (
                  <select name="purity" className="saas-select" value={modalData.purity} onChange={handleModalChange} required>
                    <option value="24K">24K (99.9%)</option>
                    <option value="22K">22K (91.6%)</option>
                    <option value="20K">20K (83.3%)</option>
                    <option value="18K">18K (75.0%)</option>
                  </select>
                ) : (
                  <select name="purity" className="saas-select" value={modalData.purity} onChange={handleModalChange} required>
                    <option value="F">Fine (99.9% / 99.99%)</option>
                    <option value="925">Sterling (92.5%)</option>
                  </select>
                )}
              </div>
              <div className="form-group">
                <label>Date</label>
                <input type="date" name="date" className="saas-input" value={modalData.date} onChange={handleModalChange} required />
              </div>
              <div className="form-group">
                <label>Opening Weight Quantity (g)</label>
                <input type="number" step="0.001" name="quantity" className="saas-input" value={modalData.quantity} onChange={handleModalChange} placeholder="0.000" required />
              </div>
              <div className="form-group">
                <label>Rate (₹/g)</label>
                <input type="number" step="0.01" name="rate" className="saas-input" value={modalData.rate} onChange={handleModalChange} placeholder="0.00" required />
              </div>
              <div className="form-group">
                <label>Calculated Value (₹)</label>
                <input type="text" className="saas-input calculated-input" value={
                  modalData.quantity && modalData.rate 
                    ? "₹" + (parseFloat(modalData.quantity) * parseFloat(modalData.rate)).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : "₹0.00"
                } disabled />
              </div>
              <div className="stock-modal-actions">
                <button type="button" className="attio-secondary-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="attio-primary-btn" disabled={modalLoading}>
                  {modalLoading ? 'Saving...' : 'Initialize'}
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
