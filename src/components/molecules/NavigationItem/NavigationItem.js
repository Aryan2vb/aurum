import React from 'react';
import Icon from '../../atoms/Icon/Icon';
import Badge from '../../atoms/Badge/Badge';
import Text from '../../atoms/Text/Text';
import './NavigationItem.css';

const NavigationItem = ({ 
  icon, 
  label, 
  active = false, 
  badge,
  onClick 
}) => {
  return (
    <div 
      className={`nav-item ${active ? 'nav-item-active' : ''}`}
      onClick={onClick}
    >
      <Icon name={icon} size={20} />
      <Text variant="body" weight={active ? 'medium' : 'normal'}>
        {label}
      </Text>
      {badge && <Badge count={badge} />}
    </div>
  );
};

export default NavigationItem;

