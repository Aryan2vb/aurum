import React from 'react';
import './DateDisplay.css';

/**
 * DateDisplay - Shows dates in human-readable, relative format
 */
const DateDisplay = ({
  date,
  format = 'relative',
  showTime = false,
  size = 'md',
  className = '',
  ...props
}) => {
  const formatDate = (dateValue) => {
    const dateObj = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    if (!dateObj || isNaN(dateObj.getTime())) return 'Invalid date';

    const now = new Date();
    const diffMs = dateObj.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    // Format absolute date
    const formatAbsolute = () => {
      const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      };
      if (showTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
      }
      return dateObj.toLocaleDateString('en-IN', options);
    };

    // Format relative date
    const formatRelative = () => {
      if (Math.abs(diffDays) === 0) {
        if (Math.abs(diffHours) === 0) {
          if (Math.abs(diffMinutes) < 1) return 'just now';
          return `${Math.abs(diffMinutes)} minute${Math.abs(diffMinutes) > 1 ? 's' : ''} ago`;
        }
        return diffHours > 0 ? `in ${diffHours} hour${diffHours > 1 ? 's' : ''}` : `${Math.abs(diffHours)} hour${Math.abs(diffHours) > 1 ? 's' : ''} ago`;
      }
      if (diffDays === 1) return 'tomorrow';
      if (diffDays === -1) return 'yesterday';
      if (diffDays > 0 && diffDays <= 7) return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
      if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? 's' : ''} ago`;
      if (diffDays > 7) return `in ${diffDays} days`;
      if (diffDays < -7) return `${Math.abs(diffDays)} days ago`;
      return formatAbsolute();
    };

    if (format === 'absolute') {
      return formatAbsolute();
    }
    if (format === 'both') {
      const relative = formatRelative();
      const absolute = formatAbsolute();
      return `${absolute} (${relative})`;
    }
    return formatRelative();
  };

  const formattedDate = formatDate(date);
  const sizeClass = `date-${size}`;

  return (
    <span className={`date-display ${sizeClass} ${className}`} {...props}>
      {formattedDate}
    </span>
  );
};

export default DateDisplay;
