import React from 'react';
import './StatusBadge.css';

/**
 * StatusBadge - Visual indicator of credit/customer status
 * Calm, non-alarming design
 */
const StatusBadge = ({
  status,
  size = 'md',
  variant = 'subtle',
  className = '',
  ...props
}) => {
  const statusConfig = {
    ACTIVE: {
      label: 'Active',
      color: '#4ade80',
      bgColor: 'rgba(74, 222, 128, 0.15)',
      bgColorDark: 'rgba(74, 222, 128, 0.2)',
    },
    PAID: {
      label: 'Paid',
      color: '#6b7280',
      bgColor: 'rgba(107, 114, 128, 0.15)',
      bgColorDark: 'rgba(107, 114, 128, 0.2)',
    },
    OVERDUE: {
      label: 'Overdue',
      color: '#f59e0b', // Amber, not red
      bgColor: 'rgba(245, 158, 11, 0.15)',
      bgColorDark: 'rgba(245, 158, 11, 0.2)',
    },
    CANCELLED: {
      label: 'Cancelled',
      color: '#9ca3af',
      bgColor: 'rgba(156, 163, 175, 0.15)',
      bgColorDark: 'rgba(156, 163, 175, 0.2)',
    },
    INACTIVE: {
      label: 'Inactive',
      color: '#9ca3af',
      bgColor: 'rgba(156, 163, 175, 0.15)',
      bgColorDark: 'rgba(156, 163, 175, 0.2)',
    },
  };

  const config = statusConfig[status] || statusConfig.ACTIVE;
  const sizeClass = `status-badge-${size}`;
  const variantClass = `status-badge-${variant}`;

  // Set background color based on variant and theme
  const getBackgroundColor = () => {
    if (variant === 'subtle') {
      // Check if dark mode (simplified - could use theme context)
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      return isDark ? config.bgColorDark : config.bgColor;
    }
    return undefined;
  };

  return (
    <span
      className={`status-badge ${sizeClass} ${variantClass} ${className}`}
      style={{
        '--status-color': config.color,
        backgroundColor: getBackgroundColor(),
        color: config.color,
      }}
      {...props}
    >
      <span className="status-badge-dot" style={{ backgroundColor: config.color }} />
      <span className="status-badge-label">{config.label}</span>
    </span>
  );
};

export default StatusBadge;
