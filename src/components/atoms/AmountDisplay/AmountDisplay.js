import React from 'react';
import './AmountDisplay.css';

/**
 * AmountDisplay - Displays money amounts in human-readable format
 * Always shows the full amount with Indian comma formatting.
 */
const AmountDisplay = ({
  value,
  size = 'md',
  emphasis = false,
  showCurrency = true,
  variant = 'default',
  className = '',
  ...props
}) => {
  const formatAmount = (amount) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '0';

    return num.toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  const formattedValue = formatAmount(value);
  const currencySymbol = showCurrency ? '₹' : '';

  const variantClass = `amount-${variant}`;
  const sizeClass = `amount-${size}`;
  const emphasisClass = emphasis ? 'amount-emphasis' : '';

  return (
    <span
      className={`amount-display ${variantClass} ${sizeClass} ${emphasisClass} ${className}`}
      {...props}
    >
      {currencySymbol}
      {formattedValue}
    </span>
  );
};

export default AmountDisplay;
