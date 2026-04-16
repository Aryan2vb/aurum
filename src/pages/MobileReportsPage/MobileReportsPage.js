import React, { useState, useEffect, useCallback } from 'react';
import MobileTemplate from '../../components/templates/MobileTemplate/MobileTemplate';
import {
  getSalesReport,
  getGstReport,
  getCollectionsReport,
  getOutstandingReport,
  getInventoryFlowReport,
} from '../../services/reportsService';
import './MobileReportsPage.css';

const TABS = [
  { id: 'sales', label: 'Sales', fetch: getSalesReport, hasFilters: true },
  { id: 'gst', label: 'GST', fetch: getGstReport, hasFilters: true },
  { id: 'collections', label: 'Collections', fetch: getCollectionsReport, hasFilters: true },
  { id: 'outstanding', label: 'Outstanding', fetch: getOutstandingReport, hasFilters: false },
  { id: 'inventory', label: 'Inventory', fetch: getInventoryFlowReport, hasFilters: true },
];

const fmtAmt = (v) => '₹' + (parseFloat(v) || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const fmtLabel = (key) => key.replace(/([A-Z])/g, ' $1').trim();

const AMOUNT_KEYS = new Set(['totalSales', 'totalTaxable', 'totalCollections', 'totalCgst', 'totalSgst', 'totalIgst', 'totalTax', 'totalCollected', 'outstandingAmount', 'amount', 'taxableAmount', 'totalAmount', 'cgstAmount', 'sgstAmount', 'igstAmount']);

const PRESETS = [
  { label: 'This Month', getValue: () => {
    const now = new Date();
    return { dateFrom: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10), dateTo: now.toISOString().slice(0,10) };
  }},
  { label: 'Last Month', getValue: () => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last = new Date(now.getFullYear(), now.getMonth(), 0);
    return { dateFrom: first.toISOString().slice(0,10), dateTo: last.toISOString().slice(0,10) };
  }},
  { label: 'This Year', getValue: () => {
    const now = new Date();
    return { dateFrom: `${now.getFullYear()}-01-01`, dateTo: now.toISOString().slice(0,10) };
  }},
];

const MobileReportsPage = () => {
  const [activeTab, setActiveTab] = useState('sales');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '' });

  const loadReport = useCallback(async () => {
    const tab = TABS.find(t => t.id === activeTab);
    const params = tab.hasFilters ? Object.fromEntries(Object.entries(filters).filter(([,v]) => v)) : {};
    try {
      setLoading(true);
      const result = await tab.fetch(params);
      setData(result);
    } catch (e) {
      console.error('Failed to load report:', e);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [activeTab, filters]);

  useEffect(() => { loadReport(); }, [loadReport]);

  const tab = TABS.find(t => t.id === activeTab);

  // Summary cards renderer
  const renderSummary = (summary) => {
    if (!summary) return null;
    return (
      <div className="mobile-report-summary">
        {Object.entries(summary).map(([k, v]) => (
          <div key={k} className="mobile-report-card">
            <span className="mobile-report-card__label">{fmtLabel(k)}</span>
            {AMOUNT_KEYS.has(k)
              ? <span className="mobile-report-card__amount">{fmtAmt(v)}</span>
              : <span className="mobile-report-card__count">{String(v)}</span>
            }
          </div>
        ))}
      </div>
    );
  };

  const renderDetailTable = (rows) => {
    if (!rows?.length) return <p className="mobile-report-empty">No records found.</p>;
    const keys = Object.keys(rows[0]);
    return (
      <div className="mobile-report-table-wrap">
        <table className="mobile-report-table">
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
                    return <td key={k}>{new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>;
                  return <td key={k}>{AMOUNT_KEYS.has(k) ? fmtAmt(v) : String(v)}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderSalesReport = () => data ? renderSummary(data) : null;
  const renderGstReport = () => {
    if (!data) return null;
    return (
      <>
        {data.summary && renderSummary(data.summary)}
        {data.details && renderDetailTable(data.details)}
      </>
    );
  };
  const renderCollectionsReport = () => {
    if (!data) return null;
    return (
      <div className="mobile-report-summary">
        {data.totalCollected !== undefined && (
          <div className="mobile-report-card mobile-report-card--highlight">
            <span className="mobile-report-card__label">Total Collected</span>
            <span className="mobile-report-card__amount">{fmtAmt(data.totalCollected)}</span>
          </div>
        )}
        {data.groupedByMode && Object.entries(data.groupedByMode).map(([mode, amt]) => (
          <div key={mode} className="mobile-report-card">
            <span className="mobile-report-card__label">{mode}</span>
            <span className="mobile-report-card__amount">{fmtAmt(amt)}</span>
          </div>
        ))}
      </div>
    );
  };
  const renderOutstandingReport = () => {
    if (!data) return null;
    const rows = Array.isArray(data) ? data : (data.data || []);
    if (!rows.length) return <p className="mobile-report-empty">No outstanding dues.</p>;
    const total = rows.reduce((s, r) => s + parseFloat(r.outstandingAmount || 0), 0);
    return (
      <>
        <div className="mobile-report-summary">
          <div className="mobile-report-card mobile-report-card--highlight">
            <span className="mobile-report-card__label">Total Outstanding</span>
            <span className="mobile-report-card__amount">{fmtAmt(total)}</span>
          </div>
          <div className="mobile-report-card">
            <span className="mobile-report-card__label">Customers</span>
            <span className="mobile-report-card__count">{rows.length}</span>
          </div>
        </div>
        <div className="mobile-report-table-wrap">
          <table className="mobile-report-table">
            <thead>
              <tr><th>Customer</th><th>Phone</th><th className="text-right">Outstanding</th></tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.customerId}>
                  <td>{r.customerName}</td>
                  <td className="text-secondary">{r.phone || '—'}</td>
                  <td className="text-right">{fmtAmt(r.outstandingAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  };
  const renderInventoryReport = () => {
    if (!data) return null;
    const metals = Object.entries(data);
    if (!metals.length) return <p className="mobile-report-empty">No inventory data.</p>;
    return (
      <div className="mobile-report-table-wrap">
        <table className="mobile-report-table">
          <thead>
            <tr><th>Metal</th><th className="text-right">Count</th><th className="text-right">Gross</th><th className="text-right">Net</th></tr>
          </thead>
          <tbody>
            {metals.map(([metal, info]) => (
              <tr key={metal}>
                <td><strong>{metal}</strong></td>
                <td className="text-right">{info.count}</td>
                <td className="text-right">{parseFloat(info.totalGrossWeight || 0).toFixed(2)}g</td>
                <td className="text-right">{parseFloat(info.totalNetWeight || 0).toFixed(2)}g</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const RENDERERS = {
    sales: renderSalesReport,
    gst: renderGstReport,
    collections: renderCollectionsReport,
    outstanding: renderOutstandingReport,
    inventory: renderInventoryReport,
  };

  return (
    <MobileTemplate title="Reports">
      <div className="mobile-reports">
        {/* Tabs */}
        <div className="mobile-reports-tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`mobile-reports-tab ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Filter Bar */}
        {tab?.hasFilters && (
          <div className="mobile-reports-filters">
            <div className="mobile-reports-presets">
              {PRESETS.map(p => (
                <button key={p.label} className="mobile-reports-preset" onClick={() => setFilters(p.getValue())}>
                  {p.label}
                </button>
              ))}
            </div>
            <div className="mobile-reports-dates">
              <input
                type="date"
                className="mobile-date-input"
                value={filters.dateFrom || ''}
                onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
              />
              <span>→</span>
              <input
                type="date"
                className="mobile-date-input"
                value={filters.dateTo || ''}
                onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="mobile-reports-content">
          {loading && <p className="mobile-report-loading">Loading…</p>}
          {!loading && data && RENDERERS[activeTab]?.()}
        </div>
      </div>
    </MobileTemplate>
  );
};

export default MobileReportsPage;