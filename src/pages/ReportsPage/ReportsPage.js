import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import DashboardTemplate from '../../components/templates/DashboardTemplate/DashboardTemplate';
import Tab from '../../components/molecules/Tab/Tab';
import DateDisplay from '../../components/atoms/DateDisplay/DateDisplay';
import {
  getSalesReport,
  getCollectionsReport,
  getOutstandingReport,
} from '../../services/reportsService';
import {
  getGstHsnAnalytics,
  getInventoryMovement,
  getLabourAnalytics,
  getMetalAnalytics,
  getSalesTrend,
  getTopCustomers,
  getTopItems,
} from '../../services/analyticsService';
import './ReportsPage.css';

const INR = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const GM = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' gm';

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
};

const fmtLabel = (key) => key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();

const TABS = [
  { id: 'daily-sales', label: 'Daily Sales', fetch: (f) => getSalesTrend({ ...f, granularity: 'day' }), view: 'salesTrend' },
  { id: 'monthly-sales', label: 'Monthly Sales', fetch: (f) => getSalesTrend({ ...f, granularity: 'month' }), view: 'salesTrend' },
  { id: 'invoice-register', label: 'Invoice Register', fetch: getGstHsnAnalytics, view: 'invoiceRegister' },
  { id: 'gst', label: 'GST Summary', fetch: getGstHsnAnalytics, view: 'gst' },
  { id: 'hsn', label: 'HSN Summary', fetch: getGstHsnAnalytics, view: 'hsn' },
  { id: 'collections', label: 'Cash/Bank', fetch: getCollectionsReport, view: 'collections' },
  { id: 'customer', label: 'Customer', fetch: getTopCustomers, view: 'customer' },
  { id: 'item', label: 'Item', fetch: getTopItems, view: 'item' },
  { id: 'metal', label: 'Metal', fetch: getMetalAnalytics, view: 'metal' },
  { id: 'labour', label: 'Labour', fetch: getLabourAnalytics, view: 'labour' },
  { id: 'outstanding', label: 'Outstanding', fetch: getOutstandingReport, view: 'outstanding', hasFilters: false },
  { id: 'sales', label: 'Sales Summary', fetch: getSalesReport, view: 'summaryOnly' },
  { id: 'inventory', label: 'Inventory Movement', fetch: getInventoryMovement, view: 'inventory' },
];

const SummaryCards = ({ summary }) => {
  if (!summary || !Object.keys(summary).length) return null;
  return (
    <div className="report-summary">
      {Object.entries(summary).map(([key, value]) => (
        <div key={key} className="report-summary-card">
          <span className="report-summary-label">{fmtLabel(key)}</span>
          <span className={typeof value === 'number' ? 'report-summary-amount' : 'report-summary-count'}>{String(value)}</span>
        </div>
      ))}
    </div>
  );
};

const DetailTable = ({ rows }) => {
  if (!rows?.length) return <p className="report-empty">No records found.</p>;
  const keys = Object.keys(rows[0]);
  return (
    <div className="report-table-scroll">
      <table className="report-table">
        <thead>
          <tr>{keys.map((key) => <th key={key}>{fmtLabel(key)}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {keys.map((key) => {
                const value = row[key];
                if (value === null || value === undefined || value === '') return <td key={key}>-</td>;
                if (value instanceof Date || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value))) {
                  return <td key={key}><DateDisplay date={value} format="absolute" size="sm" /></td>;
                }
                return <td key={key}>{String(value)}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const normalizeReport = (tab, data) => {
  switch (tab.view) {
    case 'salesTrend': {
      const rows = (data?.trend || []).map((row) => ({
        date: row.date,
        sales: INR(row.sales),
        invoices: row.count,
        paid: INR(row.paid),
        averageBill: INR(row.avgBillValue),
        cumulative: INR(row.cumulative),
      }));
      const raw = data?.trend || [];
      const total = raw.reduce((sum, row) => sum + Number(row.sales || 0), 0);
      const count = raw.reduce((sum, row) => sum + Number(row.count || 0), 0);
      return { summary: { totalSales: INR(total), invoiceCount: count, averageBill: INR(count ? total / count : 0) }, rows };
    }
    case 'invoiceRegister':
      return { summary: data?.summary, rows: data?.invoiceRegister || [] };
    case 'gst':
      return { summary: data?.summary, rows: data?.invoiceRegister || [] };
    case 'hsn':
      return { summary: { rows: data?.hsnBreakdown?.length || 0 }, rows: data?.hsnBreakdown || [] };
    case 'collections': {
      const rows = (data?.recentPayments || []).map((payment) => ({
        date: payment.createdAt,
        invoice: payment.invoice?.invoiceNumber || '-',
        mode: payment.mode,
        reference: payment.reference || '-',
        amount: INR(payment.amount),
      }));
      const summary = {
        totalCollected: INR(data?.totalCollected),
        ...Object.fromEntries(Object.entries(data?.groupedByMode || {}).map(([mode, amount]) => [mode, INR(amount)])),
      };
      return { summary, rows };
    }
    case 'customer':
      return {
        summary: { customers: data?.length || 0 },
        rows: (data || []).map((row) => ({
          customer: row.name,
          phone: row.phone,
          location: row.location,
          invoices: row.invoiceCount,
          purchase: INR(row.totalPurchase),
          paid: INR(row.totalPaid),
          outstanding: INR(row.outstanding),
        })),
      };
    case 'item':
      return {
        summary: { items: data?.length || 0 },
        rows: (data || []).map((row) => ({
          item: row.description,
          metal: row.metalType,
          quantity: row.totalQty,
          weight: GM(row.totalWeight),
          value: INR(row.totalValue),
          labour: INR(row.totalMaking),
        })),
      };
    case 'metal':
      return {
        summary: { metals: data?.byMetal?.length || 0 },
        rows: (data?.byMetal || []).map((row) => ({
          metal: row.metalType,
          itemCount: row.count,
          value: INR(row.totalValue),
          netWeight: GM(row.totalNetWeight),
          grossWeight: GM(row.totalGrossWeight),
          makingCharges: INR(row.totalMakingCharges),
        })),
      };
    case 'labour':
      return {
        summary: {
          totalLabour: INR(data?.summary?.totalLabour),
          labourPercentage: `${data?.summary?.labourPercentage || 0}%`,
          avgLabourPerGram: INR(data?.summary?.avgLabourPerGram),
        },
        rows: data?.byItem || [],
      };
    case 'outstanding': {
      const rows = Array.isArray(data) ? data : (data?.data || []);
      return {
        summary: { customers: rows.length, totalOutstanding: INR(rows.reduce((sum, row) => sum + Number(row.outstandingAmount || 0), 0)) },
        rows: rows.map((row) => ({ customer: row.customerName, phone: row.phone, outstanding: INR(row.outstandingAmount) })),
      };
    }
    case 'summaryOnly':
      return { summary: data || {}, rows: [] };
    case 'inventory':
      return {
        summary: { items: data?.byItem?.length || 0 },
        rows: (data?.byItem || []).map((row) => ({
          item: row.description,
          metal: row.metalType,
          quantity: row.quantity,
          netWeight: GM(row.netWeight),
          value: INR(row.value),
        })),
      };
    default:
      return { summary: {}, rows: [] };
  }
};

const FilterBar = ({ filters, onChange }) => (
  <div className="report-filter-bar">
    <div className="report-filter-presets">
      <button className="report-preset-btn" onClick={() => onChange({ dateFrom: monthStart(), dateTo: today() })}>This Month</button>
      <button className="report-preset-btn" onClick={() => {
        const d = new Date();
        d.setDate(d.getDate() - 6);
        onChange({ dateFrom: d.toISOString().slice(0, 10), dateTo: today() });
      }}>Last 7 Days</button>
      <button className="report-preset-btn" onClick={() => onChange({ dateFrom: '', dateTo: '' })}>All Time</button>
    </div>
    <div className="report-filter-dates">
      <input type="date" className="report-date-input" value={filters.dateFrom || ''} onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })} />
      <span className="report-date-sep">to</span>
      <input type="date" className="report-date-input" value={filters.dateTo || ''} onChange={(e) => onChange({ ...filters, dateTo: e.target.value })} />
    </div>
  </div>
);

const ReportsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'daily-sales';
  const [cache, setCache] = useState({});
  const [filters, setFilters] = useState({ dateFrom: monthStart(), dateTo: today() });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const tab = useMemo(() => TABS.find((entry) => entry.id === activeTab) || TABS[0], [activeTab]);
  const params = useMemo(
    () => tab.hasFilters === false ? {} : Object.fromEntries(Object.entries(filters).filter(([, value]) => value)),
    [filters, tab.hasFilters],
  );
  const cacheKey = `${tab.id}:${JSON.stringify(params)}`;

  const loadReport = useCallback(async () => {
    if (cache[cacheKey]) return;
    try {
      setLoading(true);
      setError(null);
      const result = await tab.fetch(params);
      setCache((prev) => ({ ...prev, [cacheKey]: result }));
    } catch (err) {
      setError(err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [cache, cacheKey, params, tab]);

  useEffect(() => { loadReport(); }, [loadReport]);

  const view = normalizeReport(tab, cache[cacheKey]);

  const exportXlsx = () => {
    const rows = view.rows?.length ? view.rows : [view.summary || {}];
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, tab.label.slice(0, 31));
    XLSX.writeFile(workbook, `${tab.id}-report.xlsx`);
  };

  return (
    <DashboardTemplate headerTitle="Reports" headerTabs={[]}>
      <div className="reports-page">
        <div className="reports-tabs">
          {TABS.map((entry) => (
            <Tab key={entry.id} label={entry.label} active={tab.id === entry.id} onClick={() => setSearchParams({ tab: entry.id })} />
          ))}
        </div>

        {tab.hasFilters !== false && <FilterBar filters={filters} onChange={setFilters} />}

        <div className="report-actions">
          <button onClick={exportXlsx}>Export Excel</button>
          <button onClick={() => window.print()}>Print / PDF</button>
        </div>

        <div className="reports-content">
          {loading && <p className="report-loading">Loading...</p>}
          {error && <p className="report-error">{error}</p>}
          {!loading && !error && (
            <>
              <SummaryCards summary={view.summary} />
              <DetailTable rows={view.rows} />
            </>
          )}
        </div>
      </div>
    </DashboardTemplate>
  );
};

export default ReportsPage;
