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
  const [selectedInvoice, setSelectedInvoice] = useState(null);

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

  const headerAction = (
    <a href="/mobile/invoices/new" className="mobile-icon-button">
      <Icon name="add" size={20} />
    </a>
  );

  return (
    <MobileTemplate title="Invoices" headerAction={headerAction}>
      <div className="mobile-invoices">
        {/* Stats Row */}
        <div className="mobile-invoices-stats">
          <div className="mobile-invoices-stat">
            <span className="mobile-invoices-stat__label">Total</span>
            <span className="mobile-invoices-stat__value">{fmtCurrency(stats.total)}</span>
          </div>
          <div className="mobile-invoices-stat">
            <span className="mobile-invoices-stat__label">Unpaid</span>
            <span className="mobile-invoices-stat__value mobile-invoices-stat__value--warning">
              {fmtCurrency(stats.unpaid)}
            </span>
          </div>
          <div className="mobile-invoices-stat">
            <span className="mobile-invoices-stat__label">Overdue</span>
            <span className="mobile-invoices-stat__value mobile-invoices-stat__value--danger">
              {stats.overdue}
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="mobile-search-bar">
          <Icon name="search" size={16} />
          <input
            type="text"
            className="mobile-search-bar__input"
            placeholder="Search invoices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filter Tabs */}
        <div className="mobile-filter-tabs">
          {['all', 'PENDING', 'PAID', 'OVERDUE', 'DRAFT'].map((filter) => (
            <button
              key={filter}
              className={`mobile-filter-tab ${activeFilter === filter ? 'active' : ''}`}
              onClick={() => setActiveFilter(filter)}
            >
              {filter === 'all' ? 'All' : filter}
            </button>
          ))}
        </div>

        {/* Invoice List */}
        {loading ? (
          <div className="mobile-loading">Loading...</div>
        ) : invoices.length === 0 ? (
          <div className="mobile-empty">
            <p>No invoices found</p>
            <a href="/mobile/invoices/new" className="mobile-empty__action">
              Create your first invoice
            </a>
          </div>
        ) : (
          <div className="mobile-invoice-list">
            {invoices.map((invoice) => {
              const status = getStatusConfig(invoice.status);
              return (
                <a
                  key={invoice.id}
                  href={`/mobile/invoices/${invoice.id}`}
                  className="mobile-invoice-row"
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
                    <span
                      className="mobile-invoice-row__status"
                      style={{ backgroundColor: status.color }}
                    >
                      {status.label}
                    </span>
                    {Number(invoice.remainingBalance) > 0 && invoice.status !== 'PAID' && (
                      <span className="mobile-invoice-row__balance">
                        Due: {fmtCurrency(invoice.remainingBalance)}
                      </span>
                    )}
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </MobileTemplate>
  );
};

export default MobileInvoicesPage;