import React, { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardTemplate from '../../components/templates/DashboardTemplate/DashboardTemplate';
import { getDataQuality } from '../../services/analyticsService';
import { ActionCard } from '../../components/molecules/AnalyticsViz/AnalyticsViz';
import './AlertsPage.css';

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
};

const GROUPS = [
  { id: 'paymentMismatches', label: 'Payments', title: 'Payment verification', countKey: 'paymentMismatchCount', tone: 'danger' },
  { id: 'missingCustomerDetails', label: 'Customers', title: 'Missing customer details', countKey: 'missingCustomerDetailCount', tone: 'warning' },
  { id: 'invalidItems', label: 'Items', title: 'Item data quality', countKey: 'invalidItemCount', tone: 'warning' },
  { id: 'duplicateInvoices', label: 'Duplicates', title: 'Duplicate invoices', countKey: 'duplicateInvoiceCount', tone: 'danger' },
  { id: 'totalMismatches', label: 'GST totals', title: 'GST and total checks', countKey: 'totalMismatchCount', tone: 'danger' },
];

const labelize = (key) => key.replace(/([A-Z])/g, ' $1').trim();

const AlertTable = ({ rows = [] }) => {
  if (!rows.length) return <p className="alerts-empty">No issues in this group.</p>;
  const columns = Object.keys(rows[0]).slice(0, 8);
  return (
    <div className="alerts-table-scroll">
      <table className="alerts-table">
        <thead>
          <tr>{columns.map((col) => <th key={col}>{labelize(col)}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {columns.map((col) => (
                <td key={col}>{typeof row[col] === 'boolean' ? (row[col] ? 'Yes' : 'No') : String(row[col] ?? '-')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const AlertsPage = () => {
  const [filters, setFilters] = useState({ dateFrom: monthStart(), dateTo: today() });
  const [activeGroup, setActiveGroup] = useState('paymentMismatches');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getDataQuality(filters));
    } catch (err) {
      setError(err.message || 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const cards = useMemo(() => GROUPS.map((group) => ({
    ...group,
    count: data?.summary?.[group.countKey] || 0,
  })), [data]);

  const active = GROUPS.find((group) => group.id === activeGroup) || GROUPS[0];

  return (
    <DashboardTemplate headerTitle="Alerts" headerTabs={[]}>
      <div className="alerts-page">
        <div className="alerts-header">
          <div>
            <span>Action list</span>
            <h2>Clean up billing issues before reports go out.</h2>
          </div>
          <div className="alerts-filter">
            <input type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} />
            <input type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} />
          </div>
        </div>

        {loading && <p className="alerts-state">Loading alerts...</p>}
        {error && <p className="alerts-error">{error}</p>}
        {!loading && !error && (
          <>
            <div className="alerts-grid">
              {cards.map((card) => (
                <ActionCard
                  key={card.id}
                  title={card.title}
                  description={`${card.count} open items`}
                  count={card.count}
                  tone={card.count > 0 ? card.tone : 'good'}
                  onClick={() => setActiveGroup(card.id)}
                />
              ))}
            </div>
            <section className="alerts-detail">
              <div className="alerts-detail-title">
                <span>{active.label}</span>
                <h3>{active.title}</h3>
              </div>
              <AlertTable rows={data?.[active.id] || []} />
            </section>
          </>
        )}
      </div>
    </DashboardTemplate>
  );
};

export default AlertsPage;
