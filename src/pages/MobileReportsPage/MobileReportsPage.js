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

import Icon from '../../components/atoms/Icon/Icon';

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
      <div className="report-summary-grid">
        {Object.entries(summary).map(([k, v]) => (
          <div key={k} className="report-summary-card glass-panel">
            <span className="summary-label">{fmtLabel(k)}</span>
            {AMOUNT_KEYS.has(k)
              ? <span className="summary-value">{fmtAmt(v)}</span>
              : <span className="summary-count">{String(v)}</span>
            }
          </div>
        ))}
      </div>
    );
  };

  const renderDetailTable = (rows) => {
    if (!rows?.length) return (
      <div className="report-empty-state">
        <Icon name="search" size={40} color="var(--text-tertiary)" />
        <p>No records found for this period.</p>
      </div>
    );
    const keys = Object.keys(rows[0]);
    return (
      <div className="report-table-container glass-panel">
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
                    return <td key={k}>{new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>;
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
      <div className="report-combined-view">
        {data.summary && renderSummary(data.summary)}
        <div className="view-header">Details</div>
        {data.details && renderDetailTable(data.details)}
      </div>
    );
  };
  const renderCollectionsReport = () => {
    if (!data) return null;
    return (
      <div className="report-summary-grid">
        {data.totalCollected !== undefined && (
          <div className="report-summary-card glass-panel highlight">
            <span className="summary-label">Total Collected</span>
            <span className="summary-value">{fmtAmt(data.totalCollected)}</span>
          </div>
        )}
        {data.groupedByMode && Object.entries(data.groupedByMode).map(([mode, amt]) => (
          <div key={mode} className="report-summary-card glass-panel">
            <span className="summary-label">{mode}</span>
            <span className="summary-value">{fmtAmt(amt)}</span>
          </div>
        ))}
      </div>
    );
  };
  const renderOutstandingReport = () => {
    if (!data) return null;
    const rows = Array.isArray(data) ? data : (data.data || []);
    if (!rows.length) return (
      <div className="report-empty-state">
        <Icon name="checkCircle" size={40} color="var(--color-success)" />
        <p>No outstanding dues found.</p>
      </div>
    );
    const total = rows.reduce((s, r) => s + parseFloat(r.outstandingAmount || 0), 0);
    return (
      <div className="report-combined-view">
        <div className="report-summary-grid">
          <div className="report-summary-card glass-panel highlight">
            <span className="summary-label">Total Outstanding</span>
            <span className="summary-value">{fmtAmt(total)}</span>
          </div>
          <div className="report-summary-card glass-panel">
            <span className="summary-label">Customers</span>
            <span className="summary-value">{rows.length}</span>
          </div>
        </div>
        <div className="report-table-container glass-panel">
          <table className="report-table">
            <thead>
              <tr><th>Customer</th><th className="text-right">Outstanding</th></tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.customerId}>
                  <td>
                    <div className="customer-cell">
                      <span className="name">{r.customerName}</span>
                      <span className="phone">{r.phone || '—'}</span>
                    </div>
                  </td>
                  <td className="text-right">{fmtAmt(r.outstandingAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };
  const renderInventoryReport = () => {
    if (!data) return null;
    const metals = Object.entries(data);
    if (!metals.length) return <p className="mobile-report-empty">No inventory data.</p>;
    return (
      <div className="report-table-container glass-panel">
        <table className="report-table">
          <thead>
            <tr><th>Metal</th><th className="text-right">Count</th><th className="text-right">Net</th></tr>
          </thead>
          <tbody>
            {metals.map(([metal, info]) => (
              <tr key={metal}>
                <td><strong>{metal}</strong></td>
                <td className="text-right">{info.count}</td>
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
        {/* Category Tabs */}
        <div className="reports-category-tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`category-tab-btn ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Filter Section */}
        {tab?.hasFilters && (
          <div className="reports-filters-area">
            <div className="filters-presets">
              {PRESETS.map(p => (
                <button key={p.label} className="preset-pill" onClick={() => setFilters(p.getValue())}>
                  {p.label}
                </button>
              ))}
            </div>
            <div className="filters-dates glass-panel">
              <input
                type="date"
                className="minimal-date-input"
                value={filters.dateFrom || ''}
                onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
              />
              <Icon name="arrowRight" size={14} color="var(--text-tertiary)" />
              <input
                type="date"
                className="minimal-date-input"
                value={filters.dateTo || ''}
                onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
              />
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="reports-dynamic-content">
          {loading ? (
            <div className="report-loading-spinner">
              <div className="spinner"></div>
              <span>Generating Report...</span>
            </div>
          ) : (
            <div className="report-view">
              {data && RENDERERS[activeTab]?.()}
            </div>
          )}
        </div>
      </div>
    </MobileTemplate>
  );
};

export default MobileReportsPage;


// export default MobileReportsPage;