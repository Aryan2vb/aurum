import React, { useState } from 'react';
import DateDisplay from '../../atoms/DateDisplay/DateDisplay';
import AmountDisplay from '../../atoms/AmountDisplay/AmountDisplay';
import PaymentMethodBadge from '../../atoms/PaymentMethodBadge/PaymentMethodBadge';
import Button from '../../atoms/Button/Button';
import Icon from '../../atoms/Icon/Icon';
import './PaymentRow.css';

/**
 * PaymentRow - Display a single payment transaction
 */
const PaymentRow = ({
  payment,
  variant = 'compact',
  showActions = false,
  onEdit,
  onDelete,
  className = '',
  ...props
}) => {
  const [expanded, setExpanded] = useState(false);
  const {
    amount,
    transactionDate,
    paymentMethod,
    referenceNumber,
    collectedBy,
    notes,
  } = payment;

  const variantClass = `payment-row-${variant}`;
  const hasDetails = referenceNumber || collectedBy || notes;

  return (
    <div className={`payment-row ${variantClass} ${className}`} {...props}>
      <div className="payment-row-main">
        <div className="payment-row-date">
          <DateDisplay date={transactionDate} format="relative" size="sm" />
        </div>
        <div className="payment-row-amount">
          <AmountDisplay
            value={amount}
            variant="positive"
            size="md"
            emphasis
          />
        </div>
        <div className="payment-row-method">
          <PaymentMethodBadge method={paymentMethod} size="sm" />
        </div>
        {hasDetails && (
          <Button
            variant="ghost"
            size="small"
            onClick={() => setExpanded(!expanded)}
            className="payment-row-expand"
          >
            <Icon name={expanded ? 'chevronUp' : 'chevronDown'} size={16} />
          </Button>
        )}
        {showActions && (
          <div className="payment-row-actions">
            {onEdit && (
              <Button
                variant="ghost"
                size="small"
                onClick={() => onEdit(payment)}
              >
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="small"
                onClick={() => onDelete(payment)}
              >
                Delete
              </Button>
            )}
          </div>
        )}
      </div>

      {expanded && hasDetails && (
        <div className="payment-row-details">
          {referenceNumber && (
            <div className="payment-row-detail-item">
              <span className="payment-row-detail-label">Reference:</span>
              <span className="payment-row-detail-value">{referenceNumber}</span>
            </div>
          )}
          {collectedBy && (
            <div className="payment-row-detail-item">
              <span className="payment-row-detail-label">Collected by:</span>
              <span className="payment-row-detail-value">{collectedBy}</span>
            </div>
          )}
          {notes && (
            <div className="payment-row-detail-item">
              <span className="payment-row-detail-label">Notes:</span>
              <span className="payment-row-detail-value">{notes}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PaymentRow;
