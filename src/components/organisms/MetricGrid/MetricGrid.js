import React from 'react';
import MetricCard from '../../molecules/MetricCard/MetricCard';
import './MetricGrid.css';

const MetricGrid = () => {
  const metrics = [
    {
      title: 'Active Sales',
      value: '$24,064',
      change: '12%',
      changeType: 'up',
      icon: 'analytics',
      iconColor: '#ff6b35',
    },
    {
      title: 'Product Revenue',
      value: '$15,490',
      change: '9%',
      changeType: 'up',
      icon: 'analytics',
      iconColor: '#10b981',
    },
    {
      title: 'Product Sold',
      value: '2,355',
      change: '7%',
      changeType: 'up',
      icon: 'analytics',
      iconColor: '#3b82f6',
    },
    {
      title: 'Conversion Rate',
      value: '12.5%',
      change: '2%',
      changeType: 'down',
      icon: 'analytics',
      iconColor: '#8b5cf6',
    },
  ];

  return (
    <div className="metric-grid">
      {metrics.map((metric, index) => (
        <MetricCard key={index} {...metric} />
      ))}
    </div>
  );
};

export default MetricGrid;

