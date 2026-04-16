import React, { useState, useEffect, useCallback } from 'react';
import MobileTemplate from '../../components/templates/MobileTemplate/MobileTemplate';
import Icon from '../../components/atoms/Icon/Icon';
import { getDueReminders, updateReminderDate } from '../../services/creditsService';
import './MobileRemindersPage.css';

const TIME_RANGES = [7, 14, 30];

const MobileRemindersPage = () => {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState(7);
  const [showPaymentPanel, setShowPaymentPanel] = useState(false);
  const [selectedCreditId, setSelectedCreditId] = useState(null);

  const loadReminders = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getDueReminders(timeRange);
      setReminders(data?.data || data || []);
    } catch (err) {
      console.error('Error loading reminders:', err);
      setError(err.message || 'Failed to load reminders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReminders(); }, [timeRange]);

  const handleRecordPayment = (reminder) => {
    setSelectedCreditId(reminder.creditId);
    setShowPaymentPanel(true);
  };

  const handleReschedule = async (creditId, currentDate, newDate) => {
    // Optimistic update
    setReminders(prev =>
      prev.map(r => r.creditId === creditId ? { ...r, nextReminderDate: newDate } : r)
    );
    try {
      await updateReminderDate(creditId, newDate);
    } catch (err) {
      // Revert on error
      setReminders(prev =>
        prev.map(r => r.creditId === creditId ? { ...r, nextReminderDate: currentDate } : r)
      );
    }
  };

  const getDaysUntil = (date) => {
    if (!date) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
  };

  const getUrgencyClass = (days) => {
    if (days === null) return '';
    if (days < 0) return 'overdue';
    if (days === 0) return 'today';
    if (days <= 3) return 'soon';
    return '';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'No date';
    const days = getDaysUntil(dateStr);
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days === -1) return 'Yesterday';
    if (days < 0) return `${Math.abs(days)} days overdue`;
    if (days <= 7) return `In ${days} days`;
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  return (
    <MobileTemplate title="Reminders">
      <div className="mobile-reminders">
        {/* Time Range Filter */}
        <div className="mobile-reminders-filters">
          {TIME_RANGES.map(days => (
            <button
              key={days}
              className={`mobile-reminders-filter ${timeRange === days ? 'active' : ''}`}
              onClick={() => setTimeRange(days)}
            >
              {days} days
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="mobile-loading">Loading...</div>
        ) : error ? (
          <div className="mobile-error">
            <p>{error}</p>
            <button onClick={loadReminders}>Retry</button>
          </div>
        ) : reminders.length === 0 ? (
          <div className="mobile-empty">
            <div className="mobile-empty__icon">📋</div>
            <p>No reminders in the next {timeRange} days</p>
          </div>
        ) : (
          <div className="mobile-reminders-list">
            {reminders.map((reminder) => {
              const days = getDaysUntil(reminder.nextReminderDate);
              const urgency = getUrgencyClass(days);
              return (
                <div key={reminder.creditId} className={`mobile-reminder-card ${urgency}`}>
                  <div className="mobile-reminder-card__left">
                    <div className="mobile-reminder-card__avatar">
                      {(reminder.customerName || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="mobile-reminder-card__info">
                      <span className="mobile-reminder-card__name">
                        {reminder.customerName || 'Unknown'}
                      </span>
                      <span className="mobile-reminder-card__phone">
                        {reminder.phone || 'No phone'}
                      </span>
                      <span className="mobile-reminder-card__date">
                        {formatDate(reminder.nextReminderDate)}
                      </span>
                    </div>
                  </div>
                  <div className="mobile-reminder-card__right">
                    <span className="mobile-reminder-card__amount">
                      ₹{(Number(reminder.outstandingAmount) || 0).toLocaleString('en-IN')}
                    </span>
                    <div className="mobile-reminder-card__actions">
                      <button
                        className="mobile-reminder-card__action mobile-reminder-card__action--pay"
                        onClick={() => handleRecordPayment(reminder)}
                      >
                        Pay
                      </button>
                      <button
                        className="mobile-reminder-card__action mobile-reminder-card__action--later"
                        onClick={() => {
                          const newDate = new Date();
                          newDate.setDate(newDate.getDate() + 7);
                          handleReschedule(reminder.creditId, reminder.nextReminderDate, newDate.toISOString().slice(0, 10));
                        }}
                      >
                        +7 days
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MobileTemplate>
  );
};

export default MobileRemindersPage;