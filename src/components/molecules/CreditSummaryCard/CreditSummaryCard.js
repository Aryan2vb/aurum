import React from 'react';
import Avatar from '../../atoms/Avatar/Avatar';
import AmountDisplay from '../../atoms/AmountDisplay/AmountDisplay';
import StatusBadge from '../../atoms/StatusBadge/StatusBadge';
import ProgressBar from '../../atoms/ProgressBar/ProgressBar';
import DateDisplay from '../../atoms/DateDisplay/DateDisplay';
import Button from '../../atoms/Button/Button';
import './CreditSummaryCard.css';

/**
 * CreditSummaryCard - Compact view of a credit with key info
 */
const CreditSummaryCard = ({
  credit,
  onClick,
  onRecordPayment,
  variant = 'compact',
  className = '',
  ...props
}) => {
  const {
    customer,
    itemSummary,
    totalAmount,
    paidAmount,
    remainingAmount: providedRemainingAmount,
    expectedDueDate,
    status,
    daysOverdue: providedDaysOverdue,
  } = credit;

  // Calculate remaining amount if not provided
  const remainingAmount = providedRemainingAmount || (parseFloat(totalAmount) - parseFloat(paidAmount || 0));
  
  // Calculate days overdue if not provided
  const daysOverdue = providedDaysOverdue || (expectedDueDate
    ? Math.max(0, Math.floor((new Date() - new Date(expectedDueDate)) / (1000 * 60 * 60 * 24)))
    : 0);

  const variantClass = `credit-card-${variant}`;

  return (
    <div
      className={`credit-summary-card ${variantClass} ${className}`}
      onClick={onClick}
      {...props}
    >
      <div className="credit-card-header">
        <div className="credit-card-customer">
          <Avatar name={customer?.fullName || customer?.name || 'Unknown'} size="sm" />
          <div className="credit-card-customer-info">
            <span className="credit-card-customer-name">{customer?.fullName || customer?.name || 'Unknown Customer'}</span>
            {itemSummary && (
              <span className="credit-card-item">{itemSummary}</span>
            )}
          </div>
        </div>
        <StatusBadge status={status} size="sm" />
      </div>

      <div className="credit-card-amounts">
        <div className="credit-card-amount-row">
          <span className="credit-card-label">Total:</span>
          <AmountDisplay value={totalAmount} size="md" />
        </div>
        <div className="credit-card-amount-row">
          <span className="credit-card-label">Remaining:</span>
          <AmountDisplay
            value={remainingAmount}
            size="md"
            emphasis
            variant="negative"
          />
        </div>
      </div>

      <div className="credit-card-progress">
        <ProgressBar
          paid={paidAmount}
          total={totalAmount}
          showLabel={variant === 'detailed'}
          size="sm"
        />
      </div>

      {expectedDueDate && (
        <div className="credit-card-due-date">
          <DateDisplay
            date={expectedDueDate}
            format="relative"
            size="sm"
          />
          {daysOverdue > 0 && (
            <span className="credit-card-overdue">
              ({daysOverdue} days overdue)
            </span>
          )}
        </div>
      )}

      <div className="credit-card-actions">
        {onRecordPayment && (
          <Button
            variant="primary"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onRecordPayment(credit);
            }}
          >
            Record Payment
          </Button>
        )}
        {onClick && (
          <Button
            variant="ghost"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onClick(credit);
            }}
          >
            View Details
          </Button>
        )}
      </div>
    </div>
  );
};

export default CreditSummaryCard;
