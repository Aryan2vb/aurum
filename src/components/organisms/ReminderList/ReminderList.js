import React, { useState } from 'react';
import ReminderRow from '../../molecules/ReminderRow/ReminderRow';
import './ReminderList.css';

/**
 * ReminderList - Minimal grouped list of reminders
 */
const ReminderList = ({
  reminders = [],
  onReminderUpdate,
  onRecordPayment,
  timeRange = 7,
  className = '',
}) => {
  const [expandedGroups, setExpandedGroups] = useState({
    overdue: true,
    today: true,
    thisWeek: true,
    later: true,
  });

  const toggleGroup = (key) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Group reminders
  const groupReminders = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    const groups = { overdue: [], today: [], thisWeek: [], later: [] };

    reminders.forEach((r) => {
      const due = new Date(r.expectedDueDate);
      const daysOverdue = r.daysOverdue || 0;

      if (daysOverdue > 0) {
        groups.overdue.push(r);
      } else if (due <= today) {
        groups.today.push(r);
      } else if (due <= weekFromNow) {
        groups.thisWeek.push(r);
      } else {
        groups.later.push(r);
      }
    });

    return groups;
  };

  const groups = groupReminders();

  // Format group amount
  const formatGroupAmount = (items) => {
    const total = items.reduce((sum, r) => sum + (r.remainingAmount || r.remainingBalance || 0), 0);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(total);
  };

  if (reminders.length === 0) {
    return (
      <div className={`reminder-list-empty ${className}`}>
        <p>No reminders due in the next {timeRange} days</p>
      </div>
    );
  }

  const renderGroup = (key, label, items) => {
    if (items.length === 0) return null;

    return (
      <div className={`reminder-group ${key === 'overdue' ? 'reminder-group-overdue' : ''}`} key={key}>
        <button className="reminder-group-header" onClick={() => toggleGroup(key)}>
          <span className="reminder-group-title">
            {label} <span className="reminder-group-count">{items.length}</span>
          </span>
          <span className="reminder-group-meta">
            {formatGroupAmount(items)}
            <span className="reminder-group-toggle">{expandedGroups[key] ? '−' : '+'}</span>
          </span>
        </button>

        {expandedGroups[key] && (
          <div className="reminder-group-items">
            {items.map((r) => (
              <ReminderRow
                key={r.creditId}
                reminder={r}
                onReminderUpdate={onReminderUpdate}
                onRecordPayment={onRecordPayment}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`reminder-list ${className}`}>
      {renderGroup('overdue', 'Overdue', groups.overdue)}
      {renderGroup('today', 'Today', groups.today)}
      {renderGroup('thisWeek', 'This week', groups.thisWeek)}
      {renderGroup('later', 'Later', groups.later)}
    </div>
  );
};

export default ReminderList;
