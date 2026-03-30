import React from 'react';
import AmountDisplay from '../../atoms/AmountDisplay/AmountDisplay';
import BehaviorTag from '../../atoms/BehaviorTag/BehaviorTag';
import RiskIndicator from '../../atoms/RiskIndicator/RiskIndicator';
import DateDisplay from '../../atoms/DateDisplay/DateDisplay';
import './CustomerUdharSnapshot.css';

/**
 * CustomerUdharSnapshot - Attio-style decision support panel
 * Shows customer credit metrics in a clean, SaaS-style layout
 */
const CustomerUdharSnapshot = ({
  customer,
  summary,
  onNewCredit,
  onViewAll,
  onRecordPayment,
  className = '',
  ...props
}) => {
  if (!customer || !summary) {
    return (
      <div className={`customer-udhar-snapshot ${className}`} {...props}>
        <div className="customer-udhar-empty">
          <p className="customer-udhar-empty-text">Select a customer to view credit summary</p>
        </div>
      </div>
    );
  }

  const {
    totalActiveUdhar = 0,
    openCreditsCount = 0,
    behaviorTag,
    riskLevel,
    lastPaymentDate,
    oldestUnpaidDays,
    totalCreditsEver = 0,
    totalRepaid = 0,
  } = summary;

  return (
    <div className={`customer-udhar-snapshot ${className}`} {...props}>
      {/* Risk & Behavior Indicators */}
      <div className="customer-udhar-indicators">
        <div className="customer-udhar-indicator-group">
          <span className="customer-udhar-indicator-label">Behavior</span>
          <BehaviorTag behavior={behaviorTag} size="sm" />
        </div>
        <div className="customer-udhar-indicator-group">
          <span className="customer-udhar-indicator-label">Risk</span>
          <RiskIndicator level={riskLevel} size="sm" showLabel />
        </div>
      </div>

      {/* Primary Metric - Active Udhar */}
      <div className="customer-udhar-metric-card">
        <div className="customer-udhar-metric-header">
          <span className="customer-udhar-metric-label">Active Udhar</span>
        </div>
        <div className="customer-udhar-metric-value">
          <AmountDisplay
            value={totalActiveUdhar}
            size="xl"
            emphasis
            variant="negative"
          />
        </div>
        <div className="customer-udhar-metric-subtext">
          {openCreditsCount} open credit{openCreditsCount !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Key Stats Grid */}
      <div className="customer-udhar-stats-grid">
        <div className="customer-udhar-stat-item">
          <span className="customer-udhar-stat-label">Open Credits</span>
          <span className="customer-udhar-stat-value">{openCreditsCount}</span>
        </div>
        {oldestUnpaidDays !== undefined && oldestUnpaidDays > 0 && (
          <div className="customer-udhar-stat-item">
            <span className="customer-udhar-stat-label">Oldest Unpaid</span>
            <span className="customer-udhar-stat-value">{oldestUnpaidDays} days</span>
          </div>
        )}
        {lastPaymentDate && (
          <div className="customer-udhar-stat-item">
            <span className="customer-udhar-stat-label">Last Payment</span>
            <DateDisplay date={lastPaymentDate} format="relative" size="sm" className="customer-udhar-stat-value" />
          </div>
        )}
      </div>

      {/* Historical Summary */}
      {(totalCreditsEver > 0 || totalRepaid > 0) && (
        <div className="customer-udhar-historical">
          <div className="customer-udhar-historical-header">
            <span className="customer-udhar-historical-title">History</span>
          </div>
          <div className="customer-udhar-historical-stats">
            {totalCreditsEver > 0 && (
              <div className="customer-udhar-historical-item">
                <span className="customer-udhar-historical-label">Total Given</span>
                <AmountDisplay value={totalCreditsEver} size="sm" className="customer-udhar-historical-value" />
              </div>
            )}
            {totalRepaid > 0 && (
              <div className="customer-udhar-historical-item">
                <span className="customer-udhar-historical-label">Total Repaid</span>
                <AmountDisplay value={totalRepaid} size="sm" variant="positive" className="customer-udhar-historical-value" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Decision Context */}
      <div className="customer-udhar-context">
        {oldestUnpaidDays !== null && oldestUnpaidDays > 0 ? (
          <div className="customer-udhar-context-note">
            <span className="customer-udhar-context-icon">⚠️</span>
            <span className="customer-udhar-context-text">
              This customer has {oldestUnpaidDays} day{oldestUnpaidDays !== 1 ? 's' : ''} overdue credit{oldestUnpaidDays !== 1 ? 's' : ''}. Review payment history before extending new credit.
            </span>
          </div>
        ) : riskLevel === 'HIGH' || riskLevel === 'VERY_HIGH' ? (
          <div className="customer-udhar-context-note">
            <span className="customer-udhar-context-icon">⚠️</span>
            <span className="customer-udhar-context-text">
              High risk customer. Review payment history before extending new credit.
            </span>
          </div>
        ) : behaviorTag === 'CLEAR' ? (
          <div className="customer-udhar-context-note customer-udhar-context-positive">
            <span className="customer-udhar-context-icon">✓</span>
            <span className="customer-udhar-context-text">
              Customer has no active credits. Safe to extend new credit.
            </span>
          </div>
        ) : behaviorTag === 'REGULAR' ? (
          <div className="customer-udhar-context-note customer-udhar-context-positive">
            <span className="customer-udhar-context-icon">✓</span>
            <span className="customer-udhar-context-text">
              Regular payment behavior. All credits are current.
            </span>
          </div>
        ) : behaviorTag === 'DELAYED' ? (
          <div className="customer-udhar-context-note">
            <span className="customer-udhar-context-icon">⚠️</span>
            <span className="customer-udhar-context-text">
              Customer has delayed payments. Consider reviewing before extending new credit.
            </span>
          </div>
        ) : behaviorTag === 'RISKY' ? (
          <div className="customer-udhar-context-note">
            <span className="customer-udhar-context-icon">⚠️</span>
            <span className="customer-udhar-context-text">
              Risky payment behavior detected. Review payment history carefully before extending new credit.
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default CustomerUdharSnapshot;
