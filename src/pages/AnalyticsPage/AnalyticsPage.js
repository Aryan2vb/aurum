import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import DashboardTemplate from '../../components/templates/DashboardTemplate/DashboardTemplate';
import Tab from '../../components/molecules/Tab/Tab';
import {
  getGstHsnAnalytics,
  getInventoryMovement,
  getLabourAnalytics,
  getLocationAnalytics,
  getMetalAnalytics,
  getPaymentAnalytics,
  getSalesTrend,
  getTopCustomers,
  getTopItems,
} from '../../services/analyticsService';
import { DonutChart, HorizontalBarChart, SplitBar, StackedBarChart, TrendChart } from '../../components/molecules/AnalyticsViz/AnalyticsViz';
import './AnalyticsPage.css';

const INR = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const GM = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' gm';

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
};

const TABS = [
  { id: 'sales', label: 'Sales', fetch: (f) => getSalesTrend({ ...f, granularity: 'day' }) },
  { id: 'product', label: 'Product', fetch: getTopItems },
  { id: 'metal', label: 'Metal', fetch: getMetalAnalytics },
  { id: 'customer', label: 'Customer', fetch: getTopCustomers },
  { id: 'location', label: 'Location', fetch: getLocationAnalytics },
  { id: 'payment', label: 'Payment', fetch: getPaymentAnalytics },
  { id: 'gst', label: 'GST', fetch: getGstHsnAnalytics },
  { id: 'labour', label: 'Labour', fetch: getLabourAnalytics },
  { id: 'inventory', label: 'Inventory Movement', fetch: getInventoryMovement },
];

const FilterBar = ({ filters, onChange }) => (
  <div className="analytics-filter">
    <button onClick={() => onChange({ dateFrom: monthStart(), dateTo: today() })}>This Month</button>
    <button onClick={() => {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      onChange({ dateFrom: d.toISOString().slice(0, 10), dateTo: today() });
    }}>Last 7 Days</button>
    <input type="date" value={filters.dateFrom} onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })} />
    <input type="date" value={filters.dateTo} onChange={(e) => onChange({ ...filters, dateTo: e.target.value })} />
  </div>
);

const MiniTable = ({ rows = [], columns = [] }) => {
  if (!rows.length) return <p className="analytics-empty">No records found.</p>;
  return (
    <div className="analytics-table-scroll">
      <table className="analytics-table">
        <thead>
          <tr>{columns.map((col) => <th key={col.key}>{col.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {columns.map((col) => <td key={col.key} className={col.align === 'right' ? 'analytics-num' : ''}>{col.render ? col.render(row) : row[col.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const SummaryCard = ({ label, value }) => (
  <div className="analytics-summary-card">
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

const SalesPanel = ({ data }) => {
  const trend = data?.trend || [];
  const total = trend.reduce((sum, point) => sum + Number(point.sales || 0), 0);
  const bills = trend.reduce((sum, point) => sum + Number(point.count || 0), 0);
  return (
    <>
      <div className="analytics-summary">
        <SummaryCard label="Sales" value={INR(total)} />
        <SummaryCard label="Invoices" value={bills} />
        <SummaryCard label="Average Bill" value={bills ? INR(total / bills) : INR(0)} />
      </div>
      <div className="analytics-panel">
        <TrendChart points={trend} formatValue={INR} />
      </div>
    </>
  );
};

const ProductPanel = ({ data }) => (
  <div className="analytics-panel">
    <HorizontalBarChart rows={(data || []).slice(0, 10).map((item) => ({ label: item.description, value: item.totalValue }))} formatValue={INR} />
    <MiniTable
      rows={(data || []).slice(0, 20)}
      columns={[
        { key: 'description', label: 'Item' },
        { key: 'metalType', label: 'Metal' },
        { key: 'totalWeight', label: 'Weight', align: 'right', render: (r) => GM(r.totalWeight) },
        { key: 'totalValue', label: 'Value', align: 'right', render: (r) => INR(r.totalValue) },
      ]}
    />
  </div>
);

const CustomerPanel = ({ data }) => (
  <div className="analytics-panel">
    <HorizontalBarChart rows={(data || []).slice(0, 10).map((customer) => ({ label: customer.name || 'Unnamed', value: customer.totalPurchase }))} formatValue={INR} color="#0ea5e9" />
    <MiniTable
      rows={(data || []).slice(0, 30)}
      columns={[
        { key: 'name', label: 'Customer' },
        { key: 'location', label: 'Location' },
        { key: 'invoiceCount', label: 'Bills', align: 'right' },
        { key: 'totalPurchase', label: 'Purchase', align: 'right', render: (r) => INR(r.totalPurchase) },
      ]}
    />
  </div>
);

const MetalPanel = ({ data }) => {
  const rows = data?.byMetal || [];
  return (
    <div className="analytics-panel analytics-two-col">
      <DonutChart
        segments={rows.map((row) => ({ label: row.metalType, value: row.totalValue, color: row.metalType === 'GOLD' ? '#d4a017' : row.metalType === 'SILVER' ? '#94a3b8' : '#64748b' }))}
        centerValue={rows[0]?.metalType || 'Metal'}
        centerLabel="Mix"
      />
      <HorizontalBarChart rows={rows.map((row) => ({ label: row.metalType, value: row.totalNetWeight }))} formatValue={GM} color="#d4a017" />
    </div>
  );
};

const LocationPanel = ({ data }) => (
  <div className="analytics-panel">
    <HorizontalBarChart rows={(data || []).slice(0, 12).map((location) => ({ label: location.location, value: location.totalSales }))} formatValue={INR} color="#14b8a6" />
    <MiniTable
      rows={(data || []).slice(0, 20)}
      columns={[
        { key: 'location', label: 'Location' },
        { key: 'customerCount', label: 'Customers', align: 'right' },
        { key: 'invoiceCount', label: 'Bills', align: 'right' },
        { key: 'totalSales', label: 'Sales', align: 'right', render: (r) => INR(r.totalSales) },
      ]}
    />
  </div>
);

const PaymentPanel = ({ data }) => {
  const cash = Number(data?.cashTotal || 0);
  const bank = Number(data?.bankTotal || 0);
  const modeKeys = Array.from(new Set((data?.trend || []).flatMap((row) => Object.keys(row).filter((key) => key !== 'date'))));
  const colors = Object.fromEntries(modeKeys.map((key, index) => [key, ['#16a34a', '#2563eb', '#f59e0b', '#ec4899', '#14b8a6', '#64748b'][index % 6]]));
  return (
    <>
      <div className="analytics-panel analytics-two-col">
        <SplitBar segments={[{ label: 'Cash', value: cash, color: '#16a34a' }, { label: 'Bank', value: bank, color: '#2563eb' }]} />
        <DonutChart
          segments={[{ label: 'Cash', value: cash, color: '#16a34a' }, { label: 'Bank', value: bank, color: '#2563eb' }]}
          centerValue={INR(cash + bank)}
          centerLabel="Collected"
        />
      </div>
      <div className="analytics-panel">
        <StackedBarChart rows={(data?.trend || []).slice(-12)} segmentKeys={modeKeys} colors={colors} formatValue={INR} />
      </div>
    </>
  );
};

const GstPanel = ({ data }) => (
  <>
    <div className="analytics-summary">
      <SummaryCard label="Taxable" value={INR(data?.summary?.totalTaxable)} />
      <SummaryCard label="GST" value={INR(data?.summary?.totalTax)} />
      <SummaryCard label="Invoices" value={data?.summary?.invoiceCount || 0} />
    </div>
    <div className="analytics-panel">
      <HorizontalBarChart rows={(data?.hsnBreakdown || []).slice(0, 10).map((row) => ({ label: row.hsnSac || 'Missing HSN', value: row.taxableValue }))} formatValue={INR} color="#f59e0b" />
      <MiniTable
        rows={data?.hsnBreakdown || []}
        columns={[
          { key: 'hsnSac', label: 'HSN' },
          { key: 'count', label: 'Lines', align: 'right' },
          { key: 'taxableValue', label: 'Taxable', align: 'right', render: (r) => INR(r.taxableValue) },
        ]}
      />
    </div>
  </>
);

const LabourPanel = ({ data }) => (
  <>
    <div className="analytics-summary">
      <SummaryCard label="Labour Income" value={INR(data?.summary?.totalLabour)} />
      <SummaryCard label="Labour %" value={`${data?.summary?.labourPercentage || 0}%`} />
      <SummaryCard label="Avg / gm" value={INR(data?.summary?.avgLabourPerGram)} />
    </div>
    <div className="analytics-panel">
      <HorizontalBarChart rows={(data?.byItem || []).slice(0, 12).map((item) => ({ label: item.description, value: item.totalLabour }))} formatValue={INR} color="#8b5cf6" />
    </div>
  </>
);

const InventoryPanel = ({ data }) => (
  <div className="analytics-panel">
    <HorizontalBarChart rows={(data?.byItem || []).slice(0, 10).map((item) => ({ label: item.description, value: item.netWeight }))} formatValue={GM} />
    <MiniTable
      rows={(data?.byItem || []).slice(0, 20)}
      columns={[
        { key: 'description', label: 'Item' },
        { key: 'metalType', label: 'Metal' },
        { key: 'netWeight', label: 'Net Weight', align: 'right', render: (r) => GM(r.netWeight) },
        { key: 'value', label: 'Value', align: 'right', render: (r) => INR(r.value) },
      ]}
    />
  </div>
);

const RENDERERS = {
  sales: SalesPanel,
  product: ProductPanel,
  metal: MetalPanel,
  customer: CustomerPanel,
  location: LocationPanel,
  payment: PaymentPanel,
  gst: GstPanel,
  labour: LabourPanel,
  inventory: InventoryPanel,
};

const AnalyticsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'sales';
  const [filters, setFilters] = useState({ dateFrom: monthStart(), dateTo: today() });
  const [cache, setCache] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const tab = useMemo(() => TABS.find((entry) => entry.id === activeTab) || TABS[0], [activeTab]);
  const cacheKey = `${tab.id}:${JSON.stringify(filters)}`;
  const Renderer = RENDERERS[tab.id];

  const load = useCallback(async () => {
    if (cache[cacheKey]) return;
    setLoading(true);
    setError(null);
    try {
      const result = await tab.fetch(filters);
      setCache((prev) => ({ ...prev, [cacheKey]: result }));
    } catch (err) {
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [cache, cacheKey, filters, tab]);

  useEffect(() => { load(); }, [load]);

  return (
    <DashboardTemplate headerTitle="Analytics" headerTabs={[]}>
      <div className="analytics-page">
        <div className="analytics-tabs">
          {TABS.map((entry) => (
            <Tab key={entry.id} label={entry.label} active={tab.id === entry.id} onClick={() => setSearchParams({ tab: entry.id })} />
          ))}
        </div>
        <FilterBar filters={filters} onChange={setFilters} />
        {loading && <p className="analytics-state">Loading analytics...</p>}
        {error && <p className="analytics-error">{error}</p>}
        {!loading && !error && Renderer && <Renderer data={cache[cacheKey]} />}
      </div>
    </DashboardTemplate>
  );
};

export default AnalyticsPage;
