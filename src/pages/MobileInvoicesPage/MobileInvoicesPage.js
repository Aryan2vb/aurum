import React, { useState, useEffect, useCallback } from 'react';
import MobileTemplate from '../../components/templates/MobileTemplate/MobileTemplate';
import Icon from '../../components/atoms/Icon/Icon';
import { getInvoices } from '../../services/invoicesService';
import './MobileInvoicesPage.css';

const fmtCurrency = (amount) => {
  if (amount === undefined || amount === null) return '—';
  return `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const getStatusConfig = (status) => {
  switch (status) {
    case 'PAID':
      return { label: 'Paid', color: 'var(--color-status-active)' };
    case 'PENDING':
      return { label: 'Pending', color: 'var(--color-status-overdue)' };
    case 'OVERDUE':
      return { label: 'Overdue', color: 'var(--color-status-overdue)' };
    case 'DRAFT':
      return { label: 'Draft', color: 'var(--text-secondary)' };
    default:
      return { label: status || 'Active', color: 'var(--accent-color)' };
  }
};

const MobileInvoicesPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const params = { limit: 50 };
      if (searchQuery) params.search = searchQuery;
      if (activeFilter !== 'all') params.status = activeFilter;

      const response = await getInvoices(params);
      setInvoices(response?.data || []);
    } catch (error) {
      console.error('Failed to fetch invoices', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, activeFilter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Stats
  const stats = React.useMemo(() => {
    const total = invoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);
    const unpaid = invoices.reduce((sum, inv) => sum + (Number(inv.remainingBalance) || 0), 0);
    const overdue = invoices.filter(inv => inv.status === 'OVERDUE' || (inv.status !== 'PAID' && Number(inv.remainingBalance) > 0)).length;
    return { total, unpaid, overdue };
  }, [invoices]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'PAID': return 'var(--color-success)';
      case 'PENDING': return 'var(--color-accent)';
      case 'OVERDUE': return 'var(--color-error)';
      case 'DRAFT': return 'var(--text-tertiary)';
      default: return 'var(--color-accent)';
    }
  };

  const headerAction = (
    <a href="/invoices/new" className="mobile-icon-button primary">
      <Icon name="add" size={20} color="white" />
    </a>
  );

  return (
    <MobileTemplate title="Invoices" headerAction={headerAction}>
      <div className="mobile-invoices">
        {/* Stats Grid */}
        <div className="mobile-invoices-stats">
          <div className="mobile-invoices-stat glass-panel">
            <span className="mobile-invoices-stat__label">Total</span>
            <span className="mobile-invoices-stat__value">{fmtCurrency(stats.total)}</span>
          </div>
          <div className="mobile-invoices-stat glass-panel success">
            <span className="mobile-invoices-stat__label">Unpaid</span>
            <span className="mobile-invoices-stat__value">
              {fmtCurrency(stats.unpaid)}
            </span>
          </div>
          <div className="mobile-invoices-stat glass-panel error">
            <span className="mobile-invoices-stat__label">Overdue</span>
            <span className="mobile-invoices-stat__value">
              {stats.overdue}
            </span>
          </div>
        </div>

        {/* Search & Filter Section */}
        <div className="invoice-filters-container">
          <div className="mobile-search-bar glass-panel">
            <Icon name="search" size={18} color="var(--text-tertiary)" />
            <input
              type="text"
              className="mobile-search-bar__input"
              placeholder="Search invoices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="mobile-filter-tabs">
            {['all', 'PENDING', 'PAID', 'OVERDUE', 'DRAFT'].map((filter) => (
              <button
                key={filter}
                className={`mobile-filter-tab ${activeFilter === filter ? 'active' : ''}`}
                onClick={() => setActiveFilter(filter)}
              >
                {filter === 'all' ? 'All' : filter.charAt(0) + filter.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Invoice List */}
        {loading ? (
          <div className="mobile-loading-shimmer">
            {[1, 2, 3].map(i => <div key={i} className="shimmer-item" />)}
          </div>
        ) : invoices.length === 0 ? (
          <div className="mobile-empty-state">
            <div className="empty-icon">
              <Icon name="invoice" size={48} color="var(--text-tertiary)" />
            </div>
            <h3>No Invoices Found</h3>
            <p>Ready to create your first invoice?</p>
            <a href="/invoices/new" className="mobile-empty-button">
              Create Invoice
            </a>
          </div>
        ) : (
          <div className="mobile-invoice-list">
            {invoices.map((invoice) => (
              <a
                key={invoice.id}
                href={`/invoices/${invoice.id}`}
                className="mobile-invoice-row glass-panel"
              >
                <div className="mobile-invoice-row__left">
                  <span className="mobile-invoice-row__number">{invoice.invoiceNumber || `#${invoice.id}`}</span>
                  <span className="mobile-invoice-row__customer">
                    {invoice.buyer?.name || invoice.customerName || 'Unknown'}
                  </span>
                  <span className="mobile-invoice-row__date">
                    {invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}
                  </span>
                </div>
                <div className="mobile-invoice-row__right">
                  <span className="mobile-invoice-row__amount">
                    {fmtCurrency(invoice.totalAmount)}
                  </span>
                  <div className="status-dot-wrapper">
                    <div className="status-dot" style={{ backgroundColor: getStatusColor(invoice.status) }}></div>
                    <span className="status-label">{invoice.status?.toLowerCase()}</span>
                  </div>
                  {Number(invoice.remainingBalance) > 0 && invoice.status !== 'PAID' && (
                    <span className="mobile-invoice-row__balance">
                      Due: {fmtCurrency(invoice.remainingBalance)}
                    </span>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </MobileTemplate>
  );
};

export default MobileInvoicesPage;


// export default MobileInvoicesPage;