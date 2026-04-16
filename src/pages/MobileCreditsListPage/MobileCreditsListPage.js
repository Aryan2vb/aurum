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

  const getStatusConfig = (status) => {
    switch (status) {
      case 'active':
        return { label: 'Active', color: 'var(--color-status-active)' };
      case 'overdue':
        return { label: 'Overdue', color: 'var(--color-status-overdue)' };
      case 'paid':
        return { label: 'Paid', color: 'var(--color-status-paid)' };
      default:
        return { label: status, color: 'var(--text-secondary)' };
    }
  };

  const headerAction = (
    <a href="/mobile/credits/new" className="mobile-icon-button">
      <Icon name="add" size={20} />
    </a>
  );

  return (
    <MobileTemplate title="Credits" headerAction={headerAction}>
      <div className="mobile-credits">
        <div className="mobile-credits-list">
          {credits.map((credit) => {
            const status = getStatusConfig(credit.status);
            return (
              <a
                key={credit.id}
                href={`/mobile/credits/${credit.id}`}
                className="mobile-credit-row"
              >
                <div className="mobile-credit-row__avatar">
                  {credit.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="mobile-credit-row__info">
                  <span className="mobile-credit-row__name">{credit.name}</span>
                  <span className="mobile-credit-row__amounts">
                    Total: {credit.amount}
                  </span>
                </div>
                <div className="mobile-credit-row__right">
                  <span className="mobile-credit-row__due">Due: {credit.due}</span>
                  <span
                    className="mobile-credit-row__status"
                    style={{ backgroundColor: status.color }}
                  >
                    {status.label}
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </MobileTemplate>
  );
};

export default MobileCreditsListPage;