import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardTemplate from '../../components/templates/DashboardTemplate/DashboardTemplate';
import {
  getDashboardSummary,
  getSalesTrend,
  getTopItems,
  getDataQuality,
} from '../../services/analyticsService';
import {
  DonutChart,
  HorizontalBarChart,
  InsightCallout,
  SplitBar,
  TrendChart,
} from '../../components/molecules/AnalyticsViz/AnalyticsViz';
import styles from './DashboardPage.module.css';

const INR = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const GM = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' gm';

const METAL_COLORS = { GOLD: '#d4a017', SILVER: '#94a3b8', PLATINUM: '#64748b', UNKNOWN: '#78716c' };
const PAYMENT_COLORS = { CASH: '#16a34a', BANK: '#2563eb' };

const dateToInput = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
};

const today = () => dateToInput(new Date());
const monthStart = () => {
  const d = new Date();
  d.setDate(1);
  return dateToInput(d);
};
const weekStart = () => {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  return dateToInput(d);
};

const PRESETS = [
  { key: '7d', label: 'Last 7 Days', from: weekStart(), to: today() },
  { key: 'month', label: 'This Month', from: monthStart(), to: today() },
  { key: 'today', label: 'Today', from: today(), to: today() },
  { key: 'custom', label: 'Custom' },
];

const sumPayments = (payments = []) => {
  const cash = payments.filter((p) => p.mode === 'CASH').reduce((sum, p) => sum + Number(p.total || 0), 0);
  const bank = payments.filter((p) => p.mode !== 'CASH').reduce((sum, p) => sum + Number(p.total || 0), 0);
  return { cash, bank, total: cash + bank };
};

const getAlertItems = (quality) => {
  const summary = quality?.summary || {};
  return [
    {
      key: 'payments',
      label: 'Payment verification',
      description: 'Invoices need payment checking',
      count: summary.paymentMismatchCount || 0,
    },
    {
      key: 'customers',
      label: 'Customer details',
      description: 'Missing mobile, GSTIN, or address',
      count: summary.missingCustomerDetailCount || 0,
    },
    {
      key: 'items',
      label: 'Item data',
      description: 'Invalid HSN, purity, name, or rate',
      count: summary.invalidItemCount || 0,
    },
    {
      key: 'duplicates',
      label: 'Duplicate invoices',
      description: 'Invoice numbers need review',
      count: summary.duplicateInvoiceCount || 0,
    },
    {
      key: 'totals',
      label: 'GST totals',
      description: 'Tax or total mismatch',
      count: summary.totalMismatchCount || 0,
    },
  ];
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const [activePreset, setActivePreset] = useState('month');
  const [dateFrom, setDateFrom] = useState(monthStart());
  const [dateTo, setDateTo] = useState(today());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState(null);
  const [topItems, setTopItems] = useState([]);
  const [quality, setQuality] = useState(null);

  const filters = useMemo(() => ({ dateFrom, dateTo }), [dateFrom, dateTo]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryData, trendData, itemData, qualityData] = await Promise.all([
        getDashboardSummary(filters),
        getSalesTrend({ ...filters, granularity: 'day' }),
        getTopItems(filters),
        getDataQuality(filters),
      ]);
      setSummary(summaryData);
      setTrend(trendData);
      setTopItems((itemData || []).slice(0, 5));
      setQuality(qualityData);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { loadData(); }, [loadData]);

  const handlePreset = (preset) => {
    setActivePreset(preset.key);
    if (preset.from) setDateFrom(preset.from);
    if (preset.to) setDateTo(preset.to);
  };

  const derived = useMemo(() => {
    const payments = sumPayments(summary?.payments);
    const gold = summary?.metal?.find((metal) => metal.metalType === 'GOLD');
    const metalRows = (summary?.metal || []).map((metal) => ({
      label: metal.metalType,
      value: Number(metal.totalValue || 0),
      color: METAL_COLORS[metal.metalType] || METAL_COLORS.UNKNOWN,
      weight: metal.totalNetWeight,
    }));
    const trendRows = trend?.trend || [];
    const highest = trendRows.reduce((best, point) => Number(point.sales || 0) > Number(best?.sales || 0) ? point : best, null);
    const midpoint = Math.floor(trendRows.length / 2);
    const firstSales = trendRows.slice(0, midpoint).reduce((sum, point) => sum + Number(point.sales || 0), 0);
    const lastSales = trendRows.slice(midpoint).reduce((sum, point) => sum + Number(point.sales || 0), 0);
    const salesTone = trendRows.length < 4 ? 'neutral' : lastSales >= firstSales ? 'good' : 'warning';
    const salesInsight = trendRows.length < 2
      ? 'Sales trend will appear once more bills are created.'
      : `${lastSales >= firstSales ? 'Sales are improving' : 'Sales softened'} in the later part of this period. Highest sales happened on ${highest?.date || 'this period'}.`;
    const topMetal = metalRows.reduce((best, row) => row.value > Number(best?.value || 0) ? row : best, null);
    const alerts = getAlertItems(quality).sort((a, b) => Number(b.count || 0) - Number(a.count || 0));
    const alertTotal = alerts.reduce((sum, item) => sum + Number(item.count || 0), 0);
    const visibleAlerts = alerts.filter((item) => item.count > 0).slice(0, 3);

    return { payments, gold, metalRows, trendRows, highest, salesInsight, salesTone, topMetal, alerts, visibleAlerts, alertTotal };
  }, [summary, trend, quality]);

  const kpis = useMemo(() => {
    if (!summary) return [];
    return [
      { label: "Today's Sales", value: INR(summary.today?.sales), context: `${summary.today?.invoiceCount || 0} bills`, tone: 'strong' },
      { label: "This Month's Sales", value: INR(summary.month?.sales), context: `${summary.month?.invoiceCount || 0} bills` },
      { label: 'Cash / Bank', value: `${INR(derived.payments.cash)} / ${INR(derived.payments.bank)}`, context: 'collections' },
      { label: 'Gold Weight Sold', value: GM(derived.gold?.totalNetWeight), context: INR(derived.gold?.totalValue) },
      { label: 'GST Collected', value: INR(summary.gst?.totalTax), context: 'selected period' },
    ];
  }, [summary, derived]);

  return (
    <DashboardTemplate headerTitle="Dashboard" headerTabs={[]}>
      <div className={styles.dashboardWrapper}>
        <div className={styles.filterBar}>
          <div className={styles.filterGroup}>
            {PRESETS.map((preset) => (
              <button
                key={preset.key}
                className={`${styles.presetBtn} ${activePreset === preset.key ? styles.active : ''}`}
                onClick={() => handlePreset(preset)}
              >
                {preset.label}
              </button>
            ))}
          </div>
          {activePreset === 'custom' && (
            <div className={styles.customDates}>
              <input type="date" className={styles.dateInputSmall} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              <span>to</span>
              <input type="date" className={styles.dateInputSmall} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          )}
        </div>

        {error && <div className={styles.errorBox}>{error}</div>}

        {loading ? (
          <div className={styles.loadingOverlay}>
            <div className={styles.spinner} />
            Loading business view...
          </div>
        ) : summary && (
          <>
            <section className={styles.heroPanel}>
              <div>
                <span className={styles.eyebrow}>Business health</span>
                <h2>Business position at a glance.</h2>
              </div>
              <InsightCallout tone={derived.alertTotal > 0 ? 'warning' : derived.salesTone}>
                {derived.alertTotal > 0 ? `${derived.alertTotal} checks need attention. Start with alerts.` : derived.salesInsight}
              </InsightCallout>
            </section>

            <section className={styles.kpiGrid} aria-label="Primary business KPIs">
              {kpis.map((kpi) => (
                <article key={kpi.label} className={`${styles.kpiCard} ${kpi.tone === 'strong' ? styles.kpiStrong : ''}`}>
                  <span className={styles.kpiLabel}>{kpi.label}</span>
                  <strong className={styles.kpiValue}>{kpi.value}</strong>
                  <span className={styles.kpiContext}>{kpi.context}</span>
                </article>
              ))}
            </section>

            <section className={styles.mainGrid}>
              <article className={`${styles.panel} ${styles.salesPanel}`}>
                <div className={styles.panelHeader}>
                  <div>
                    <span className={styles.eyebrow}>Sales trend</span>
                    <h3>Daily movement</h3>
                  </div>
                  <button className={styles.linkBtn} onClick={() => navigate('/analytics?tab=sales')}>View sales analytics</button>
                </div>
                <InsightCallout tone={derived.salesTone}>{derived.salesInsight}</InsightCallout>
                <TrendChart points={derived.trendRows} formatValue={INR} />
              </article>

              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <span className={styles.eyebrow}>Gold vs silver</span>
                    <h3>Revenue share</h3>
                  </div>
                  <button className={styles.linkBtn} onClick={() => navigate('/analytics?tab=product')}>View metal details</button>
                </div>
                <div className={styles.donutLayout}>
                  <DonutChart
                    segments={derived.metalRows}
                    centerValue={derived.topMetal?.label || 'Metal'}
                    centerLabel="Top"
                  />
                  <div className={styles.compactList}>
                    {derived.metalRows.slice(0, 3).map((metal) => (
                      <div key={metal.label}>
                        <span><i style={{ background: metal.color }} />{metal.label}</span>
                        <strong>{INR(metal.value)}</strong>
                      </div>
                    ))}
                  </div>
                </div>
                <p className={styles.softText}>
                  {derived.topMetal ? `${derived.topMetal.label} is driving most metal revenue in this period.` : 'Metal mix will appear after billing.'}
                </p>
              </article>

              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <span className={styles.eyebrow}>Payments</span>
                    <h3>Cash vs bank</h3>
                  </div>
                  <button className={styles.linkBtn} onClick={() => navigate('/reports?tab=collections')}>View payment report</button>
                </div>
                <SplitBar
                  segments={[
                    { label: 'Cash', value: derived.payments.cash, color: PAYMENT_COLORS.CASH, formatted: INR(derived.payments.cash) },
                    { label: 'Bank', value: derived.payments.bank, color: PAYMENT_COLORS.BANK, formatted: INR(derived.payments.bank) },
                  ]}
                />
                <p className={styles.softText}>
                  {quality?.summary?.paymentMismatchCount > 0
                    ? `${quality.summary.paymentMismatchCount} invoices need payment verification.`
                    : 'Payments look reconciled for this period.'}
                </p>
              </article>

              <article className={`${styles.panel} ${styles.productPanel}`}>
                <div className={styles.panelHeader}>
                  <div>
                    <span className={styles.eyebrow}>Product performance</span>
                    <h3>Top 5 items</h3>
                  </div>
                  <button className={styles.linkBtn} onClick={() => navigate('/reports?tab=item')}>View item report</button>
                </div>
                <HorizontalBarChart
                  rows={topItems.map((item) => ({
                    label: item.description,
                    value: item.totalValue,
                    color: METAL_COLORS[item.metalType] || METAL_COLORS.UNKNOWN,
                  }))}
                  formatValue={INR}
                />
              </article>
            </section>

            <section className={styles.actionsSection}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.eyebrow}>Alerts and actions</span>
                  <h3>{derived.alertTotal > 0 ? 'Needs attention' : 'All clear'}</h3>
                </div>
                <button className={styles.linkBtn} onClick={() => navigate('/alerts')}>Review alerts</button>
              </div>
              <div className={styles.alertSummary}>
                <div className={`${styles.alertScore} ${derived.alertTotal > 0 ? styles.alertWarn : styles.alertGood}`}>
                  <strong>{derived.alertTotal}</strong>
                  <span>open checks</span>
                </div>
                <div className={styles.alertList}>
                  {(derived.visibleAlerts.length ? derived.visibleAlerts : derived.alerts.slice(0, 3)).map((alert) => (
                    <button key={alert.key} type="button" onClick={() => navigate('/alerts')}>
                      <span>{alert.label}</span>
                      <strong>{alert.count}</strong>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </DashboardTemplate>
  );
};

export default DashboardPage;
