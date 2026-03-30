import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardTemplate from '../../components/templates/DashboardTemplate/DashboardTemplate';
import CreditTimeline from '../../components/organisms/CreditTimeline/CreditTimeline';
import TimelineSkeleton from '../../components/organisms/TimelineSkeleton/TimelineSkeleton';
import PaymentRow from '../../components/molecules/PaymentRow/PaymentRow';
import AmountDisplay from '../../components/atoms/AmountDisplay/AmountDisplay';
import StatusBadge from '../../components/atoms/StatusBadge/StatusBadge';
import DateDisplay from '../../components/atoms/DateDisplay/DateDisplay';
import ProgressBar from '../../components/atoms/ProgressBar/ProgressBar';
import Button from '../../components/atoms/Button/Button';
import Avatar from '../../components/atoms/Avatar/Avatar';
import SlideOver from '../../components/atoms/SlideOver/SlideOver';
import DeleteConfirmationDialog from '../../components/atoms/DeleteConfirmationDialog/DeleteConfirmationDialog';
import PaymentEditPanel from '../../components/organisms/PaymentEditPanel/PaymentEditPanel';
import CreditEditPanel from '../../components/organisms/CreditEditPanel/CreditEditPanel';
import RecordPaymentPanel from '../../components/organisms/RecordPaymentPanel/RecordPaymentPanel';
import { getCreditById, getCreditTransactions, deleteCredit, deletePaymentTransaction } from '../../services/creditsService';
import Toast from '../../components/atoms/Toast/Toast';
import Icon from '../../components/atoms/Icon/Icon';
import './CreditDetailPage.css';

const CreditDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [credit, setCredit] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  
  // Slide-over states
  const [showTimelinePanel, setShowTimelinePanel] = useState(false);
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [showRecordPaymentPanel, setShowRecordPaymentPanel] = useState(false);
  const [showPaymentEditPanel, setShowPaymentEditPanel] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPaymentDeleteConfirm, setShowPaymentDeleteConfirm] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadCreditData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadCreditData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [creditData, transactionsData] = await Promise.all([
        getCreditById(id),
        getCreditTransactions(id),
      ]);
      setCredit(creditData);
      setPayments(transactionsData.data || transactionsData || []);
    } catch (err) {
      console.error('Error loading credit:', err);
      setError(err.message || 'Failed to load credit details');
      setToast({ type: 'error', message: 'Failed to load credit details' });
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = () => {
    setShowRecordPaymentPanel(true);
  };

  const handleEdit = () => {
    setShowEditPanel(true);
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteCredit(id);
      setToast({ type: 'success', message: 'Credit deleted successfully' });
      setTimeout(() => {
        navigate('/credits');
      }, 1000);
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to delete credit' });
      setIsDeleting(false);
    }
    setShowDeleteConfirm(false);
  };

  const handlePaymentEdit = (payment) => {
    setShowPaymentEditPanel(payment);
  };

  const handlePaymentDelete = async (payment) => {
    try {
      setIsDeleting(true);
      await deletePaymentTransaction(id, payment.id);
      setToast({ type: 'success', message: 'Payment deleted successfully' });
      setShowPaymentDeleteConfirm(null);
      loadCreditData();
    } catch (err) {
      console.error('Error deleting payment:', err);
      setToast({ type: 'error', message: err.message || 'Failed to delete payment' });
    } finally {
      setIsDeleting(false);
      setShowPaymentDeleteConfirm(null);
    }
  };

  if (loading) {
    return (
      <DashboardTemplate headerTitle="Credit Details" headerTabs={[]}>
        <div className="credit-detail-page">
          <div className="credit-detail-loading">Loading credit details...</div>
        </div>
      </DashboardTemplate>
    );
  }

  if (error || !credit) {
    return (
      <DashboardTemplate headerTitle="Credit Details" headerTabs={[]}>
        <div className="credit-detail-page">
          <div className="credit-detail-error">
            <p>{error || 'Credit not found'}</p>
            <Button variant="primary" onClick={() => navigate('/credits')}>
              Back to Credits
            </Button>
          </div>
        </div>
      </DashboardTemplate>
    );
  }

  const customerName = credit.customer?.fullName || credit.customer?.name || 'Unknown Customer';
  const itemSummary = credit.itemSummary || credit.description || 'No description';
  const remainingAmount = parseFloat(credit.totalAmount) - parseFloat(credit.paidAmount || 0);
  const daysOverdue = credit.expectedDueDate
    ? Math.max(0, Math.floor((new Date() - new Date(credit.expectedDueDate)) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <DashboardTemplate headerTitle="Credit Details" headerTabs={[]}>
      <div className="credit-detail-page">
        {toast && (
          <Toast
            type={toast.type}
            message={toast.message}
            onClose={() => setToast(null)}
          />
        )}

        {/* Attio-style Header */}
        <div className="credit-detail-header">
          <div className="credit-detail-header-main">
            <Button variant="ghost" size="small" onClick={() => navigate('/credits')}>
              ← Back
            </Button>
            <div className="credit-detail-identity">
              <Avatar name={customerName} size="lg" />
              <div className="credit-detail-identity-info">
                <h1 className="credit-detail-title">{customerName}</h1>
                <div className="credit-detail-meta">
                  <span className="credit-detail-item-text">{itemSummary}</span>
                  {credit.saleReference && (
                    <>
                      <span className="credit-detail-meta-dot">·</span>
                      <span className="credit-detail-meta-text">{credit.saleReference}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="credit-detail-header-actions">
            <Button variant="ghost" size="small" onClick={() => setShowTimelinePanel(true)}>
              <Icon name="dashboard" size={16} />
              Timeline
            </Button>
            <Button variant="primary" onClick={handleRecordPayment}>
              Record Payment
            </Button>
            <Button variant="ghost" onClick={handleEdit}>
              Edit
            </Button>
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(true)}>
              Delete
            </Button>
          </div>
        </div>

        {/* Main Content - Attio Style */}
        <div className="credit-detail-content">
          {/* Left Column - Main Details */}
          <div className="credit-detail-main">
            {/* Key Metrics Card */}
            <div className="credit-detail-card">
              <div className="credit-detail-card-header">
                <h2 className="credit-detail-card-title">Overview</h2>
              </div>
              <div className="credit-detail-metrics">
                <div className="credit-detail-metric">
                  <span className="credit-detail-metric-label">Total Amount</span>
                  <AmountDisplay value={credit.totalAmount} size="xl" emphasis />
                </div>
                <div className="credit-detail-metric">
                  <span className="credit-detail-metric-label">Paid</span>
                  <AmountDisplay value={credit.paidAmount || 0} size="xl" variant="positive" />
                </div>
                <div className="credit-detail-metric">
                  <span className="credit-detail-metric-label">Remaining</span>
                  <AmountDisplay value={remainingAmount} size="xl" emphasis variant="negative" />
                </div>
                <div className="credit-detail-metric">
                  <span className="credit-detail-metric-label">Status</span>
                  <StatusBadge status={credit.status} size="md" />
                </div>
              </div>
              <div className="credit-detail-progress">
                <ProgressBar
                  paid={parseFloat(credit.paidAmount || 0)}
                  total={parseFloat(credit.totalAmount)}
                  showLabel
                  size="md"
                />
              </div>
            </div>

            {/* Details Card */}
            <div className="credit-detail-card">
              <div className="credit-detail-card-header">
                <h2 className="credit-detail-card-title">Details</h2>
              </div>
              <div className="credit-detail-details-grid">
                <div className="credit-detail-detail-item">
                  <span className="credit-detail-detail-label">Credit Date</span>
                  <DateDisplay date={credit.creditDate || credit.createdAt} format="absolute" />
                </div>
                {credit.expectedDueDate && (
                  <div className="credit-detail-detail-item">
                    <span className="credit-detail-detail-label">Due Date</span>
                    <div className="credit-detail-detail-value-group">
                      <DateDisplay date={credit.expectedDueDate} format="both" />
                      {daysOverdue > 0 && (
                        <span className="credit-detail-overdue-indicator">
                          {daysOverdue} days overdue
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {credit.saleReference && (
                  <div className="credit-detail-detail-item">
                    <span className="credit-detail-detail-label">Sale Reference</span>
                    <span className="credit-detail-detail-value">{credit.saleReference}</span>
                  </div>
                )}
                {credit.reminderFrequency && (
                  <div className="credit-detail-detail-item">
                    <span className="credit-detail-detail-label">Reminder Frequency</span>
                    <span className="credit-detail-detail-value">{credit.reminderFrequency}</span>
                  </div>
                )}
              </div>
              {credit.description && (
                <div className="credit-detail-description">
                  <h3 className="credit-detail-description-title">Description</h3>
                  <p className="credit-detail-description-text">{credit.description}</p>
                </div>
              )}
              {credit.notes && (
                <div className="credit-detail-notes">
                  <h3 className="credit-detail-notes-title">Notes</h3>
                  <p className="credit-detail-notes-text">{credit.notes}</p>
                </div>
              )}
            </div>

            {/* Payment History Card */}
            <div className="credit-detail-card">
              <div className="credit-detail-card-header">
                <h2 className="credit-detail-card-title">Payment History</h2>
                <span className="credit-detail-card-count">{payments.length}</span>
              </div>
              {payments.length === 0 ? (
                <div className="credit-detail-empty-state">
                  <p className="credit-detail-empty-text">No payments recorded yet</p>
                  <Button variant="primary" size="small" onClick={handleRecordPayment}>
                    Record First Payment
                  </Button>
                </div>
              ) : (
                <div className="credit-detail-payments-list">
                  {payments.map((payment) => (
                    <div key={payment.id} className="credit-detail-payment-item">
                      <PaymentRow
                        payment={payment}
                        variant="detailed"
                        showActions
                        onEdit={() => handlePaymentEdit(payment)}
                        onDelete={() => setShowPaymentDeleteConfirm(payment)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Timeline Slide-over - Smaller width */}
        <SlideOver
          isOpen={showTimelinePanel}
          onClose={() => setShowTimelinePanel(false)}
          title="Timeline"
          width={450}
        >
          {credit ? (
            <CreditTimeline credit={credit} payments={payments} variant="detailed" />
          ) : (
            <TimelineSkeleton />
          )}
        </SlideOver>

        {/* Credit Edit Slide-over */}
        <CreditEditPanel
          isOpen={showEditPanel}
          onClose={() => setShowEditPanel(false)}
          creditId={id}
          credit={credit}
          onSuccess={loadCreditData}
        />

        {/* Record Payment Slide-over */}
        <RecordPaymentPanel
          isOpen={showRecordPaymentPanel}
          onClose={() => setShowRecordPaymentPanel(false)}
          creditId={id}
          credit={credit}
          onSuccess={loadCreditData}
        />

        {/* Payment Edit Slide-over */}
        <PaymentEditPanel
          isOpen={!!showPaymentEditPanel}
          onClose={() => setShowPaymentEditPanel(null)}
          credit={credit}
          payment={showPaymentEditPanel}
          onSuccess={loadCreditData}
        />

        {/* Delete Confirmations */}
        <DeleteConfirmationDialog
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
          title="Delete Credit?"
          message={
            <>
              This will permanently delete the credit for{' '}
              <span className="delete-confirmation-item-name">{customerName}</span>.
              This action cannot be undone.
            </>
          }
          isDeleting={isDeleting}
        />

        <DeleteConfirmationDialog
          isOpen={!!showPaymentDeleteConfirm}
          onClose={() => setShowPaymentDeleteConfirm(null)}
          onConfirm={() => handlePaymentDelete(showPaymentDeleteConfirm)}
          title="Delete Payment?"
          message={
            <>
              This will delete the payment of{' '}
              <span className="delete-confirmation-item-name">
                <AmountDisplay value={showPaymentDeleteConfirm?.amount} />
              </span>
              . The credit balance will be updated. This action cannot be undone.
            </>
          }
          isDeleting={isDeleting}
        />
      </div>
    </DashboardTemplate>
  );
};

export default CreditDetailPage;
