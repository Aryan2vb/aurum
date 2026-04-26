import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardTemplate from '../../components/templates/DashboardTemplate/DashboardTemplate';
import InvoiceDetailModal from '../../components/molecules/InvoiceDetailModal/InvoiceDetailModal';
import RecordPaymentModal from '../../components/molecules/RecordPaymentModal/RecordPaymentModal';
import InvoiceTable from '../../components/organisms/InvoiceTable/InvoiceTable';
import { getInvoices } from '../../services/invoicesService';
import './InvoicesPage.css';


const InvoicesPage = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
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
