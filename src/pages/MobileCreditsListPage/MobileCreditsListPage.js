import React from 'react';
import MobileTemplate from '../../components/templates/MobileTemplate/MobileTemplate';
import Icon from '../../components/atoms/Icon/Icon';
import './MobileCreditsListPage.css';

const MobileCreditsListPage = () => {
  const credits = [
    { id: 1, name: 'Rajesh Kumar', amount: '₹25,000', due: '₹15,000', status: 'active' },
    { id: 2, name: 'Priya Sharma', amount: '₹12,000', due: '₹8,500', status: 'overdue' },
    { id: 3, name: 'Amit Patel', amount: '₹22,000', due: '₹22,000', status: 'active' },
    { id: 4, name: 'Sunita Devi', amount: '₹5,000', due: '₹0', status: 'paid' },
    { id: 5, name: 'Vikram Singh', amount: '₹18,000', due: '₹12,000', status: 'active' },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'var(--color-success)';
      case 'overdue': return 'var(--color-error)';
      case 'paid': return 'var(--text-tertiary)';
      default: return 'var(--text-secondary)';
    }
  };

  const headerAction = (
    <a href="/credits/new" className="mobile-icon-button primary">
      <Icon name="add" size={20} color="white" />
    </a>
  );

  return (
    <MobileTemplate title="Credits" headerAction={headerAction}>
      <div className="mobile-credits">
        <div className="mobile-credits-list">
          {credits.map((credit) => (
            <a
              key={credit.id}
              href={`/credits/${credit.id}`}
              className="mobile-credit-row glass-panel"
            >
              <div className="mobile-credit-row__avatar">
                {credit.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="mobile-credit-row__info">
                <span className="mobile-credit-row__name">{credit.name}</span>
                <span className="mobile-credit-row__amounts">
                  Total Udhar: <span className="value">{credit.amount}</span>
                </span>
              </div>
              <div className="mobile-credit-row__right">
                <span className="mobile-credit-row__due">{credit.due}</span>
                <div className="status-dot-wrapper">
                  <div className="status-dot" style={{ backgroundColor: getStatusColor(credit.status) }}></div>
                  <span className="status-label">{credit.status}</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </MobileTemplate>
  );
};

export default MobileCreditsListPage;


// export default MobileCreditsListPage;