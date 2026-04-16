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
    <button className="mobile-icon-button">
      <Icon name="add" size={20} />
    </button>
  );

  return (
    <MobileTemplate title="Customers" headerAction={headerAction}>
      <div className="mobile-customers">
        {/* Search Bar */}
        <div className="mobile-search-bar">
          <Icon name="search" size={16} />
          <input
            type="text"
            className="mobile-search-bar__input"
            placeholder="Search customers..."
          />
        </div>

        {/* Customer List */}
        <div className="mobile-customer-list">
          {customers.map((customer) => {
            const status = getStatusConfig(customer.status);
            return (
              <a
                key={customer.id}
                href={`/mobile/customers/${customer.id}`}
                className="mobile-customer-row"
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
                  <span
                    className="mobile-customer-row__status"
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

export default MobileCustomersPage;