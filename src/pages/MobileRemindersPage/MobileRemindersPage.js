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

  const handleReschedule = async (creditId, currentDate, newDate) => {
    setReminders(prev =>
      prev.map(r => r.creditId === creditId ? { ...r, nextReminderDate: newDate } : r)
    );
    try {
      await updateReminderDate(creditId, newDate);
    } catch (err) {
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
    if (days < 0) return 'is-overdue';
    if (days === 0) return 'is-today';
    if (days <= 3) return 'is-soon';
    return '';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'No date';
    const days = getDaysUntil(dateStr);
    if (days === 0) return 'Due today';
    if (days === 1) return 'Tomorrow';
    if (days === -1) return 'Yesterday';
    if (days < 0) return `${Math.abs(days)} days overdue`;
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  return (
    <MobileTemplate title="Reminders">
      <div className="mobile-reminders">
        {/* Filter Pills */}
        <div className="mobile-reminders-filters">
          {TIME_RANGES.map(days => (
            <button
              key={days}
              className={`reminder-filter-pill ${timeRange === days ? 'active' : ''}`}
              onClick={() => setTimeRange(days)}
            >
              {days} Days
            </button>
          ))}
        </div>

        {/* List Content */}
        {loading ? (
          <div className="mobile-loading-shimmer">
            {[1, 2, 3].map(i => <div key={i} className="shimmer-item" />)}
          </div>
        ) : error ? (
          <div className="mobile-empty-state">
            <Icon name="notification" size={48} color="var(--color-error)" />
            <p>{error}</p>
            <button className="mobile-empty-button" onClick={loadReminders}>Retry</button>
          </div>
        ) : reminders.length === 0 ? (
          <div className="mobile-empty-state">
            <div className="empty-icon">
              <Icon name="checkCircle" size={48} color="var(--color-success)" />
            </div>
            <h3>All Caught Up!</h3>
            <p>No reminders for the next {timeRange} days.</p>
          </div>
        ) : (
          <div className="mobile-reminders-list">
            {reminders.map((reminder) => {
              const days = getDaysUntil(reminder.nextReminderDate);
              const urgency = getUrgencyClass(days);
              return (
                <div key={reminder.creditId} className={`mobile-reminder-card glass-panel ${urgency}`}>
                  <div className="card-top">
                    <div className="customer-meta">
                      <div className="customer-avatar">
                        {(reminder.customerName || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="customer-info">
                        <span className="customer-name">{reminder.customerName || 'Unknown'}</span>
                        <span className="due-date-meta">{formatDate(reminder.nextReminderDate)}</span>
                      </div>
                    </div>
                    <div className="reminder-amount">
                      ₹{(Number(reminder.outstandingAmount) || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                  
                  <div className="card-actions">
                    <a href={`/credits/${reminder.creditId}`} className="action-btn secondary">
                      <Icon name="customer" size={16} />
                      <span>Profile</span>
                    </a>
                    <button
                      className="action-btn tertiary"
                      onClick={() => {
                        const newDate = new Date();
                        newDate.setDate(newDate.getDate() + 7);
                        handleReschedule(reminder.creditId, reminder.nextReminderDate, newDate.toISOString().slice(0, 10));
                      }}
                    >
                      <Icon name="add" size={16} />
                      <span>+7 Days</span>
                    </button>
                    <a href={`/credits/${reminder.creditId}/payment`} className="action-btn primary">
                      <Icon name="dollar" size={16} color="white" />
                      <span>Pay</span>
                    </a>
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


// export default MobileRemindersPage;