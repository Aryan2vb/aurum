import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardTemplate from '../../components/templates/DashboardTemplate/DashboardTemplate';
import InvoiceDetailModal from '../../components/molecules/InvoiceDetailModal/InvoiceDetailModal';
import RecordPaymentModal from '../../components/molecules/RecordPaymentModal/RecordPaymentModal';
import InvoiceTable from '../../components/organisms/InvoiceTable/InvoiceTable';
import SummaryCard from '../../components/molecules/SummaryCard/SummaryCard';
import Icon from '../../components/atoms/Icon/Icon';
import { getInvoices } from '../../services/invoicesService';
import './InvoicesPage.css';

// Format currency
const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '—';
  return `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const InvoicesPage = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPaymentInvoice, setSelectedPaymentInvoice] = useState(null);
  const [showItems, setShowItems] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState({
    status: null,
    dateFrom: null,
    dateTo: null,
  });

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [pagination, setPagination] = useState(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // Reset to first page on search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getInvoices({
        search: debouncedSearch,
        status: filters.status,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        page,
        limit: pageSize,
        sortBy: 'invoiceDate',
        sortOrder: 'desc',
        includeItems: showItems,
      });

      if (response && response.data) {
        const mappedData = response.data.map((invoice) => ({
          ...invoice,
          financialDetails: {
            totalAmount: invoice.totalAmount,
            paidAmount: invoice.paidAmount,
            balance: invoice.remainingBalance,
          },
        }));
        setInvoices(mappedData);
        setPagination(response.meta);
      }
    } catch (error) {
      console.error('Failed to fetch invoices', error);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filters, page, pageSize, showItems]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Calculate stats from invoices
  const stats = useMemo(() => {
    const totalReceivables = invoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);
    const unpaidBalance = invoices.reduce((sum, inv) => sum + (Number(inv.financialDetails?.balance) || 0), 0);
    const gstCollected = invoices.reduce((sum, inv) => sum + (Number(inv.cgstAmount || 0) + Number(inv.sgstAmount || 0)), 0);
    
    // Count overdue (for demonstration, using simplified logic)
    const overdueCount = invoices.filter(inv => Number(inv.financialDetails?.balance) > 0 && inv.status !== 'PAID').length;

    return {
      totalReceivables: formatCurrency(totalReceivables),
      unpaidBalance: formatCurrency(unpaidBalance),
      gstCollected: formatCurrency(gstCollected),
      overdueCount
    };
  }, [invoices]);

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page on filter change
  };

  const handleViewInvoice = (invoiceId) => {
    setSelectedInvoiceId(invoiceId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedInvoiceId(null);
  };

  const handleRecordPayment = (invoice) => {
    setSelectedPaymentInvoice(invoice);
    setIsPaymentModalOpen(true);
  };

  const handleClosePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setSelectedPaymentInvoice(null);
  };

  return (
    <DashboardTemplate headerTitle="Invoices" headerTabs={[]}>
      <div className="invoices-page-container">
        {/* Floating Action Button */}
        <div className="floating-actions">
          <div className="fab-container">
            <button 
              className="fab-main" 
              onClick={() => setShowCreateMenu(!showCreateMenu)}
            >
              <Icon name="add" size={24} />
            </button>
            {showCreateMenu && (
              <div className="fab-menu">
                <button 
                  className="fab-item desktop"
                  onClick={() => navigate('/invoices/new')}
                >
                  <Icon name="computer" size={16} />
                  <span>Desktop</span>
                </button>
                <button 
                  className="fab-item mobile"
                  onClick={() => navigate('/invoices/new/mobile')}
                >
                  <Icon name="phone" size={16} />
                  <span>Mobile</span>
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="stats-grid">
          <SummaryCard 
            title="Total Receivables" 
            value={stats.totalReceivables} 
            trend="+12.4%" 
            trendType="up" 
            icon="payments" 
            iconColor="#2563eb" 
          />
          <SummaryCard 
            title="Unpaid Balance" 
            value={stats.unpaidBalance} 
            trend={`${stats.overdueCount} Overdue`} 
            trendType="warning" 
            icon="pending_actions" 
            iconColor="#dc2626" 
          />
          <SummaryCard 
            title="GST Collected (Total)" 
            value={stats.gstCollected} 
            trend="Active" 
            trendType="info" 
            icon="account_balance_wallet" 
            iconColor="#059669" 
          />
        </div>
        
        <InvoiceTable 
          data={invoices}
          isLoading={loading}
          onViewInvoice={handleViewInvoice}
          onRecordPayment={handleRecordPayment}
          pagination={pagination}
          currentPage={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          showItems={showItems}
          onToggleShowItems={() => setShowItems(!showItems)}
          navigate={navigate}
        />
      </div>

      <InvoiceDetailModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        invoiceId={selectedInvoiceId}
        onRecordPayment={handleRecordPayment}
      />

      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={handleClosePaymentModal}
        invoice={selectedPaymentInvoice}
        onRefresh={fetchInvoices}
      />
    </DashboardTemplate>
  );
};

export default InvoicesPage;
