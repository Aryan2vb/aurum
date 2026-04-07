import React from 'react';
import Icon from '../../atoms/Icon/Icon';
import './SummaryCard.css';

const SummaryCard = ({ 
  title, 
  value, 
  trend, 
  trendType = 'neutral', 
  icon, 
  iconColor = 'var(--accent)' 
}) => {
  const getTrendClass = () => {
    switch (trendType) {
      case 'up': return 'trend-up';
      case 'down': return 'trend-down';
      case 'warning': return 'trend-warning';
      case 'info': return 'trend-info';
      default: return 'trend-neutral';
    }
  };

  return (
    <div className="summary-card">
      <div className="card-top">
        <div className="card-icon" style={{ backgroundColor: `${iconColor}15`, color: iconColor }}>
          <Icon name={icon} size={20} />
        </div>
        <div className={`trend-badge ${getTrendClass()}`}>
          {trend}
        </div>
      </div>
      <div className="card-content">
        <span className="card-title">{title}</span>
        <h2 className="card-value">{value}</h2>
      </div>
    </div>
  );
};

export default SummaryCard;
