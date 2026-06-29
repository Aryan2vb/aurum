import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import DashboardTemplate from '../../components/templates/DashboardTemplate/DashboardTemplate';
import CustomerProfileHeader from '../../components/organisms/CustomerProfileHeader/CustomerProfileHeader';
import CustomerCreditSummary from '../../components/organisms/CustomerCreditSummary/CustomerCreditSummary';
import CustomerCreditsList from '../../components/organisms/CustomerCreditsList/CustomerCreditsList';
import CustomerNotes from '../../components/molecules/CustomerNotes/CustomerNotes';
import Tab from '../../components/molecules/Tab/Tab';
import Button from '../../components/atoms/Button/Button';
import Toast from '../../components/atoms/Toast/Toast';
import { getCustomerById } from '../../services/customersService';
import { getCustomerCreditSummary, getCustomerUdhar, getCustomerStatement } from '../../services/creditsService';
import { getAdvanceBalance, getAdvanceLedger } from '../../services/advanceService';
import { getInvoices } from '../../services/invoicesService';
import InvoiceTable from '../../components/organisms/InvoiceTable/InvoiceTable';
import InvoiceDetailModal from '../../components/molecules/InvoiceDetailModal/InvoiceDetailModal';
import RecordPaymentModal from '../../components/molecules/RecordPaymentModal/RecordPaymentModal';
import AdvancePanel from '../../components/organisms/AdvancePanel/AdvancePanel';
import AdvanceLedgerTable from '../../components/molecules/AdvanceLedgerTable/AdvanceLedgerTable';
import AmountDisplay from '../../components/atoms/AmountDisplay/AmountDisplay';
import DateDisplay from '../../components/atoms/DateDisplay/DateDisplay';
import './CustomerProfilePage.css';

const TYPE_LABELS = {
  UDHAR: 'Udhar',
  PAYMENT: 'Payment',
  ADJUSTMENT: 'Adjustment',
  RETURN: 'Return',
  ADVANCE_RECEIVED: 'Advance In',
  ADVANCE_APPLIED: 'Applied',
  ADVANCE_TRANSFER_OUT: 'Transfer Out',
  ADVANCE_TRANSFER_IN: 'Transfer In',
  ADVANCE_REFUND: 'Refunded',
};

/* ── Udhar picker dropdown ── */
const StatementTable = ({ statement }) => {
  if (!statement) return <p className="customer-entries-empty">No statement available.</p>;
  const { statement: rows = [], currentBalance } = statement;
  const balance = parseFloat(currentBalance || 0);
  return (
    <>
      <div className="statement-balance">
        <span className="statement-balance-label">Current Balance</span>
        <AmountDisplay value={Math.abs(balance)} size="lg" emphasis variant={balance < 0 ? 'positive' : 'negative'} />
      </div>
      <div className="ledger-table-scroll">
        <table className="ledger-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th className="ledger-th-amount">Debit</th>
              <th className="ledger-th-amount">Credit</th>
              <th className="ledger-th-amount">Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="ledger-td-date"><DateDisplay date={row.date} format="absolute" size="sm" /></td>
                <td className="ledger-td-desc">{row.description}</td>
                <td className="ledger-td-amount">
                  {parseFloat(row.debit) > 0 ? <AmountDisplay value={row.debit} size="sm" variant="negative" /> : '—'}
                </td>
                <td className="ledger-td-amount">
                  {parseFloat(row.credit) > 0 ? <AmountDisplay value={row.credit} size="sm" variant="positive" /> : '—'}
                </td>
                <td className="ledger-td-amount">
                  <AmountDisplay value={Math.abs(parseFloat(row.balance))} size="sm" variant={parseFloat(row.balance) < 0 ? 'positive' : 'negative'} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

const LedgerTable = ({ entries }) => {  if (!entries.length) return <p className="customer-entries-empty">No ledger entries found.</p>;
  return <LedgerCards entries={entries} getUdhar={(e) => e.udharEntry} getEntry={(e) => e} />;
};

const LedgerCards = ({ entries, getUdhar, getEntry }) => (
  <div className="ledger-table-scroll">
    <table className="ledger-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Type</th>
          <th>Description</th>
          <th className="ledger-th-amount">Amount</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((item) => {
          const entry = getEntry(item);
          const type = entry?.type || 'UDHAR';
          const total = parseFloat(entry?.amount || item.amount || 0);
          return (
            <tr key={item.id}>
              <td className="ledger-td-date">
                <DateDisplay date={item.createdAt} format="absolute" size="sm" />
              </td>
              <td>
                <span className={`ledger-type-pill ledger-type-${type}`}>{TYPE_LABELS[type] || type}</span>
              </td>
              <td className="ledger-td-desc">{entry?.description || '—'}</td>
              <td className="ledger-td-amount">
                <AmountDisplay value={total} size="sm" emphasis variant={type === 'PAYMENT' ? 'positive' : 'negative'} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

const CustomerProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [customer, setCustomer] = useState(null);
  const [creditSummary, setCreditSummary] = useState(null);
  const [credits, setCredits] = useState([]);
  const [statement, setStatement] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [paymentModalInvoice, setPaymentModalInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const tabFromUrl = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  // Advance state
  const [advanceBalance, setAdvanceBalance] = useState(null);
  const [advanceLedger, setAdvanceLedger] = useState([]);
  const [advanceLedgerLoading, setAdvanceLedgerLoading] = useState(false);
  const [showAdvancePanel, setShowAdvancePanel] = useState(false);

  useEffect(() => {
    loadCustomerData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    // Update activeTab when URL param changes
    const tabParam = searchParams.get('tab');
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [searchParams, activeTab]);

  useEffect(() => {
    // Load invoices when switching to invoices tab
    if (activeTab === 'invoices' && invoices.length === 0 && !invoicesLoading) {
      loadInvoices();
    }
    // Load advance ledger when switching to advance tab
    if (activeTab === 'advance' && advanceLedger.length === 0 && !advanceLedgerLoading) {
      loadAdvanceLedger();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const loadCustomerData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [customerData, summaryData, udharData, statementData, advanceData] = await Promise.all([
        getCustomerById(id),
        getCustomerCreditSummary(id),
        getCustomerUdhar(id),
        getCustomerStatement(id),
        getAdvanceBalance(id),
      ]);

      setCustomer(customerData);
      setCreditSummary(summaryData);
      setAdvanceBalance(parseFloat(advanceData?.availableAdvance || 0));
      setStatement(statementData);
      const udharList = Array.isArray(udharData) ? udharData : (udharData?.data || udharData?.entries || []);
      setCredits(udharList.map(u => ({
        ...u,
        totalAmount: u.amount,
        expectedDueDate: u.dueDate,
        itemSummary: u.ledgerEntry?.description || null,
        customer: customerData,
      })));
    } catch (err) {
      console.error('Error loading customer data:', err);
      setError(err.message || 'Failed to load customer profile');
      setToast({ type: 'error', message: 'Failed to load customer profile' });
    } finally {
      setLoading(false);
    }
  };

  const loadAdvanceLedger = async () => {
    try {
      setAdvanceLedgerLoading(true);
      const data = await getAdvanceLedger(id);
      setAdvanceLedger(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading advance ledger:', err);
    } finally {
      setAdvanceLedgerLoading(false);
    }
  };

  const loadInvoices = async () => {
    try {
      setInvoicesLoading(true);
      const response = await getInvoices({
        customerId: id,
        limit: 1000,
        sortBy: 'invoiceDate',
        sortOrder: 'desc',
      });
      
      if (response && response.data) {
        setInvoices(response.data.map(inv => ({
          ...inv,
          remainingBalance: Number(inv.totalAmount) - Number(inv.paidAmount),
        })));
      }
    } catch (err) {
      console.error('Error loading invoices:', err);
      setToast({ type: 'error', message: 'Failed to load invoices' });
    } finally {
      setInvoicesLoading(false);
    }
  };

  const handleRefresh = () => {
    loadCustomerData();
    if (activeTab === 'invoices') {
      loadInvoices();
    }
    if (activeTab === 'advance') {
      loadAdvanceLedger();
    }
  };

  if (loading) {
    return (
      <DashboardTemplate headerTitle="Customer Profile" headerTabs={[]}>
        <div className="customer-profile-page">
          <div className="customer-profile-loading">Loading customer profile...</div>
        </div>
      </DashboardTemplate>
    );
  }

  if (error || !customer) {
    return (
      <DashboardTemplate headerTitle="Customer Profile" headerTabs={[]}>
        <div className="customer-profile-page">
          <div className="customer-profile-error">
            <p>{error || 'Customer not found'}</p>
            <Button variant="primary" onClick={() => navigate('/customers')}>
              Back to Customers
            </Button>
          </div>
        </div>
      </DashboardTemplate>
    );
  }

  const tabs = [
    { id: 'overview',  label: 'Overview' },
    { id: 'invoices',  label: 'Invoices' },
    { id: 'advance',   label: advanceBalance > 0 ? `Advance (₹${advanceBalance.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })})` : 'Advance' },
    { id: 'udhar',     label: 'Udhar' },
    { id: 'statement', label: 'Ledger' },
    // Note: raw 'ledger' tab removed — Statement/Ledger tab shows the same data
    // with running balance which is strictly more useful.
  ];

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  return (
    <DashboardTemplate headerTitle="Customer Profile" headerTabs={[]}>
      <div className="customer-profile-page">
        {toast && (
          <Toast
            type={toast.type}
            message={toast.message}
            onClose={() => setToast(null)}
          />
        )}

        {/* Header */}
        <CustomerProfileHeader
          customer={customer}
          onEdit={() => {
            // TODO: Open edit panel or navigate to edit page
            setToast({ type: 'info', message: 'Edit functionality coming soon' });
          }}
          onNewCredit={() => navigate('/credits/new', { state: { customerId: id, customer } })}
          onContact={() => {
            // TODO: Open contact dialog
            setToast({ type: 'info', message: 'Contact functionality coming soon' });
          }}
        />

        {/* Tabs */}
        <div className="customer-profile-tabs">
          {tabs.map((tab) => (
            <Tab
              key={tab.id}
              label={tab.label}
              active={activeTab === tab.id}
              onClick={() => handleTabChange(tab.id)}
            />
          ))}
        </div>

        {/* Tab Content */}
        <div className="customer-profile-content">
          {activeTab === 'overview' && (
            <div className="customer-profile-tab-panel">
              <CustomerCreditSummary
                customer={customer}
                creditSummary={creditSummary}
                credits={credits}
              />
              <CustomerNotes
                customerId={id}
                customer={customer}
                credits={credits}
                onRefresh={handleRefresh}
              />
            </div>
          )}

          {activeTab === 'invoices' && (
            <div className="customer-profile-tab-panel">
              <InvoiceTable
                embedded
                data={invoices}
                isLoading={invoicesLoading}
                onViewInvoice={(invoiceId) => setSelectedInvoiceId(invoiceId)}
                onRecordPayment={(invoice) => setPaymentModalInvoice(invoice)}
                searchQuery=""
                onSearchChange={() => {}}
                filters={{}}
                onFiltersChange={() => {}}
                showItems={false}
                onToggleShowItems={() => {}}
                navigate={navigate}
              />
            </div>
          )}

          {activeTab === 'advance' && (
            <div className="customer-profile-tab-panel">
              {/* Advance balance summary + action */}
              <div className="customer-advance-header">
                <div className="customer-advance-balance-info">
                  <span className="customer-advance-balance-label">Available Advance Balance</span>
                  <AmountDisplay
                    value={advanceBalance ?? 0}
                    size="xl"
                    emphasis
                    variant={advanceBalance > 0 ? 'positive' : 'neutral'}
                  />
                </div>
                <Button variant="primary" onClick={() => setShowAdvancePanel(true)}>
                  Manage Advance
                </Button>
              </div>
              {/* Advance history table */}
              <AdvanceLedgerTable
                entries={advanceLedger}
                loading={advanceLedgerLoading}
                customerId={id}
                onRefresh={() => { loadCustomerData(); loadAdvanceLedger(); }}
              />
            </div>
          )}

          {activeTab === 'statement' && (
            <div className="customer-profile-tab-panel">
              <p className="customer-ledger-subtitle">
                Complete financial history — every invoice (udhar), payment, and advance movement with running balance.
                Positive balance = customer owes you. Negative = you hold their advance.
              </p>
              <div className="customer-entries-table">
                <StatementTable statement={statement} />
              </div>
            </div>
          )}

          {activeTab === 'udhar' && (
            <div className="customer-profile-tab-panel">
              <CustomerCreditsList
                credits={credits}
                onCreditClick={(credit) => navigate(`/credits/${credit.id}`)}
              />
            </div>
          )}

        </div>

        {/* Invoice Detail Modal */}
        {selectedInvoiceId && (
          <InvoiceDetailModal
            isOpen={!!selectedInvoiceId}
            onClose={() => setSelectedInvoiceId(null)}
            invoiceId={selectedInvoiceId}
            onRecordPayment={(invoice) => {
              setSelectedInvoiceId(null);
              setPaymentModalInvoice(invoice);
            }}
          />
        )}

        {/* Record Payment Modal */}
        {paymentModalInvoice && (
          <RecordPaymentModal
            isOpen={!!paymentModalInvoice}
            onClose={() => setPaymentModalInvoice(null)}
            invoice={paymentModalInvoice}
            onSuccess={() => {
              setPaymentModalInvoice(null);
              loadInvoices();
            }}
          />
        )}

        {/* Advance Panel slide-over */}
        <AdvancePanel
          isOpen={showAdvancePanel}
          onClose={() => setShowAdvancePanel(false)}
          customerId={id}
          customerName={customer?.fullName || 'Customer'}
          onSuccess={() => {
            loadCustomerData();
            loadAdvanceLedger();
          }}
        />
      </div>
    </DashboardTemplate>
  );
};

export default CustomerProfilePage;
