import React from 'react';
import Text from '../../atoms/Text/Text';
import './EmptyWidget.css';

const EmptyWidget = () => {
  return (
    <div className="empty-widget">
      <div className="widget-header">
        <Text variant="subheading" weight="bold"></Text>
        <div className="widget-actions">
          <button className="widget-action-btn">
            <Text variant="small">Filter</Text>
          </button>
          <button className="widget-action-btn">
            <Text variant="small">Export</Text>
          </button>
        </div>
      </div>
      <div className="empty-content">
        <Text variant="body" color="#999">No content available</Text>
      </div>
    </div>
  );
};

export default EmptyWidget;

