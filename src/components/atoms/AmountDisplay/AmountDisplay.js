import React from 'react';
import './AmountDisplay.css';

/**
 * AmountDisplay - Displays money amounts in human-readable format
 * Supports Indian number system (lakhs, crores)
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
  // Format number with Indian number system
  const formatAmount = (amount) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '0';

    // For amounts >= 1 crore
    if (num >= 10000000) {
      const crores = num / 10000000;
      return crores.toFixed(crores % 1 === 0 ? 0 : 2) + ' Cr';
    }
    // For amounts >= 1 lakh
    if (num >= 100000) {
      const lakhs = num / 100000;
      return lakhs.toFixed(lakhs % 1 === 0 ? 0 : 2) + ' L';
    }
    // For amounts >= 1 thousand
    if (num >= 1000) {
      const thousands = num / 1000;
      return thousands.toFixed(thousands % 1 === 0 ? 0 : 2) + ' K';
    }
    // Regular formatting with commas
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
