import React from 'react';
import './StatusPill.css';

const StatusPill = ({ status }) => {
  const statusConfig = {
    ACTIVE: { bg: '#d1fae5', text: '#065f46' },
    INACTIVE: { bg: '#f3f4f6', text: '#4b5563' },
    PENDING: { bg: '#fef3c7', text: '#92400e' },
    SUSPENDED: { bg: '#fee2e2', text: '#991b1b' },
  };

  const config = statusConfig[status] || statusConfig.INACTIVE;

  return (
    <span
      className="status-pill"
      style={{
        backgroundColor: config.bg,
        color: config.text,
      }}
    >
      {status || 'N/A'}
    </span>
  );
};

export default StatusPill;
