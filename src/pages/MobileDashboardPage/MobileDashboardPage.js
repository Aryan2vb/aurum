import React from 'react';
import MobileTemplate from '../../components/templates/MobileTemplate/MobileTemplate';
import Icon from '../../components/atoms/Icon/Icon';
import './MobileDashboardPage.css';

const MobileDashboardPage = () => {
  // Mock data - in real app this would come from API
  const metrics = [
    { label: 'Total Udhar', value: '₹1,25,000', color: 'accent' },
    { label: 'Active', value: '₹45,000', color: 'active' },
    { label: 'Overdue', value: '₹12,500', color: 'overdue' },
  ];

  const recentActivity = [
    { id: 1, name: 'Rajesh Kumar', amount: '₹5,000', status: 'Paid yesterday', type: 'payment' },
    { id: 2, name: 'Priya Sharma', amount: '₹12,000', status: 'Due in 3 days', type: 'pending' },
    { id: 3, name: 'Amit Patel', amount: '₹8,500', status: 'Overdue 5 days', type: 'overdue' },
  ];

  const quickActions = [
    { label: 'Add Udhar', icon: 'add', path: '/mobile/credits/new' },
    { label: 'Record Payment', icon: 'dollar', path: '/mobile/credits' },
    { label: 'Customers', icon: 'customer', path: '/mobile/customers' },
  ];

  const getStatusColor = (type) => {
    switch (type) {
      case 'payment': return 'var(--color-status-active)';
      case 'pending': return 'var(--accent-color)';
      case 'overdue': return 'var(--color-status-overdue)';
      default: return 'var(--text-secondary)';
    }
  };

  const headerAction = (
    <button className="mobile-icon-button">
      <Icon name="notification" size={20} />
    </button>
  );

  return (
    <MobileTemplate title="Hey, Aryan" headerAction={headerAction}>
      <div className="mobile-dashboard">
        {/* Metrics Row */}
        <div className="mobile-metrics-row">
          {metrics.map((metric) => (
            <div key={metric.label} className="mobile-metric-card">
              <span className="mobile-metric-card__label">{metric.label}</span>
              <span className="mobile-metric-card__value">{metric.value}</span>
              <div className={`mobile-metric-card__indicator mobile-metric-card__indicator--${metric.color}`} />
            </div>
          ))}
        </div>

        {/* Recent Activity */}
        <section className="mobile-section">
          <div className="mobile-section__header">
            <h2 className="mobile-section__title">Recent Activity</h2>
            <a href="/mobile/credits" className="mobile-section__link">View All →</a>
          </div>
          <div className="mobile-activity-list">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="mobile-activity-item">
                <div className="mobile-activity-item__avatar">
                  {activity.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="mobile-activity-item__info">
                  <span className="mobile-activity-item__name">{activity.name}</span>
                  <span className="mobile-activity-item__status">{activity.status}</span>
                </div>
                <span
                  className="mobile-activity-item__amount"
                  style={{ color: getStatusColor(activity.type) }}
                >
                  {activity.amount}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="mobile-section">
          <h2 className="mobile-section__title">Quick Actions</h2>
          <div className="mobile-quick-actions">
            {quickActions.map((action) => (
              <a key={action.label} href={action.path} className="mobile-quick-action">
                <div className="mobile-quick-action__icon">
                  <Icon name={action.icon} size={24} />
                </div>
                <span className="mobile-quick-action__label">{action.label}</span>
              </a>
            ))}
          </div>
        </section>
      </div>
    </MobileTemplate>
  );
};

export default MobileDashboardPage;