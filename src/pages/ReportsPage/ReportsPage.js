import React, { useState, useEffect, useCallback } from 'react';
import DashboardTemplate from '../../components/templates/DashboardTemplate/DashboardTemplate';
import Tab from '../../components/molecules/Tab/Tab';
import DateDisplay from '../../components/atoms/DateDisplay/DateDisplay';
import Icon from '../../components/atoms/Icon/Icon';
import DateRangeFilter from '../../components/molecules/DateRangeFilter/DateRangeFilter';
import { toLocalYmd, parseLocalYmd } from '../../components/molecules/DateRangeFilter/dateRangePicker';
import {
  getSalesReport,
  getGstReport,
  getCollectionsReport,
  getOutstandingReport,
  getInventoryFlowReport,
  getAdvancesReport,
} from '../../services/reportsService';
import './ReportsPage.css';

const TABS = [
  { id: 'sales',       label: 'Sales',          fetch: getSalesReport,        hasFilters: true  },
  { id: 'gst',         label: 'GST',            fetch: getGstReport,          hasFilters: true  },
  { id: 'collections', label: 'Collections',    fetch: getCollectionsReport,  hasFilters: true  },
  { id: 'outstanding', label: 'Outstanding',    fetch: getOutstandingReport,  hasFilters: false },
  { id: 'advances',    label: 'Advances Held',  fetch: getAdvancesReport,     hasFilters: false },
  { id: 'inventory',   label: 'Inventory Flow', fetch: getInventoryFlowReport,hasFilters: true  },
];

const fmtLabel = (key) => key.replace(/([A-Z])/g, ' $1').trim();

const METHOD_LABELS = {
  CASH: 'Cash',
  UPI: 'UPI',
  BANK_TRANSFER: 'Bank Transfer',
  CHEQUE: 'Cheque',
  CARD: 'Swipe / Card',
  OTHER: 'Other',
  NEFT: 'NEFT',
  RTGS: 'RTGS',
  IMPS: 'IMPS',
  OLD_GOLD: 'Old Gold',
  CREDIT: 'Credit'
};

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
            <span className="report-summary-label">{METHOD_LABELS[mode] || fmtLabel(mode)}</span>
            <span className="report-summary-amount">{fmtAmt(amt)}</span>
          </div>
        ))}
      </div>
      <DetailTable rows={data.recentPayments?.map(p => ({
        date: p.paidAt,
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
                {info.purities ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {Object.entries(info.purities).map(([purity, details]) => {
                      const isObject = details && typeof details === 'object';
                      const count = isObject ? details.count : details;
                      const gw = isObject ? parseFloat(details.grossWeight || 0).toFixed(2) : null;
                      const nw = isObject ? parseFloat(details.netWeight || 0).toFixed(2) : null;
                      return (
                        <div key={purity} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{ minWidth: '75px', fontWeight: '500' }}>{purity}:</span>
                          <span style={{ color: 'var(--text-primary)' }}>{count} pcs</span>
                          {gw !== null && (
                            <span style={{ opacity: 0.8, fontSize: '11px' }}>
                              (Gross: <strong>{gw}g</strong> · Net: <strong>{nw}g</strong>)
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const AdvancesReport = ({ data }) => {
  const [expanded, setExpanded] = React.useState(null);

  if (!data) return null;
  const rows = data.customers || [];

  const fmt2 = (d) => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return '—'; }
  };

  return (
    <>
      <div className="report-summary">
        <div className="report-summary-card">
          <span className="report-summary-label">Total Advances Held</span>
          <span className="report-summary-amount">{fmtAmt(data.summary?.totalAdvanceHeld)}</span>
        </div>
        <div className="report-summary-card">
          <span className="report-summary-label">Customers</span>
          <span className="report-summary-count">{data.summary?.customersCount ?? 0}</span>
        </div>
      </div>

      {!rows.length
        ? <p className="report-empty">No customers with advance balance.</p>
        : (
          <table className="report-table advances-table">
            <thead>
              <tr>
                <th></th>
                <th>Customer</th>
                <th>Phone</th>
                <th className="report-th-right">Received</th>
                <th className="report-th-right">Used / Adjusted</th>
                <th>Last Deposit</th>
                <th className="report-th-right advances-balance-col">Balance</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const used = parseFloat(r.totalApplied || 0)
                  + parseFloat(r.totalTransferOut || 0)
                  + parseFloat(r.totalRefunded || 0)
                  - parseFloat(r.totalTransferIn || 0);
                return (
                  <React.Fragment key={r.customerId}>
                    <tr
                      className={expanded === r.customerId ? 'advances-row-expanded' : ''}
                      style={{ cursor: r.deposits?.length ? 'pointer' : 'default' }}
                      onClick={() => r.deposits?.length && setExpanded(expanded === r.customerId ? null : r.customerId)}
                    >
                      <td className="advances-expand-cell">
                        {r.deposits?.length > 0 && (
                          <span className="advances-expand-icon">
                            {expanded === r.customerId ? '▾' : '▸'}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="report-td-name">{r.customerName}</div>
                        <div className="report-td-secondary" style={{ fontSize: '0.75rem' }}>{r.customerCode}</div>
                      </td>
                      <td className="report-td-secondary">{r.phone || '—'}</td>
                      <td className="report-th-right">{fmtAmt(r.totalReceived)}</td>
                      <td className="report-th-right report-td-secondary">
                        {used > 0 ? fmtAmt(used) : '—'}
                      </td>
                      <td className="report-td-secondary">{fmt2(r.lastReceivedAt)}</td>
                      <td className="report-th-right advances-balance-cell">{fmtAmt(r.availableBalance)}</td>
                    </tr>

                    {expanded === r.customerId && r.deposits?.map((dep) => (
                      <tr key={dep.id} className="advances-deposit-row">
                        <td></td>
                        <td colSpan={2} className="advances-deposit-indent">
                          ↳ {fmt2(dep.date)}{dep.paymentMethod ? ` · ${dep.paymentMethod}` : ''}
                        </td>
                        <td className="report-th-right">{fmtAmt(dep.amount)}</td>
                        <td colSpan={2} className="report-td-secondary">
                          {dep.description || '—'}
                        </td>
                        <td></td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="report-table-total-row">
                <td colSpan={6}><strong>Total</strong></td>
                <td className="report-th-right advances-balance-cell">
                  <strong>{fmtAmt(data.summary?.totalAdvanceHeld)}</strong>
                </td>
              </tr>
            </tfoot>
          </table>
        )
      }
    </>
  );
};

const RENDERERS = {
  sales:       SalesReport,
  gst:         GstReport,
  collections: CollectionsReport,
  outstanding: OutstandingReport,
  advances:    AdvancesReport,
  inventory:   InventoryReport,
};

/* ── Date filter ── */
const ReportDateFilter = ({ filters, onChange }) => (
  <DateRangeFilter
    label="Date Range"
    icon={<Icon name="date" size={14} />}
    align="right"
    start={parseLocalYmd(filters.dateFrom)}
    end={parseLocalYmd(filters.dateTo)}
    onChange={(s, e) => onChange({ dateFrom: toLocalYmd(s) || '', dateTo: toLocalYmd(e) || '' })}
  />
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
        <div className="reports-toolbar">
          <div className="reports-tabs">
            {TABS.map(t => (
              <Tab key={t.id} label={t.label} active={activeTab === t.id} onClick={() => setActiveTab(t.id)} />
            ))}
          </div>
          {tab.hasFilters && (
            <div className="reports-toolbar-filter">
              <ReportDateFilter filters={filters} onChange={setFilters} />
            </div>
          )}
        </div>

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
