import React from 'react';
import Text from '../../atoms/Text/Text';
import Icon from '../../atoms/Icon/Icon';
import Button from '../../atoms/Button/Button';
import './MetricCard.css';

const MetricCard = ({ 
  title, 
  value, 
  change, 
  changeType = 'up', 
  icon,
  iconColor 
}) => {
  return (
    <div className="metric-card">
      <div className="metric-header">
        <Text variant="small" color="#666">{title}</Text>
        {icon && <Icon name={icon} size={24} color={iconColor} />}
      </div>
      <div className="metric-value">
        <Text variant="heading" weight="bold">{value}</Text>
      </div>
      <div className="metric-footer">
        <span className={`metric-change metric-change-${changeType}`}>
          {changeType === 'up' ? '↑' : '↓'} {change}
        </span>
        <Text variant="small" color="#666">vs last month</Text>
        <Button variant="text" size="small" className="metric-details">
          See Details →
        </Button>
      </div>
    </div>
  );
};

export default MetricCard;

