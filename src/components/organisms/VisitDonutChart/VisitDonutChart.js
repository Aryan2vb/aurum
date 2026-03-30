import React from 'react';
import Text from '../../atoms/Text/Text';
import './VisitDonutChart.css';

const VisitDonutChart = () => {
  const totalVisits = 191886;
  const mobileVisits = 115132;
  const websiteVisits = 76754;
  const mobilePercentage = 60;
  const websitePercentage = 40;
  const change = 8.5;

  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const mobileOffset = circumference * (1 - mobilePercentage / 100);
  const websiteOffset = circumference * (1 - websitePercentage / 100);

  return (
    <div className="visit-donut-widget">
      <div className="widget-header">
        <Text variant="subheading" weight="bold">Total Visit</Text>
        <div className="widget-actions">
          <button className="widget-action-btn">
            <Text variant="small">Filter</Text>
          </button>
          <button className="widget-action-btn">
            <Text variant="small">Export</Text>
          </button>
        </div>
      </div>
      <div className="donut-content">
        <div className="donut-chart">
          <svg width="160" height="160" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="#2a2a2a"
              strokeWidth="20"
            />
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="20"
              strokeDasharray={circumference}
              strokeDashoffset={mobileOffset}
              strokeLinecap="round"
              transform="rotate(-90 60 60)"
            />
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="#60a5fa"
              strokeWidth="20"
              strokeDasharray={circumference}
              strokeDashoffset={websiteOffset}
              strokeLinecap="round"
              transform={`rotate(${-90 + (mobilePercentage / 100) * 360} 60 60)`}
            />
          </svg>
          <div className="donut-center">
            <Text variant="heading" weight="bold">{totalVisits.toLocaleString()}</Text>
            <Text variant="small" color="#10b981">
              ↑ {change}% vs last month
            </Text>
          </div>
        </div>
        <div className="donut-legend">
          <div className="legend-item">
            <div className="legend-color legend-color-mobile"></div>
            <div className="legend-info">
              <Text variant="body" weight="medium">Mobile</Text>
              <Text variant="small" color="#666">
                {mobileVisits.toLocaleString()} ({mobilePercentage}%)
              </Text>
            </div>
          </div>
          <div className="legend-item">
            <div className="legend-color legend-color-website"></div>
            <div className="legend-info">
              <Text variant="body" weight="medium">Website</Text>
              <Text variant="small" color="#666">
                {websiteVisits.toLocaleString()} ({websitePercentage}%)
              </Text>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisitDonutChart;

