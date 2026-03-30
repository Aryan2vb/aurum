import React from 'react';
import AmountDisplay from '../../atoms/AmountDisplay/AmountDisplay';
import DateDisplay from '../../atoms/DateDisplay/DateDisplay';
import './CustomerCreditSummary.css';

const CustomerCreditSummary = ({ customer, creditSummary, credits = [] }) => {
  if (!creditSummary) {
    return (
      <div className="customer-credit-summary">
        <div className="customer-credit-summary-loading">Loading summary...</div>
      </div>
    );
  }

  const {
    totalActiveUdhar = 0,
    openCreditsCount = 0,
    totalCreditsEver = 0,
    totalRepaid = 0,
    oldestUnpaidDays = null,
    lastPaymentDate = null,
    overdueCount = 0,
    behaviorTag = 'CLEAR',
    riskLevel = 'LOW',
  } = creditSummary;

  const getBehaviorTagColor = (tag) => {
    const colors = {
      CLEAR: { bg: '#d1fae5', color: '#065f46' },
      REGULAR: { bg: '#dbeafe', color: '#1e40af' },
      DELAYED: { bg: '#fef3c7', color: '#92400e' },
      RISKY: { bg: '#fee2e2', color: '#991b1b' },
    };
    return colors[tag] || colors.CLEAR;
  };

  const getRiskLevelColor = (level) => {
    const colors = {
      LOW: { bg: '#d1fae5', color: '#065f46' },
      MEDIUM: { bg: '#fef3c7', color: '#92400e' },
      HIGH: { bg: '#fee2e2', color: '#991b1b' },
    };
    return colors[level] || colors.LOW;
  };

  const behaviorColor = getBehaviorTagColor(behaviorTag);
  const riskColor = getRiskLevelColor(riskLevel);

  return (
    <div className="customer-credit-summary">
      {/* Key Metrics */}
      <div className="customer-credit-summary-card">
        <div className="customer-credit-summary-card-header">
          <h2 className="customer-credit-summary-card-title">Credit Summary</h2>
        </div>
        <div className="customer-credit-summary-metrics">
          <div className="customer-credit-summary-metric">
            <span className="customer-credit-summary-metric-label">Total Outstanding</span>
            <AmountDisplay 
              value={totalActiveUdhar} 
              size="xl" 
              emphasis 
              variant="negative"
            />
          </div>
          <div className="customer-credit-summary-metric">
            <span className="customer-credit-summary-metric-label">Open Credits</span>
            <span className="customer-credit-summary-metric-value-large">{openCreditsCount}</span>
          </div>
          <div className="customer-credit-summary-metric">
            <span className="customer-credit-summary-metric-label">Total Credits Ever</span>
            <AmountDisplay value={totalCreditsEver} size="lg" />
          </div>
          <div className="customer-credit-summary-metric">
            <span className="customer-credit-summary-metric-label">Total Repaid</span>
            <AmountDisplay value={totalRepaid} size="lg" variant="positive" />
          </div>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="customer-credit-summary-card">
        <div className="customer-credit-summary-card-header">
          <h2 className="customer-credit-summary-card-title">Status & Risk</h2>
        </div>
        <div className="customer-credit-summary-status">
          <div className="customer-credit-summary-status-item">
            <span className="customer-credit-summary-status-label">Behavior</span>
            <span 
              className="customer-credit-summary-status-badge"
              style={{ 
                backgroundColor: behaviorColor.bg, 
                color: behaviorColor.color 
              }}
            >
              {behaviorTag}
            </span>
          </div>
          <div className="customer-credit-summary-status-item">
            <span className="customer-credit-summary-status-label">Risk Level</span>
            <span 
              className="customer-credit-summary-status-badge"
              style={{ 
                backgroundColor: riskColor.bg, 
                color: riskColor.color 
              }}
            >
              {riskLevel}
            </span>
          </div>
          {overdueCount > 0 && (
            <div className="customer-credit-summary-status-item">
              <span className="customer-credit-summary-status-label">Overdue Credits</span>
              <span className="customer-credit-summary-status-value">{overdueCount}</span>
            </div>
          )}
          {oldestUnpaidDays !== null && (
            <div className="customer-credit-summary-status-item">
              <span className="customer-credit-summary-status-label">Oldest Unpaid</span>
              <span className="customer-credit-summary-status-value">
                {oldestUnpaidDays} days
              </span>
            </div>
          )}
          {lastPaymentDate && (
            <div className="customer-credit-summary-status-item">
              <span className="customer-credit-summary-status-label">Last Payment</span>
              <DateDisplay date={lastPaymentDate} format="relative" />
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      {credits.length > 0 && (
        <div className="customer-credit-summary-card">
          <div className="customer-credit-summary-card-header">
            <h2 className="customer-credit-summary-card-title">Quick Stats</h2>
          </div>
          <div className="customer-credit-summary-stats">
            <div className="customer-credit-summary-stat">
              <span className="customer-credit-summary-stat-label">Active Credits</span>
              <span className="customer-credit-summary-stat-value">
                {credits.filter(c => c.status === 'ACTIVE' || c.status === 'OVERDUE').length}
              </span>
            </div>
            <div className="customer-credit-summary-stat">
              <span className="customer-credit-summary-stat-label">Paid Credits</span>
              <span className="customer-credit-summary-stat-value">
                {credits.filter(c => c.status === 'PAID').length}
              </span>
            </div>
            <div className="customer-credit-summary-stat">
              <span className="customer-credit-summary-stat-label">Total Credits</span>
              <span className="customer-credit-summary-stat-value">{credits.length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerCreditSummary;
