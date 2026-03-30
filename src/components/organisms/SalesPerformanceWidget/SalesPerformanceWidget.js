import React from 'react';
import Button from '../../atoms/Button/Button';
import Text from '../../atoms/Text/Text';
import './SalesPerformanceWidget.css';

const SalesPerformanceWidget = () => {
  const score = 82;
  const maxScore = 100;
  const percentage = (score / maxScore) * 100;

  return (
    <div className="sales-performance-widget">
      <div className="widget-header">
        <Text variant="subheading" weight="bold">Sales Performance</Text>
        <div className="widget-actions">
          <button className="widget-action-btn">
            <Text variant="small">Filter</Text>
          </button>
          <button className="widget-action-btn">
            <Text variant="small">Export</Text>
          </button>
        </div>
      </div>
      <div className="performance-content">
        <div className="circular-progress">
          <svg className="progress-ring" width="120" height="120">
            <circle
              className="progress-ring-background"
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke="#2a2a2a"
              strokeWidth="8"
            />
            <circle
              className="progress-ring-progress"
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="8"
              strokeDasharray={`${2 * Math.PI * 50}`}
              strokeDashoffset={`${2 * Math.PI * 50 * (1 - percentage / 100)}`}
              strokeLinecap="round"
              transform="rotate(-90 60 60)"
            />
          </svg>
          <div className="progress-text">
            <Text variant="heading" weight="bold">{score} +1</Text>
            <Text variant="small" color="#666">/ {maxScore} points</Text>
          </div>
        </div>
        <div className="performance-message">
          <Text variant="body">
            You're team is great! ✨ The team is performing well above average, meeting or exceeding targets in several areas.
          </Text>
          <Button variant="text" size="small" className="improve-button">
            Improve Your Score →
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SalesPerformanceWidget;

