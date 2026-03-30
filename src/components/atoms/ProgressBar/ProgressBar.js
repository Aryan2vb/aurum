import React from 'react';
import './ProgressBar.css';

/**
 * ProgressBar - Shows payment progress for credit
 */
const ProgressBar = ({
  paid,
  total,
  showLabel = false,
  size = 'md',
  className = '',
  ...props
}) => {
  const percentage = total > 0 ? Math.min((paid / total) * 100, 100) : 0;
  const sizeClass = `progress-${size}`;

  return (
    <div className={`progress-bar-container ${sizeClass} ${className}`} {...props}>
      <div className="progress-bar-wrapper">
        <div
          className="progress-bar-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="progress-bar-label">
          <span className="progress-bar-paid">
            ₹{paid.toLocaleString('en-IN')}
          </span>
          <span className="progress-bar-separator">/</span>
          <span className="progress-bar-total">
            ₹{total.toLocaleString('en-IN')}
          </span>
        </div>
      )}
    </div>
  );
};

export default ProgressBar;
