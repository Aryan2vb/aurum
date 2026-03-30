import React from 'react';
import './CreditSkeleton.css';

const CreditSkeleton = ({ count = 6 }) => {
  return (
    <div className="credit-skeleton-container">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="credit-skeleton-card">
          <div className="credit-skeleton-header">
            <div className="credit-skeleton-avatar" />
            <div className="credit-skeleton-info">
              <div className="credit-skeleton-bar credit-skeleton-name" />
              <div className="credit-skeleton-bar credit-skeleton-item" />
            </div>
            <div className="credit-skeleton-badge" />
          </div>
          <div className="credit-skeleton-amounts">
            <div className="credit-skeleton-amount-row">
              <div className="credit-skeleton-bar credit-skeleton-label" />
              <div className="credit-skeleton-bar credit-skeleton-value" />
            </div>
            <div className="credit-skeleton-amount-row">
              <div className="credit-skeleton-bar credit-skeleton-label" />
              <div className="credit-skeleton-bar credit-skeleton-value" />
            </div>
          </div>
          <div className="credit-skeleton-progress" />
          <div className="credit-skeleton-actions">
            <div className="credit-skeleton-bar credit-skeleton-button" />
            <div className="credit-skeleton-bar credit-skeleton-button" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default CreditSkeleton;
