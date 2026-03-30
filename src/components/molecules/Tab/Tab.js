import React from 'react';
import Text from '../../atoms/Text/Text';
import './Tab.css';

const Tab = ({ label, active = false, onClick }) => {
  return (
    <div 
      className={`tab ${active ? 'tab-active' : ''}`}
      onClick={onClick}
    >
      <Text variant="body" weight={active ? 'medium' : 'normal'}>
        {label}
      </Text>
    </div>
  );
};

export default Tab;

