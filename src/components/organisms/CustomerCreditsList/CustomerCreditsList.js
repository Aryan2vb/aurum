import React, { useState, useMemo } from 'react';
import CreditListRow from '../../molecules/CreditListRow/CreditListRow';
import './CustomerCreditsList.css';

const CustomerCreditsList = ({ credits = [], onCreditClick, onRecordPayment }) => {
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredCredits = useMemo(() => {
    if (statusFilter === 'all') return credits;
    return credits.filter(credit => {
      if (statusFilter === 'active') {
        return credit.status === 'ACTIVE' || credit.status === 'OVERDUE';
      }
      return credit.status === statusFilter;
    });
  }, [credits, statusFilter]);

  const statusCounts = useMemo(() => {
    return {
      all: credits.length,
      active: credits.filter(c => c.status === 'ACTIVE' || c.status === 'OVERDUE').length,
      paid: credits.filter(c => c.status === 'PAID').length,
      overdue: credits.filter(c => c.status === 'OVERDUE').length,
    };
  }, [credits]);

  if (credits.length === 0) {
    return (
      <div className="customer-credits-list">
        <div className="customer-credits-list-empty">
          <p>No credits found for this customer</p>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-credits-list">
      {/* Filters */}
      <div className="customer-credits-list-filters">
        <div className="customer-credits-list-filter-group">
          <button
            className={`customer-credits-list-filter ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All ({statusCounts.all})
          </button>
          <button
            className={`customer-credits-list-filter ${statusFilter === 'active' ? 'active' : ''}`}
            onClick={() => setStatusFilter('active')}
          >
            Active ({statusCounts.active})
          </button>
          <button
            className={`customer-credits-list-filter ${statusFilter === 'OVERDUE' ? 'active' : ''}`}
            onClick={() => setStatusFilter('OVERDUE')}
          >
            Overdue ({statusCounts.overdue})
          </button>
          <button
            className={`customer-credits-list-filter ${statusFilter === 'PAID' ? 'active' : ''}`}
            onClick={() => setStatusFilter('PAID')}
          >
            Paid ({statusCounts.paid})
          </button>
        </div>
      </div>

      {/* Credits List */}
      <div className="customer-credits-list-content">
        {filteredCredits.length === 0 ? (
          <div className="customer-credits-list-empty">
            <p>No credits match the selected filter</p>
          </div>
        ) : (
          <div className="customer-credits-list-items">
            {filteredCredits.map((credit) => (
              <CreditListRow
                key={credit.id}
                credit={credit}
                onClick={() => onCreditClick?.(credit)}
                onRecordPayment={(credit) => onRecordPayment?.(credit)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerCreditsList;
