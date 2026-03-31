import React from 'react';
import Avatar from '../../atoms/Avatar/Avatar';
import AmountDisplay from '../../atoms/AmountDisplay/AmountDisplay';
import BehaviorTag from '../../atoms/BehaviorTag/BehaviorTag';
import RiskIndicator from '../../atoms/RiskIndicator/RiskIndicator';
import DateDisplay from '../../atoms/DateDisplay/DateDisplay';
import Button from '../../atoms/Button/Button';
import './CustomerSummaryCard.css';

/**
 * CustomerSummaryCard - Quick view of customer credit status
 */
const CustomerSummaryCard = ({
  customer,
  summary,
  onClick,
  onRecordPayment,
  onCreateCredit,
  className = '',
  ...props
}) => {
  const {
    name,
    code,
    avatar,
    phone,
  } = customer;

  const {
    totalActiveUdhar,
    openCreditsCount,
    behaviorTag,
    riskLevel,
    lastPaymentDate,
    oldestUnpaidDays,
  } = summary;

  return (
    <div
      className={`customer-summary-card ${className}`}
      onClick={onClick}
      {...props}
    >
      <div className="customer-summary-header">
        <div className="customer-summary-identity">
          <Avatar name={name} imageUrl={avatar} size="md" />
          <div className="customer-summary-info">
            <div className="customer-summary-name-row">
              <span className="customer-summary-name">{name}</span>
              <span className="customer-summary-code">{code}</span>
            </div>
            <div className="customer-summary-contact">
              <span className="customer-summary-phone">{phone}</span>
            </div>
          </div>
        </div>
        <div className="customer-summary-tags">
          <BehaviorTag behavior={behaviorTag} size="sm" />
          <RiskIndicator level={riskLevel} size="sm" />
        </div>
      </div>

      <div className="customer-summary-main">
        <div className="customer-summary-amount">
          <span className="customer-summary-label">Active Udhar:</span>
          <AmountDisplay
            value={totalActiveUdhar}
            size="lg"
            emphasis
            variant="negative"
          />
        </div>

        <div className="customer-summary-stats">
          <div className="customer-summary-stat">
            <span className="customer-summary-stat-label">Open Credits:</span>
            <span className="customer-summary-stat-value">{openCreditsCount}</span>
          </div>
          {lastPaymentDate && (
            <div className="customer-summary-stat">
              <span className="customer-summary-stat-label">Last Paid:</span>
              <DateDisplay date={lastPaymentDate} format="relative" size="sm" />
            </div>
          )}
          {oldestUnpaidDays !== undefined && (
            <div className="customer-summary-stat">
              <span className="customer-summary-stat-label">Oldest Unpaid:</span>
              <span className="customer-summary-stat-value">
                {oldestUnpaidDays} days
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="customer-summary-actions">
        {onCreateCredit && (
          <Button
            variant="primary"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onCreateCredit(customer);
            }}
          >
            New Udhar
          </Button>
        )}
        {onRecordPayment && (
          <Button
            variant="ghost"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onRecordPayment(customer);
            }}
          >
            Record Payment
          </Button>
        )}
      </div>
    </div>
  );
};

export default CustomerSummaryCard;
