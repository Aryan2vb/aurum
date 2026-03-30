import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardTemplate from '../../components/templates/DashboardTemplate/DashboardTemplate';
import CustomerProfileHeader from '../../components/organisms/CustomerProfileHeader/CustomerProfileHeader';
import CustomerCreditSummary from '../../components/organisms/CustomerCreditSummary/CustomerCreditSummary';
import CustomerCreditsList from '../../components/organisms/CustomerCreditsList/CustomerCreditsList';
import CustomerTimeline from '../../components/organisms/CustomerTimeline/CustomerTimeline';
import CustomerContactHistory from '../../components/organisms/CustomerContactHistory/CustomerContactHistory';
import CustomerNotes from '../../components/molecules/CustomerNotes/CustomerNotes';
import Tab from '../../components/molecules/Tab/Tab';
import Button from '../../components/atoms/Button/Button';
import Toast from '../../components/atoms/Toast/Toast';
import { getCustomerById } from '../../services/customersService';
import { getCustomerCredits } from '../../services/customersService';
import { getCustomerCreditSummary } from '../../services/creditsService';
import './CustomerProfilePage.css';

const CustomerProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [credits, setCredits] = useState([]);
  const [creditSummary, setCreditSummary] = useState(null);
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
      
      const [customerData, creditsData, summaryData] = await Promise.all([
        getCustomerById(id),
        getCustomerCredits(id),
        getCustomerCreditSummary(id),
      ]);
      
      setCustomer(customerData);
      
      // Handle different response formats for credits
      const creditsList = Array.isArray(creditsData) 
        ? creditsData 
        : (creditsData?.data || creditsData?.credits || []);
      setCredits(creditsList);
      
      setCreditSummary(summaryData);
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
    { id: 'credits', label: 'Credits' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'history', label: 'History' },
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
          onNewCredit={() => navigate(`/credits/new?customerId=${id}`)}
          onRecordPayment={() => {
            // TODO: Open record payment panel
            setToast({ type: 'info', message: 'Record payment functionality coming soon' });
          }}
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

          {activeTab === 'credits' && (
            <div className="customer-profile-tab-panel">
              <CustomerCreditsList
                credits={credits}
                onCreditClick={(credit) => navigate(`/credits/${credit.id}`)}
                onRecordPayment={(credit) => navigate(`/credits/${credit.id}/payment`)}
              />
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="customer-profile-tab-panel">
              <CustomerTimeline
                customer={customer}
                credits={credits}
              />
            </div>
          )}

          {activeTab === 'history' && (
            <div className="customer-profile-tab-panel">
              <CustomerContactHistory
                customer={customer}
                credits={credits}
              />
            </div>
          )}
        </div>
      </div>
    </DashboardTemplate>
  );
};

export default CustomerProfilePage;
