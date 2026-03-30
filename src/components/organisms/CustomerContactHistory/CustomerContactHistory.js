import React, { useMemo } from 'react';
import DateDisplay from '../../atoms/DateDisplay/DateDisplay';
import AmountDisplay from '../../atoms/AmountDisplay/AmountDisplay';
import Icon from '../../atoms/Icon/Icon';
import './CustomerContactHistory.css';

const CustomerContactHistory = ({ customer, credits = [] }) => {
  const contactHistory = useMemo(() => {
    const history = [];

    // Extract from credit creation dates
    credits.forEach((credit) => {
      history.push({
        type: 'credit_created',
        date: credit.creditDate || credit.createdAt,
        title: 'Credit Created',
        description: credit.itemSummary || 'New credit created',
        amount: credit.totalAmount,
        creditId: credit.id,
        icon: 'checkCircle',
        iconColor: '#10b981',
      });
    });

    // Extract from reminder dates (nextReminderDate indicates when reminder was scheduled)
    credits.forEach((credit) => {
      if (credit.nextReminderDate) {
        history.push({
          type: 'reminder',
          date: credit.nextReminderDate,
          title: 'Reminder Scheduled',
          description: `Reminder for ${credit.itemSummary || 'credit'}`,
          creditId: credit.id,
          icon: 'notification',
          iconColor: '#f59e0b',
        });
      }
    });

    // Extract from payment transactions (we'll need to fetch these)
    // For now, we'll use lastPaymentDate as a proxy
    credits.forEach((credit) => {
      if (credit.lastPaymentDate) {
        history.push({
          type: 'payment',
          date: credit.lastPaymentDate,
          title: 'Payment Received',
          description: `Payment for ${credit.itemSummary || 'credit'}`,
          amount: credit.paidAmount,
          creditId: credit.id,
          icon: 'checkCircle',
          iconColor: '#10b981',
        });
      }
    });

    // Sort by date (newest first)
    history.sort((a, b) => new Date(b.date) - new Date(a.date));

    return history;
  }, [credits]);

  const getInteractionTypeLabel = (type) => {
    const labels = {
      credit_created: 'Credit Created',
      reminder: 'Reminder',
      payment: 'Payment',
    };
    return labels[type] || type;
  };

  const getInteractionIcon = (type) => {
    const icons = {
      credit_created: 'checkCircle',
      reminder: 'notification',
      payment: 'checkCircle',
    };
    return icons[type] || 'circle';
  };

  // Group by date - must be called before any early returns
  const groupedHistory = useMemo(() => {
    const groups = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const thisWeek = new Date(today);
    thisWeek.setDate(thisWeek.getDate() - 7);
    const thisMonth = new Date(today);
    thisMonth.setMonth(thisMonth.getMonth() - 1);

    contactHistory.forEach((item) => {
      const itemDate = new Date(item.date);
      itemDate.setHours(0, 0, 0, 0);
      
      let groupKey;
      if (itemDate.getTime() === today.getTime()) {
        groupKey = 'Today';
      } else if (itemDate.getTime() === yesterday.getTime()) {
        groupKey = 'Yesterday';
      } else if (itemDate >= thisWeek) {
        groupKey = 'This Week';
      } else if (itemDate >= thisMonth) {
        groupKey = 'This Month';
      } else {
        groupKey = itemDate.toLocaleDateString('en-US', { 
          month: 'long', 
          year: 'numeric' 
        });
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
    });

    return groups;
  }, [contactHistory]);

  if (contactHistory.length === 0) {
    return (
      <div className="customer-contact-history">
        <div className="customer-contact-history-empty">
          <p>No contact history found</p>
          <span className="customer-contact-history-empty-hint">
            Contact history is derived from credits, payments, and reminders
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-contact-history">
      <div className="customer-contact-history-header">
        <h2 className="customer-contact-history-title">Contact History</h2>
        <span className="customer-contact-history-count">
          {contactHistory.length} interactions
        </span>
      </div>

      <div className="customer-contact-history-content">
        {Object.entries(groupedHistory).map(([groupKey, items]) => (
          <div key={groupKey} className="customer-contact-history-group">
            <div className="customer-contact-history-group-header">
              <h3 className="customer-contact-history-group-title">{groupKey}</h3>
              <span className="customer-contact-history-group-count">{items.length}</span>
            </div>
            <div className="customer-contact-history-items">
              {items.map((item, index) => (
                <div 
                  key={`${item.type}-${item.date}-${index}`} 
                  className="customer-contact-history-item"
                >
                  <div className="customer-contact-history-item-icon">
                    <Icon 
                      name={getInteractionIcon(item.type)} 
                      size={16}
                      style={{ color: item.iconColor }}
                    />
                  </div>
                  <div className="customer-contact-history-item-content">
                    <div className="customer-contact-history-item-header">
                      <span className="customer-contact-history-item-type">
                        {getInteractionTypeLabel(item.type)}
                      </span>
                      <DateDisplay date={item.date} format="relative" size="sm" />
                    </div>
                    <p className="customer-contact-history-item-description">
                      {item.description}
                    </p>
                    {item.amount && (
                      <div className="customer-contact-history-item-amount">
                        <AmountDisplay value={item.amount} size="sm" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CustomerContactHistory;
