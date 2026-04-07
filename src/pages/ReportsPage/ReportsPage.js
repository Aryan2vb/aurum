import React, { useState, useEffect, useCallback } from 'react';
import DashboardTemplate from '../../components/templates/DashboardTemplate/DashboardTemplate';
import Tab from '../../components/molecules/Tab/Tab';
import DateDisplay from '../../components/atoms/DateDisplay/DateDisplay';
import {
  getSalesReport,
  getGstReport,
  getCollectionsReport,
  getOutstandingReport,
  getInventoryFlowReport,
} from '../../services/reportsService';
import './ReportsPage.css';

const TABS = [
  { id: 'sales',       label: 'Sales',          fetch: getSalesReport,        hasFilters: true },
  { id: 'gst',         label: 'GST',            fetch: getGstReport,          hasFilters: true },
  { id: 'collections', label: 'Collections',    fetch: getCollectionsReport,  hasFilters: true },
  { id: 'outstanding', label: 'Outstanding',    fetch: getOutstandingReport,  hasFilters: false },
  { id: 'inventory',   label: 'Inventory Flow', fetch: getInventoryFlowReport,hasFilters: true },
];

const fmtLabel = (key) => key.replace(/([A-Z])/g, ' $1').trim();

const fmtAmt = (v) => '₹' + (parseFloat(v) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ── Summary cards ── */
const AMOUNT_KEYS = new Set(['totalSales','totalTaxable','totalCollections','totalCgst','totalSgst','totalIgst','totalTax','totalCollected','outstandingAmount','amount','taxableAmount','totalAmount','cgstAmount','sgstAmount','igstAmount']);

const SummaryCards = ({ summary }) => (
  <div className="report-summary">
    {Object.entries(summary).map(([k, v]) => (
      <div key={k} className="report-summary-card">
        <span className="report-summary-label">{fmtLabel(k)}</span>
        {AMOUNT_KEYS.has(k)
          ? <span className="report-summary-amount">{fmtAmt(v)}</span>
          : <span className="report-summary-count">{String(v)}</span>
        }
      </div>
    ))}
  </div>
);

/* ── Generic detail table ── */
const DetailTable = ({ rows }) => {
  if (!rows?.length) return <p className="report-empty">No records found.</p>;
  const keys = Object.keys(rows[0]);
  return (
    <div className="report-table-scroll">
      <table className="report-table">
        <thead>
          <tr>{keys.map(k => <th key={k}>{fmtLabel(k)}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {keys.map(k => {
                const v = row[k];
                if (v === null || v === undefined) return <td key={k}>—</td>;
                if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v))
                  return <td key={k}><DateDisplay date={v} format="absolute" size="sm" /></td>;
                return <td key={k}>{String(v)}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/* ── Report renderers ── */
const SalesReport = ({ data }) => {
  if (!data) return null;
  return <SummaryCards summary={data} />;
};

const GstReport = ({ data }) => {
  if (!data) return null;
  return (
    <>
      {data.summary && <SummaryCards summary={data.summary} />}
      <DetailTable rows={data.details} />
    </>
  );
};

const CollectionsReport = ({ data }) => {
  if (!data) return null;
  return (
    <>
      <div className="report-summary">
        <div className="report-summary-card">
          <span className="report-summary-label">Total Collected</span>
          <span className="report-summary-amount">{fmtAmt(data.totalCollected)}</span>
        </div>
        {data.groupedByMode && Object.entries(data.groupedByMode).map(([mode, amt]) => (
          <div key={mode} className="report-summary-card">
            <span className="report-summary-label">{mode}</span>
            <span className="report-summary-amount">{fmtAmt(amt)}</span>
          </div>
        ))}
      </div>
      <DetailTable rows={data.recentPayments?.map(p => ({
        date: p.createdAt,
        invoice: p.invoice?.invoiceNumber || '—',
        mode: p.mode,
        reference: p.reference || '—',
        amount: p.amount,
      }))} />
    </>
  );
};

const OutstandingReport = ({ data }) => {
  if (!data) return null;
  const rows = Array.isArray(data) ? data : (data.data || []);
  if (!rows.length) return <p className="report-empty">No outstanding dues.</p>;
  const total = rows.reduce((s, r) => s + parseFloat(r.outstandingAmount || 0), 0);
  return (
    <>
      <div className="report-summary">
        <div className="report-summary-card">
          <span className="report-summary-label">Total Outstanding</span>
          <span className="report-summary-amount">{fmtAmt(total)}</span>
        </div>
        <div className="report-summary-card">
          <span className="report-summary-label">Customers</span>
          <span className="report-summary-count">{rows.length}</span>
        </div>
      </div>
      <div className="report-table-scroll">
        <table className="report-table">
          <thead>
            <tr><th>Customer</th><th>Phone</th><th className="report-th-right">Outstanding</th></tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.customerId}>
                <td>{r.customerName}</td>
                <td className="report-td-secondary">{r.phone || '—'}</td>
                <td className="report-th-right">{fmtAmt(r.outstandingAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

const InventoryReport = ({ data }) => {
  if (!data) return null;
  const metals = Object.entries(data);
  if (!metals.length) return <p className="report-empty">No inventory data.</p>;
  return (
    <div className="report-table-scroll">
      <table className="report-table">
        <thead>
          <tr>
            <th>Metal</th>
            <th className="report-th-right">Count</th>
            <th className="report-th-right">Gross Wt</th>
            <th className="report-th-right">Net Wt</th>
            <th>Purities</th>
          </tr>
        </thead>
        <tbody>
          {metals.map(([metal, info]) => (
            <tr key={metal}>
              <td><strong>{metal}</strong></td>
              <td className="report-th-right">{info.count}</td>
              <td className="report-th-right">{parseFloat(info.totalGrossWeight || 0).toFixed(2)}g</td>
              <td className="report-th-right">{parseFloat(info.totalNetWeight || 0).toFixed(2)}g</td>
              <td className="report-td-secondary">
                {info.purities ? Object.entries(info.purities).map(([p, c]) => `${p}: ${c}`).join(' · ') : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const RENDERERS = {
  sales:       SalesReport,
  gst:         GstReport,
  collections: CollectionsReport,
  outstanding: OutstandingReport,
  inventory:   InventoryReport,
};

/* ── Date filter bar ── */
const PRESETS = [
  { label: 'This Month', getValue: () => {
    const now = new Date();
    return { dateFrom: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10), dateTo: now.toISOString().slice(0,10) };
  }},
  { label: 'Last Month', getValue: () => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last  = new Date(now.getFullYear(), now.getMonth(), 0);
    return { dateFrom: first.toISOString().slice(0,10), dateTo: last.toISOString().slice(0,10) };
  }},
  { label: 'This Year', getValue: () => {
    const now = new Date();
    return { dateFrom: `${now.getFullYear()}-01-01`, dateTo: now.toISOString().slice(0,10) };
  }},
];

const FilterBar = ({ filters, onChange }) => (
  <div className="report-filter-bar">
    <div className="report-filter-presets">
      {PRESETS.map(p => (
        <button key={p.label} className="report-preset-btn" onClick={() => onChange(p.getValue())}>{p.label}</button>
      ))}
      <button className="report-preset-btn" onClick={() => onChange({ dateFrom: '', dateTo: '' })}>All Time</button>
    </div>
    <div className="report-filter-dates">
      <input type="date" className="report-date-input" value={filters.dateFrom || ''} onChange={e => onChange({ ...filters, dateFrom: e.target.value })} />
      <span className="report-date-sep">→</span>
      <input type="date" className="report-date-input" value={filters.dateTo || ''} onChange={e => onChange({ ...filters, dateTo: e.target.value })} />
    </div>
  </div>
);

/* ── Page ── */
const ReportsPage = () => {
  const [activeTab, setActiveTab] = useState('sales');
  const [cache, setCache] = useState({});
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadReport = useCallback(async (tabId, f) => {
    const tab = TABS.find(t => t.id === tabId);
    const params = tab.hasFilters ? Object.fromEntries(Object.entries(f).filter(([,v]) => v)) : {};
    const cacheKey = `${tabId}:${JSON.stringify(params)}`;
    if (cache[cacheKey]) return;
    try {
      setLoading(true);
      setError(null);
      const result = await tab.fetch(params);
      setCache(prev => ({ ...prev, [cacheKey]: result }));
    } catch (e) {
      setError(e.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [cache]);

  useEffect(() => { loadReport(activeTab, filters); }, [activeTab, filters]); // eslint-disable-line

  const tab = TABS.find(t => t.id === activeTab);
  const params = tab.hasFilters ? Object.fromEntries(Object.entries(filters).filter(([,v]) => v)) : {};
  const cacheKey = `${activeTab}:${JSON.stringify(params)}`;
  const Renderer = RENDERERS[activeTab];

  return (
    <DashboardTemplate headerTitle="Reports" headerTabs={[]}>
      <div className="reports-page">
        <div className="reports-tabs">
          {TABS.map(t => (
            <Tab key={t.id} label={t.label} active={activeTab === t.id} onClick={() => setActiveTab(t.id)} />
          ))}
        </div>

        {tab.hasFilters && <FilterBar filters={filters} onChange={setFilters} />}

        <div className="reports-content">
          {loading && <p className="report-loading">Loading…</p>}
          {error   && <p className="report-error">{error}</p>}
          {!loading && !error && <Renderer data={cache[cacheKey]} />}
        </div>
      </div>
    </DashboardTemplate>
  );
};

export default ReportsPage;
