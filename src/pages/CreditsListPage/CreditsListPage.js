import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import DashboardTemplate from '../../components/templates/DashboardTemplate/DashboardTemplate';
import CreditSummaryCard from '../../components/molecules/CreditSummaryCard/CreditSummaryCard';
import CreditListRow from '../../components/molecules/CreditListRow/CreditListRow';
import CreditSkeleton from '../../components/molecules/CreditSkeleton/CreditSkeleton';
import SearchBar from '../../components/molecules/SearchBar/SearchBar';
import RecordPaymentPanel from '../../components/organisms/RecordPaymentPanel/RecordPaymentPanel';
import Button from '../../components/atoms/Button/Button';
import Icon from '../../components/atoms/Icon/Icon';
import { getCredits } from '../../services/creditsService';
import './CreditsListPage.css';

const CreditsListPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [credits, setCredits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Check if viewport is mobile
  const isMobile = window.innerWidth <= 768;
  const [viewMode, setViewMode] = useState(isMobile ? 'list' : 'grid'); // 'list' forced on mobile
  const [filters, setFilters] = useState({
    status: '',
    search: '',
  });
  const [showRecordPaymentPanel, setShowRecordPaymentPanel] = useState(false);
  const [selectedCreditId, setSelectedCreditId] = useState(null);

  useEffect(() => {
    loadCredits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // Refresh credits if navigation state indicates refresh needed
  useEffect(() => {
    if (location.state?.refresh) {
      loadCredits();
      window.history.replaceState({}, document.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const loadCredits = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCredits(filters);
      setCredits(data.data || data || []);
    } catch (err) {
      console.error('Error loading credits:', err);
      setError(err.message || 'Failed to load credits');
    } finally {
      setLoading(false);
    }
  };

  const handleCreditClick = (credit) => {
    navigate(`/credits/${credit.id}`);
  };

  const handleRecordPayment = (credit) => {
    setSelectedCreditId(credit.id);
    setShowRecordPaymentPanel(true);
  };

  const handleCreateCredit = () => {
    navigate('/credits/new');
  };

  const handleSearch = (e) => {
    setFilters((prev) => ({ ...prev, search: e.target.value }));
  };

  const handleFilterChange = (filterName, value) => {
    setFilters((prev) => ({ ...prev, [filterName]: value }));
  };

  return (
    <DashboardTemplate headerTitle="Udhar" headerTabs={[]}>
      <div className="credits-list-page">
        {/* Attio-style Header */}
        <div className="credits-list-header">
          <div className="credits-list-header-left">
            {/* <h1 className="credits-list-title">Udhar</h1> */}
            <div className="credits-list-header-actions">
              <Button
                variant={viewMode === 'grid' ? 'primary' : 'ghost'}
                size="small"
                onClick={() => setViewMode('grid')}
              >
                <Icon name="grid" size={16} />
                Grid
              </Button>
              <Button
                variant={viewMode === 'list' ? 'primary' : 'ghost'}
                size="small"
                onClick={() => setViewMode('list')}
              >
                <Icon name="list" size={16} />
                List
              </Button>
            </div>
          </div>
          <Button variant="primary" onClick={handleCreateCredit}>
            <Icon name="add" size={16} />
            New Udhar
          </Button>
        </div>

        {/* Filters */}
        <div className="credits-list-filters">
          <div className="credits-list-search">
            <SearchBar
              placeholder="Search by customer, item, or reference..."
              value={filters.search}
              onChange={handleSearch}
            />
          </div>
          <div className="credits-list-filter-buttons">
            <Button
              variant={filters.status === 'ACTIVE' ? 'primary' : 'ghost'}
              size="small"
              onClick={() => handleFilterChange('status', filters.status === 'ACTIVE' ? '' : 'ACTIVE')}
            >
              Active
            </Button>
            <Button
              variant={filters.status === 'OVERDUE' ? 'primary' : 'ghost'}
              size="small"
              onClick={() => handleFilterChange('status', filters.status === 'OVERDUE' ? '' : 'OVERDUE')}
            >
              Overdue
            </Button>
            <Button
              variant={filters.status === 'PAID' ? 'primary' : 'ghost'}
              size="small"
              onClick={() => handleFilterChange('status', filters.status === 'PAID' ? '' : 'PAID')}
            >
              Paid
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="credits-list-content">
          {loading ? (
            <CreditSkeleton count={6} />
          ) : error ? (
            <div className="credits-list-error">
              <p>{error}</p>
              <Button variant="primary" onClick={loadCredits}>
                Retry
              </Button>
            </div>
          ) : credits.length === 0 ? (
            <div className="credits-list-empty">
              <p>No credits found</p>
              <Button variant="primary" onClick={handleCreateCredit}>
                Create First Credit
              </Button>
            </div>
          ) : viewMode === 'list' ? (
            <div className="credits-list-table">
              <div className="credits-list-table-header">
                <div className="credits-list-header-cell credits-list-header-customer">Customer</div>
                <div className="credits-list-header-cell credits-list-header-amount">Total</div>
                <div className="credits-list-header-cell credits-list-header-remaining">Remaining</div>
                <div className="credits-list-header-cell credits-list-header-progress">Progress</div>
                <div className="credits-list-header-cell credits-list-header-due">Due Date</div>
                <div className="credits-list-header-cell credits-list-header-status">Status</div>
                <div className="credits-list-header-cell credits-list-header-actions"></div>
              </div>
              <div className="credits-list-table-body">
                {credits.map((credit) => (
                  <CreditListRow
                    key={credit.id}
                    credit={credit}
                    onClick={() => handleCreditClick(credit)}
                    onRecordPayment={handleRecordPayment}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="credits-list-grid">
              {credits.map((credit) => (
                <CreditSummaryCard
                  key={credit.id}
                  credit={credit}
                  onClick={() => handleCreditClick(credit)}
                  onRecordPayment={handleRecordPayment}
                />
              ))}
            </div>
          )}
        </div>

        {/* Record Payment Slide-over */}
        <RecordPaymentPanel
          isOpen={showRecordPaymentPanel}
          onClose={() => {
            setShowRecordPaymentPanel(false);
            setSelectedCreditId(null);
          }}
          creditId={selectedCreditId}
          onSuccess={loadCredits}
        />
      </div>
    </DashboardTemplate>
  );
};

export default CreditsListPage;
