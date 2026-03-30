import React, { useState, useEffect, useCallback } from 'react';
import DashboardTemplate from '../../components/templates/DashboardTemplate/DashboardTemplate';
import ReminderList from '../../components/organisms/ReminderList/ReminderList';
import RecordPaymentPanel from '../../components/organisms/RecordPaymentPanel/RecordPaymentPanel';
import Button from '../../components/atoms/Button/Button';
import { getDueReminders, updateReminderDate } from '../../services/creditsService';
import './RemindersPage.css';

const RemindersPage = () => {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState(7);
  const [showRecordPaymentPanel, setShowRecordPaymentPanel] = useState(false);
  const [selectedCreditId, setSelectedCreditId] = useState(null);

  useEffect(() => {
    loadReminders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  const loadReminders = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getDueReminders(timeRange);
      setReminders(data.data || data || []);
    } catch (err) {
      console.error('Error loading reminders:', err);
      setError(err.message || 'Failed to load reminders');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = useCallback((reminder) => {
    setSelectedCreditId(reminder.creditId);
    setShowRecordPaymentPanel(true);
  }, []);

  const handleReminderUpdate = useCallback(async (creditId, newDate, previousDate) => {
    // Optimistic update
    setReminders(prev =>
      prev.map(r => r.creditId === creditId ? { ...r, nextReminderDate: newDate } : r)
    );

    try {
      await updateReminderDate(creditId, newDate);
    } catch (err) {
      // Revert on error
      setReminders(prev =>
        prev.map(r => r.creditId === creditId ? { ...r, nextReminderDate: previousDate } : r)
      );
      throw err;
    }
  }, []);

  return (
    <DashboardTemplate headerTitle="Reminders" headerTabs={[]}>
      <div className="reminders-page">
        <div className="reminders-page-header">
          <div className="reminders-page-title-section">
            <h1 className="reminders-page-title">Follow-ups</h1>
          </div>
          <div className="reminders-page-filters">
            {[7, 14, 30].map(days => (
              <button
                key={days}
                className={`reminders-filter ${timeRange === days ? 'active' : ''}`}
                onClick={() => setTimeRange(days)}
              >
                {days} days
              </button>
            ))}
          </div>
        </div>

        <div className="reminders-page-content">
          {loading ? (
            <div className="reminders-page-loading">Loading...</div>
          ) : error ? (
            <div className="reminders-page-error">
              <p>{error}</p>
              <Button variant="ghost" size="small" onClick={loadReminders}>Retry</Button>
            </div>
          ) : (
            <ReminderList
              reminders={reminders}
              timeRange={timeRange}
              onReminderUpdate={handleReminderUpdate}
              onRecordPayment={handleRecordPayment}
            />
          )}
        </div>

        <RecordPaymentPanel
          isOpen={showRecordPaymentPanel}
          onClose={() => {
            setShowRecordPaymentPanel(false);
            setSelectedCreditId(null);
          }}
          creditId={selectedCreditId}
          onSuccess={loadReminders}
        />
      </div>
    </DashboardTemplate>
  );
};

export default RemindersPage;
