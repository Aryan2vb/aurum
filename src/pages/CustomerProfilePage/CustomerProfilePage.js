import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardTemplate from '../../components/templates/DashboardTemplate/DashboardTemplate';
import CustomerProfileHeader from '../../components/organisms/CustomerProfileHeader/CustomerProfileHeader';
import CustomerCreditSummary from '../../components/organisms/CustomerCreditSummary/CustomerCreditSummary';
import CustomerCreditsList from '../../components/organisms/CustomerCreditsList/CustomerCreditsList';
import CustomerNotes from '../../components/molecules/CustomerNotes/CustomerNotes';
import Tab from '../../components/molecules/Tab/Tab';
import Button from '../../components/atoms/Button/Button';
import Toast from '../../components/atoms/Toast/Toast';
import { getCustomerById } from '../../services/customersService';
import { getCustomerCreditSummary, getCustomerLedger, getCustomerUdhar, getCustomerStatement } from '../../services/creditsService';
import AmountDisplay from '../../components/atoms/AmountDisplay/AmountDisplay';
import DateDisplay from '../../components/atoms/DateDisplay/DateDisplay';
import './CustomerProfilePage.css';

const TYPE_LABELS = { UDHAR: 'Udhar', PAYMENT: 'Payment', ADJUSTMENT: 'Adjustment' };

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
  const [customer, setCustomer] = useState(null);
  const [creditSummary, setCreditSummary] = useState(null);
  const [credits, setCredits] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadCustomerData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadCustomerData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [customerData, summaryData, ledgerData, udharData, statementData] = await Promise.all([
        getCustomerById(id),
        getCustomerCreditSummary(id),
        getCustomerLedger(id),
        getCustomerUdhar(id),
        getCustomerStatement(id),
      ]);

      setCustomer(customerData);
      setCreditSummary(summaryData);
      setLedger(Array.isArray(ledgerData) ? ledgerData : (ledgerData?.data || ledgerData?.entries || []));
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

  const handleRefresh = () => {
    loadCustomerData();
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
    { id: 'overview', label: 'Overview' },
    { id: 'udhar', label: 'Udhar' },
    { id: 'ledger', label: 'Ledger' },
    { id: 'statement', label: 'Statement' },
  ];

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
              onClick={() => setActiveTab(tab.id)}
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

          {activeTab === 'ledger' && (
            <div className="customer-profile-tab-panel">
              <div className="customer-entries-table">
                <LedgerTable entries={ledger} />
              </div>
            </div>
          )}

          {activeTab === 'statement' && (
            <div className="customer-profile-tab-panel">
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
      </div>
    </DashboardTemplate>
  );
};

export default CustomerProfilePage;
