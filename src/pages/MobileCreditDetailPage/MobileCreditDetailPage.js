import React from 'react';
import MobileTemplate from '../../components/templates/MobileTemplate/MobileTemplate';
import Icon from '../../components/atoms/Icon/Icon';
import './MobileCreditDetailPage.css';

const MobileCreditDetailPage = ({ match }) => {
  // Mock data - in real app this would come from API based on match.params.id
  const customer = {
    id: 1,
    name: 'Rajesh Kumar',
    phone: '+91 98765 43210',
    status: 'active',
    total: '₹25,000',
    paid: '₹10,000',
    due: '₹15,000',
  };

  const transactions = [
    { id: 1, date: '12 Mar', amount: '₹5,000', type: 'Payment' },
    { id: 2, date: '28 Feb', amount: '₹5,000', type: 'Payment' },
    { id: 3, date: '15 Jan', amount: '₹15,000', type: 'Credit Created' },
  ];

  const headerAction = (
    <button className="mobile-text-button">Edit</button>
  );

  return (
    <MobileTemplate title="" headerAction={headerAction}>
      <div className="mobile-credit-detail">
        {/* Customer Info Card */}
        <div className="mobile-credit-detail__customer-card">
          <div className="mobile-credit-detail__customer-top">
            <div className="mobile-credit-detail__avatar">
              {customer.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="mobile-credit-detail__customer-info">
              <span className="mobile-credit-detail__customer-name">{customer.name}</span>
              <span className="mobile-credit-detail__customer-phone">{customer.phone}</span>
            </div>
            <span
              className="mobile-credit-detail__status"
              style={{ backgroundColor: 'var(--color-status-active)' }}
            >
              Active
            </span>
          </div>

          <div className="mobile-credit-detail__amounts">
            <div className="mobile-credit-detail__amount-item">
              <span className="mobile-credit-detail__amount-label">Total</span>
              <span className="mobile-credit-detail__amount-value">{customer.total}</span>
            </div>
            <div className="mobile-credit-detail__amount-item">
              <span className="mobile-credit-detail__amount-label">Paid</span>
              <span className="mobile-credit-detail__amount-value mobile-credit-detail__amount-value--paid">
                {customer.paid}
              </span>
            </div>
            <div className="mobile-credit-detail__amount-item">
              <span className="mobile-credit-detail__amount-label">Due</span>
              <span className="mobile-credit-detail__amount-value mobile-credit-detail__amount-value--due">
                {customer.due}
              </span>
            </div>
          </div>
        </div>

        {/* Transactions */}
        <section className="mobile-section">
          <h2 className="mobile-section__title">Transactions</h2>
          <div className="mobile-transaction-list">
            {transactions.map((trans) => (
              <div key={trans.id} className="mobile-transaction-item">
                <div className="mobile-transaction-item__date">
                  <span className="mobile-transaction-item__day">{trans.date.split(' ')[0]}</span>
                  <span className="mobile-transaction-item__month">{trans.date.split(' ')[1]}</span>
                </div>
                <span className="mobile-transaction-item__type">{trans.type}</span>
                <span
                  className="mobile-transaction-item__amount"
                  style={{
                    color: trans.type === 'Payment'
                      ? 'var(--color-status-active)'
                      : 'var(--text-primary)'
                  }}
                >
                  {trans.amount}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Record Payment FAB */}
        <a href="/mobile/credits/1/payment" className="mobile-fab">
          <Icon name="dollar" size={24} />
        </a>
      </div>
    </MobileTemplate>
  );
};

export default MobileCreditDetailPage;