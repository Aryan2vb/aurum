import React from 'react';
import MobileTemplate from '../../components/templates/MobileTemplate/MobileTemplate';
import Icon from '../../components/atoms/Icon/Icon';
import './MobileCreditDetailPage.css';

const MobileCreditDetailPage = () => {
  // Mock data
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
    { id: 1, date: '12 Mar', amount: '₹5,000', type: 'Payment', status: 'completed' },
    { id: 2, date: '28 Feb', amount: '₹5,000', type: 'Payment', status: 'completed' },
    { id: 3, date: '15 Jan', amount: '₹15,000', type: 'Credit Created', status: 'completed' },
  ];

  const headerAction = (
    <button className="mobile-icon-button secondary">
      <Icon name="edit" size={20} />
    </button>
  );

  return (
    <MobileTemplate title="" headerAction={headerAction}>
      <div className="mobile-credit-detail">
        <header className="detail-hero">
          <div className="detail-hero__avatar">
            {customer.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <h1>{customer.name}</h1>
          <p>{customer.phone}</p>
        </header>

        <div className="detail-stats-grid">
          <div className="detail-stat-card glass-panel">
            <span className="label">Total</span>
            <span className="value">{customer.total}</span>
          </div>
          <div className="detail-stat-card glass-panel success">
            <span className="label">Paid</span>
            <span className="value">{customer.paid}</span>
          </div>
          <div className="detail-stat-card glass-panel error">
            <span className="label">Due</span>
            <span className="value">{customer.due}</span>
          </div>
        </div>

        <section className="mobile-section">
          <div className="mobile-section__header">
            <h2 className="mobile-section__title">History</h2>
          </div>
          <div className="mobile-transaction-list">
            {transactions.map((trans) => (
              <div key={trans.id} className="mobile-transaction-item glass-panel">
                <div className="trans-icon">
                  <Icon name={trans.type === 'Payment' ? 'payment' : 'udhar'} size={18} />
                </div>
                <div className="trans-info">
                  <span className="trans-type">{trans.type}</span>
                  <span className="trans-date">{trans.date}</span>
                </div>
                <div className="trans-right">
                  <span className={`trans-amount ${trans.type === 'Payment' ? 'success' : ''}`}>
                    {trans.type === 'Payment' ? `+${trans.amount}` : trans.amount}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <a href={`/credits/${customer.id}/payment`} className="mobile-fab">
          <Icon name="dollar" size={24} color="white" />
          <span>Record Payment</span>
        </a>
      </div>
    </MobileTemplate>
  );
};

export default MobileCreditDetailPage;


// export default MobileCreditDetailPage;