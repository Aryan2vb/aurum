import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardTemplate from '../../components/templates/DashboardTemplate/DashboardTemplate';
import InvoiceDetailModal from '../../components/molecules/InvoiceDetailModal/InvoiceDetailModal';
import RecordPaymentModal from '../../components/molecules/RecordPaymentModal/RecordPaymentModal';
import InvoiceTable from '../../components/organisms/InvoiceTable/InvoiceTable';
import { getInvoices } from '../../services/invoicesService';
import './InvoicesPage.css';

const INVOICE_BATCH_SIZE = 100;

const mapInvoiceForTable = (invoice) => ({
  ...invoice,
  financialDetails: {
    totalAmount: invoice.totalAmount,
    paidAmount: invoice.paidAmount,
    balance: invoice.remainingBalance,
  },
});

const InvoicesPage = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPaymentInvoice, setSelectedPaymentInvoice] = useState(null);
  const [showItems, setShowItems] = useState(false);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState({
    status: null,
    dateFrom: null,
    dateTo: null,
  });

  // Infinite scroll state
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const requestSeqRef = useRef(0);
  const loadingMoreRef = useRef(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchInvoicesPage = useCallback(async (pageToLoad = 1, mode = 'reset') => {
    const isReset = mode === 'reset';
    if (!isReset && loadingMoreRef.current) return;
    const requestSeq = requestSeqRef.current + 1;
    requestSeqRef.current = requestSeq;

    try {
      if (isReset) {
        loadingMoreRef.current = false;
        setLoading(true);
      } else {
        loadingMoreRef.current = true;
        setLoadingMore(true);
      }

      const response = await getInvoices({
        search: debouncedSearch,
        status: filters.status,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        page: pageToLoad,
        limit: INVOICE_BATCH_SIZE,
        sortBy: 'invoiceDate',
        sortOrder: 'desc',
        includeItems: true,
      });

      if (requestSeq !== requestSeqRef.current) return;

      if (response && response.data) {
        const mappedData = response.data.map(mapInvoiceForTable);
        setInvoices((prev) => (isReset ? mappedData : [...prev, ...mappedData]));
        setPagination(response.meta);
        setPage(pageToLoad);
      }
    } catch (error) {
      console.error('Failed to fetch invoices', error);
    } finally {
      if (requestSeq === requestSeqRef.current) {
        if (isReset) {
          setLoading(false);
        } else {
          loadingMoreRef.current = false;
          setLoadingMore(false);
        }
      }
    }
  }, [debouncedSearch, filters]);

  useEffect(() => {
    fetchInvoicesPage(1, 'reset');
  }, [fetchInvoicesPage]);

  const hasMoreInvoices = Boolean(
    pagination && pagination.total > invoices.length && page < pagination.totalPages,
  );

  const handleLoadMore = useCallback(() => {
    if (loading || loadingMore || !hasMoreInvoices) return;
    fetchInvoicesPage(page + 1, 'append');
  }, [fetchInvoicesPage, hasMoreInvoices, loading, loadingMore, page]);

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
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
        <InvoiceTable 
          data={invoices}
          isLoading={loading}
          onViewInvoice={handleViewInvoice}
          onRecordPayment={handleRecordPayment}
          pagination={pagination}
          currentPage={page}
          pageSize={INVOICE_BATCH_SIZE}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          showItems={showItems}
          onToggleShowItems={() => setShowItems(!showItems)}
          infiniteScroll
          isLoadingMore={loadingMore}
          hasMore={hasMoreInvoices}
          onLoadMore={handleLoadMore}
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
        onRefresh={() => fetchInvoicesPage(1, 'reset')}
      />
    </DashboardTemplate>
  );
};

export default InvoicesPage;
