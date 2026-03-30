import React from 'react';
import './RiskIndicator.css';

/**
 * RiskIndicator - Shows customer risk level subtly
 * Non-alarming, informational only
 */
const RiskIndicator = ({
  level,
  showLabel = false,
  size = 'md',
  className = '',
  ...props
}) => {
  const riskConfig = {
    LOW: {
      label: 'Low Risk',
      color: 'var(--color-risk-low)',
    },
    MEDIUM: {
      label: 'Medium Risk',
      color: 'var(--color-risk-medium)',
    },
    HIGH: {
      label: 'High Risk',
      color: 'var(--color-risk-high)',
    },
    VERY_HIGH: {
      label: 'Very High Risk',
      color: 'var(--color-risk-very-high)',
    },
  };

  const config = riskConfig[level] || riskConfig.LOW;
  const sizeClass = `risk-indicator-${size}`;

  return (
    <span
      className={`risk-indicator ${sizeClass} ${className}`}
      title={config.label}
      {...props}
    >
      <span
        className="risk-indicator-dot"
        style={{ backgroundColor: config.color }}
      />
      {showLabel && <span className="risk-indicator-label">{config.label}</span>}
    </span>
  );
};

export default RiskIndicator;
