import React from 'react';
import MobileTemplate from '../../components/templates/MobileTemplate/MobileTemplate';
import Icon from '../../components/atoms/Icon/Icon';
import './MobileCustomersPage.css';

const MobileCustomersPage = () => {
  const customers = [
    { id: 1, name: 'Rajesh Kumar', phone: '+91 98765 43210', due: '₹15,000', status: 'active' },
    { id: 2, name: 'Priya Sharma', phone: '+91 87654 32109', due: '₹8,500', status: 'overdue' },
    { id: 3, name: 'Amit Patel', phone: '+91 76543 21098', due: '₹22,000', status: 'active' },
    { id: 4, name: 'Sunita Devi', phone: '+91 65432 10987', due: '₹5,000', status: 'paid' },
    { id: 5, name: 'Vikram Singh', phone: '+91 54321 09876', due: '₹12,000', status: 'active' },
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
    <button className="mobile-icon-button primary">
      <Icon name="add" size={20} color="white" />
    </button>
  );

  return (
    <MobileTemplate title="Customers" headerAction={headerAction}>
      <div className="mobile-customers">
        <div className="mobile-search-wrapper">
          <div className="mobile-search-bar glass-panel">
            <Icon name="search" size={18} color="var(--text-tertiary)" />
            <input
              type="text"
              className="mobile-search-bar__input"
              placeholder="Search customers..."
            />
          </div>
          <button className="filter-button">
            <Icon name="filter" size={18} />
          </button>
        </div>

        <div className="mobile-customer-list">
          {customers.map((customer) => (
            <a
              key={customer.id}
              href={`/customers/${customer.id}`}
              className="mobile-customer-row glass-panel"
            >
              <div className="mobile-customer-row__avatar">
                {customer.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="mobile-customer-row__info">
                <span className="mobile-customer-row__name">{customer.name}</span>
                <span className="mobile-customer-row__phone">{customer.phone}</span>
              </div>
              <div className="mobile-customer-row__right">
                <span className="mobile-customer-row__due">{customer.due}</span>
                <div className="status-dot-wrapper">
                  <div className="status-dot" style={{ backgroundColor: getStatusColor(customer.status) }}></div>
                  <span className="status-label">{customer.status}</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </MobileTemplate>
  );
};

export default MobileCustomersPage;


// export default MobileCustomersPage;