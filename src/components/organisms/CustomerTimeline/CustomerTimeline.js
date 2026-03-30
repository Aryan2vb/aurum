import React, { useState, useEffect, useMemo } from 'react';
import AmountDisplay from '../../atoms/AmountDisplay/AmountDisplay';
import PaymentMethodBadge from '../../atoms/PaymentMethodBadge/PaymentMethodBadge';
import Icon from '../../atoms/Icon/Icon';
import { getCreditTransactions } from '../../../services/creditsService';
import './CustomerTimeline.css';

const CustomerTimeline = ({ customer, credits = [] }) => {
  const [allPayments, setAllPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' for newest first, 'asc' for oldest first

  useEffect(() => {
    loadAllPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credits]);

  const loadAllPayments = async () => {
    try {
      setLoading(true);
      const paymentPromises = credits.map(async (credit) => {
        try {
          const transactions = await getCreditTransactions(credit.id);
          const payments = Array.isArray(transactions) 
            ? transactions 
            : (transactions?.data || []);
          return payments.map(payment => ({
            ...payment,
            creditId: credit.id,
            creditItemSummary: credit.itemSummary,
          }));
        } catch (err) {
          console.error(`Error loading payments for credit ${credit.id}:`, err);
          return [];
        }
      });
      
      const allPaymentsData = await Promise.all(paymentPromises);
      setAllPayments(allPaymentsData.flat());
    } catch (err) {
      console.error('Error loading payments:', err);
    } finally {
      setLoading(false);
    }
  };

  const events = useMemo(() => {
    const timelineEvents = [];

    // Add credit creation events
    credits.forEach((credit) => {
      timelineEvents.push({
        type: 'credit_created',
        date: credit.creditDate || credit.createdAt,
        title: 'Credit Created',
        description: credit.itemSummary || 'New credit',
        amount: credit.totalAmount,
        creditId: credit.id,
        creditStatus: credit.status,
        icon: 'checkCircle',
        iconColor: '#10b981',
        completed: true,
      });

      // Add status change events
      if (credit.status === 'PAID' && credit.lastPaymentDate) {
        timelineEvents.push({
          type: 'credit_paid',
          date: credit.lastPaymentDate,
          title: 'Credit Fully Paid',
          description: credit.itemSummary || 'Credit fully paid',
          creditId: credit.id,
          icon: 'checkCircle',
          iconColor: '#10b981',
          completed: true,
        });
      } else if (credit.status === 'OVERDUE' && credit.expectedDueDate) {
        const dueDate = new Date(credit.expectedDueDate);
        const now = new Date();
        if (dueDate < now) {
          timelineEvents.push({
            type: 'credit_overdue',
            date: credit.expectedDueDate,
            title: 'Credit Overdue',
            description: `Due date passed for ${credit.itemSummary || 'credit'}`,
            creditId: credit.id,
            icon: 'notification',
            iconColor: '#f59e0b',
            completed: false,
          });
        }
      }
    });

    // Add payment events
    allPayments.forEach((payment) => {
      timelineEvents.push({
        type: 'payment',
        date: payment.transactionDate,
        title: 'Payment Received',
        description: payment.creditItemSummary || 'Payment received',
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        referenceNumber: payment.referenceNumber,
        collectedBy: payment.collectedBy,
        notes: payment.notes,
        creditId: payment.creditId,
        icon: 'checkCircle',
        iconColor: '#10b981',
        completed: true,
      });
    });

    // Sort events by date
    timelineEvents.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    return timelineEvents;
  }, [credits, allPayments, sortOrder]);

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const suffix = day === 1 || day === 21 || day === 31 ? 'st' :
                   day === 2 || day === 22 ? 'nd' :
                   day === 3 || day === 23 ? 'rd' : 'th';
    return `${day}${suffix} ${month}, ${hours}:${minutes}`;
  };

  const groupEventsByDate = (events) => {
    const groups = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const thisWeek = new Date(today);
    thisWeek.setDate(thisWeek.getDate() - 7);

    events.forEach((event) => {
      const eventDate = new Date(event.date);
      eventDate.setHours(0, 0, 0, 0);
      
      let groupKey;
      if (eventDate.getTime() === today.getTime()) {
        groupKey = 'Today';
      } else if (eventDate.getTime() === yesterday.getTime()) {
        groupKey = 'Yesterday';
      } else if (eventDate >= thisWeek) {
        groupKey = 'This Week';
      } else {
        groupKey = eventDate.toLocaleDateString('en-US', { 
          month: 'long', 
          year: 'numeric' 
        });
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(event);
    });

    return groups;
  };

  const groupedEvents = useMemo(() => {
    return groupEventsByDate(events);
  }, [events]);

  if (loading) {
    return (
      <div className="customer-timeline">
        <div className="customer-timeline-loading">Loading timeline...</div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="customer-timeline">
        <div className="customer-timeline-empty">
          <p>No timeline events found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-timeline">
      {/* Sort Toggle */}
      <div className="customer-timeline-controls">
        <button
          className="customer-timeline-sort-btn"
          onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
        >
          <Icon name={sortOrder === 'desc' ? 'chevronDown' : 'chevronUp'} size={14} />
          {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
        </button>
      </div>

      {/* Timeline Events */}
      <div className="customer-timeline-content">
        {Object.entries(groupedEvents).map(([groupKey, groupEvents]) => (
          <div key={groupKey} className="customer-timeline-group">
            <div className="customer-timeline-group-header">
              <h3 className="customer-timeline-group-title">{groupKey}</h3>
              <span className="customer-timeline-group-count">{groupEvents.length} events</span>
            </div>
            <div className="customer-timeline-events">
              {groupEvents.map((event, index) => (
                <div key={`${event.type}-${event.date}-${index}`} className="customer-timeline-event">
                  <div className="customer-timeline-event-marker">
                    <div 
                      className={`customer-timeline-event-icon ${event.completed ? 'customer-timeline-event-icon-completed' : 'customer-timeline-event-icon-pending'}`}
                      style={{ color: event.iconColor }}
                    >
                      <Icon name={event.icon} size={20} />
                    </div>
                  </div>
                  <div className="customer-timeline-event-content">
                    <h4 className="customer-timeline-event-title">{event.title}</h4>
                    <div className="customer-timeline-event-date">{formatDateTime(event.date)}</div>
                    {event.description && (
                      <p className="customer-timeline-event-description">{event.description}</p>
                    )}
                    {event.amount && (
                      <div className="customer-timeline-event-amount">
                        <AmountDisplay
                          value={event.amount}
                          variant={event.type === 'payment' ? 'positive' : 'default'}
                          size="sm"
                          emphasis={event.type === 'payment'}
                        />
                      </div>
                    )}
                    {event.paymentMethod && (
                      <div className="customer-timeline-event-meta">
                        <PaymentMethodBadge method={event.paymentMethod} size="sm" />
                        {event.referenceNumber && (
                          <span className="customer-timeline-event-meta-item">
                            {event.referenceNumber}
                          </span>
                        )}
                        {event.collectedBy && (
                          <span className="customer-timeline-event-meta-item">
                            by {event.collectedBy}
                          </span>
                        )}
                      </div>
                    )}
                    {event.notes && (
                      <div className="customer-timeline-event-notes">
                        <span className="customer-timeline-event-notes-text">{event.notes}</span>
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

export default CustomerTimeline;
