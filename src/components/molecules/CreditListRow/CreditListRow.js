import React from 'react';
import Avatar from '../../atoms/Avatar/Avatar';
import AmountDisplay from '../../atoms/AmountDisplay/AmountDisplay';
import StatusBadge from '../../atoms/StatusBadge/StatusBadge';
import DateDisplay from '../../atoms/DateDisplay/DateDisplay';
import ProgressBar from '../../atoms/ProgressBar/ProgressBar';
import Button from '../../atoms/Button/Button';
import Icon from '../../atoms/Icon/Icon';
import './CreditListRow.css';

/**
 * CreditListRow - Table row view for credits list
 * Compact, information-dense display
 */
const CreditListRow = ({
  credit,
  onClick,
  onRecordPayment,
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

  const customerName = customer?.fullName || customer?.name || 'Unknown Customer';
  const progress = parseFloat(totalAmount) > 0 ? (parseFloat(paidAmount || 0) / parseFloat(totalAmount)) * 100 : 0;

  return (
    <div
      className={`credit-list-row ${className}`}
      onClick={onClick}
      {...props}
    >
      {/* Customer & Item */}
      <div className="credit-list-cell credit-list-cell-customer">
        <Avatar name={customerName} size="sm" />
        <div className="credit-list-customer-info">
          <div className="credit-list-customer-name">{customerName}</div>
          {itemSummary && (
            <div className="credit-list-item">{itemSummary}</div>
          )}
        </div>
      </div>

      {/* Total Amount */}
      <div className="credit-list-cell credit-list-cell-amount">
        <AmountDisplay value={totalAmount} size="sm" />
      </div>

      {/* Remaining Amount */}
      <div className="credit-list-cell credit-list-cell-remaining">
        <AmountDisplay value={remainingAmount} size="sm" emphasis variant="negative" />
      </div>

      {/* Progress */}
      <div className="credit-list-cell credit-list-cell-progress">
        <div className="credit-list-progress-wrapper">
          <ProgressBar
            paid={parseFloat(paidAmount || 0)}
            total={parseFloat(totalAmount)}
            size="sm"
            showLabel={false}
          />
          <span className="credit-list-progress-text">{Math.round(progress)}%</span>
        </div>
      </div>

      {/* Due Date */}
      <div className="credit-list-cell credit-list-cell-due">
        {expectedDueDate ? (
          <div className="credit-list-due-wrapper">
            <DateDisplay date={expectedDueDate} format="relative" size="sm" />
            {daysOverdue > 0 && (
              <span className="credit-list-overdue-badge">{daysOverdue}d</span>
            )}
          </div>
        ) : (
          <span className="credit-list-no-due">—</span>
        )}
      </div>

      {/* Status */}
      <div className="credit-list-cell credit-list-cell-status">
        <StatusBadge status={status} size="sm" />
      </div>

      {/* Actions */}
      <div className="credit-list-cell credit-list-cell-actions">
        {onRecordPayment && (
          <Button
            variant="ghost"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onRecordPayment(credit);
            }}
            className="credit-list-action-btn"
          >
            <Icon name="add" size={14} />
          </Button>
        )}
      </div>
    </div>
  );
};

export default CreditListRow;
