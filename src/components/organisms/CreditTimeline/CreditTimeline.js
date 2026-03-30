import React from 'react';
import AmountDisplay from '../../atoms/AmountDisplay/AmountDisplay';
import PaymentMethodBadge from '../../atoms/PaymentMethodBadge/PaymentMethodBadge';
import Icon from '../../atoms/Icon/Icon';
import './CreditTimeline.css';

/**
 * CreditTimeline - Enhanced timeline UI with larger icons and action links
 */
const CreditTimeline = ({
  credit,
  payments = [],
  showPayments = true,
  showReminders = true,
  showNotes = true,
  variant = 'detailed',
  className = '',
  ...props
}) => {
  if (!credit) {
    return (
      <div className={`credit-timeline-empty ${className}`} {...props}>
        No timeline data available
      </div>
    );
  }

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

  const events = [];

  // Credit creation event
  events.push({
    type: 'created',
    date: credit.creditDate || credit.createdAt,
    title: 'Credit Created',
    description: credit.itemSummary || 'New credit',
    amount: credit.totalAmount,
    icon: 'checkCircle',
    iconColor: '#10b981',
    completed: true,
  });

  // Payment events
  if (showPayments && payments.length > 0) {
    payments.forEach((payment) => {
      events.push({
        type: 'payment',
        date: payment.transactionDate,
        title: 'Payment Received',
        description: `Payment via ${payment.paymentMethod}`,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        referenceNumber: payment.referenceNumber,
        collectedBy: payment.collectedBy,
        notes: payment.notes,
        icon: 'checkCircle',
        iconColor: '#10b981',
        completed: true,
        actionLink: payment.id ? 'View payment' : null,
      });
    });
  }

  // Status changes
  if (credit.status === 'PAID' && credit.lastPaymentDate) {
    events.push({
      type: 'status',
      date: credit.lastPaymentDate,
      title: 'Fully Paid',
      description: 'Credit fully paid',
      icon: 'checkCircle',
      iconColor: '#10b981',
      completed: true,
    });
  } else if (credit.status === 'OVERDUE' && credit.expectedDueDate) {
    const dueDate = new Date(credit.expectedDueDate);
    const now = new Date();
    if (dueDate < now) {
      events.push({
        type: 'status',
        date: credit.expectedDueDate,
        title: 'Overdue',
        description: 'Payment due date passed',
        icon: 'notification',
        iconColor: '#f59e0b',
        completed: false,
      });
    }
  }

  // Sort events by date (oldest first for timeline flow - top to bottom)
  events.sort((a, b) => new Date(a.date) - new Date(b.date));

  const variantClass = `credit-timeline-${variant}`;

  return (
    <div className={`credit-timeline ${variantClass} ${className}`} {...props}>
      <div className="credit-timeline-line" />
      {events.map((event, index) => (
        <div key={index} className="credit-timeline-event">
          <div className="credit-timeline-event-marker">
            <div 
              className={`credit-timeline-event-icon ${event.completed ? 'credit-timeline-event-icon-completed' : 'credit-timeline-event-icon-pending'}`}
              style={{ color: event.iconColor }}
            >
              <Icon name={event.icon} size={20} />
            </div>
          </div>
          <div className="credit-timeline-event-content">
            <h4 className="credit-timeline-event-title">{event.title}</h4>
            <div className="credit-timeline-event-date">{formatDateTime(event.date)}</div>
            {event.description && (
              <p className="credit-timeline-event-description">{event.description}</p>
            )}
            {event.amount && (
              <div className="credit-timeline-event-amount">
                <AmountDisplay
                  value={event.amount}
                  variant={event.type === 'payment' ? 'positive' : 'default'}
                  size="sm"
                  emphasis={event.type === 'payment'}
                />
              </div>
            )}
            {event.paymentMethod && (
              <div className="credit-timeline-event-meta">
                <PaymentMethodBadge method={event.paymentMethod} size="sm" />
                {event.referenceNumber && (
                  <span className="credit-timeline-event-meta-item">
                    {event.referenceNumber}
                  </span>
                )}
                {event.collectedBy && (
                  <span className="credit-timeline-event-meta-item">
                    by {event.collectedBy}
                  </span>
                )}
              </div>
            )}
            {event.actionLink && (
              <button 
                type="button"
                className="credit-timeline-event-link" 
                onClick={(e) => {
                  e.preventDefault();
                  // Handle action link click
                }}
              >
                {event.actionLink}
              </button>
            )}
            {event.notes && showNotes && (
              <div className="credit-timeline-event-notes">
                <span className="credit-timeline-event-notes-text">{event.notes}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default CreditTimeline;
