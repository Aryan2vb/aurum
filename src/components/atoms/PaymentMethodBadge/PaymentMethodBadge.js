import React from 'react';
import './PaymentMethodBadge.css';

/**
 * PaymentMethodBadge - Display payment method used
 */
const PaymentMethodBadge = ({
  method,
  size = 'md',
  className = '',
  ...props
}) => {
  const methodConfig = {
    CASH: {
      label: 'Cash',
      color: 'var(--color-status-active)',
    },
    UPI: {
      label: 'UPI',
      color: 'var(--color-primary-600)',
    },
    BANK_TRANSFER: {
      label: 'Bank Transfer',
      color: 'var(--color-primary-500)',
    },
    CHEQUE: {
      label: 'Cheque',
      color: 'var(--color-neutral-600)',
    },
    CARD: {
      label: 'Card',
      color: 'var(--color-primary-500)',
    },
    OTHER: {
      label: 'Other',
      color: 'var(--color-neutral-500)',
    },
  };

  const config = methodConfig[method] || methodConfig.OTHER;
  const sizeClass = `payment-method-${size}`;

  return (
    <span
      className={`payment-method-badge ${sizeClass} ${className}`}
      style={{ '--method-color': config.color }}
      {...props}
    >
      {config.label}
    </span>
  );
};

export default PaymentMethodBadge;
