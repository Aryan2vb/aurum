import React from 'react';
import './BehaviorTag.css';

/**
 * BehaviorTag - Shows customer payment behavior pattern
 * Informational, not judgmental
 */
const BehaviorTag = ({
  behavior,
  size = 'md',
  className = '',
  ...props
}) => {
  const behaviorConfig = {
    CLEAR: {
      label: 'Clear',
      color: 'var(--color-behavior-clear)',
    },
    REGULAR: {
      label: 'Regular',
      color: 'var(--color-behavior-regular)',
    },
    DELAYED: {
      label: 'Delayed',
      color: 'var(--color-behavior-delayed)',
    },
    RISKY: {
      label: 'Risky',
      color: 'var(--color-behavior-risky)',
    },
  };

  const config = behaviorConfig[behavior] || behaviorConfig.REGULAR;
  const sizeClass = `behavior-tag-${size}`;

  return (
    <span
      className={`behavior-tag ${sizeClass} ${className}`}
      style={{ '--behavior-color': config.color }}
      {...props}
    >
      {config.label}
    </span>
  );
};

export default BehaviorTag;
