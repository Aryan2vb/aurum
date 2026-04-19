import React from 'react';
import MobileTemplate from '../../components/templates/MobileTemplate/MobileTemplate';
import Icon from '../../components/atoms/Icon/Icon';
import './MobileDashboardPage.css';

const MobileDashboardPage = () => {
  // Mock data - in real app this would come from API
  const metrics = [
    { label: 'Total Udhar', value: '₹1,25,000', color: 'accent', icon: 'udhar' },
    { label: 'Active', value: '₹45,000', color: 'success', icon: 'checkCircle' },
    { label: 'Overdue', value: '₹12,500', color: 'error', icon: 'notification' },
  ];

  const recentActivity = [
    { id: 1, name: 'Rajesh Kumar', amount: '₹5,000', status: 'Paid yesterday', type: 'payment' },
    { id: 2, name: 'Priya Sharma', amount: '₹12,000', status: 'Due in 3 days', type: 'pending' },
    { id: 3, name: 'Amit Patel', amount: '₹8,500', status: 'Overdue 5 days', type: 'overdue' },
  ];

  const quickActions = [
    { label: 'Add Udhar', icon: 'add', path: '/credits/new', color: '#3A6DFF' },
    { label: 'Payments', icon: 'dollar', path: '/credits', color: '#10B981' },
    { label: 'Invoices', icon: 'invoice', path: '/invoices', color: '#D4AF37' },
  ];

  const getStatusColor = (type) => {
    switch (type) {
      case 'payment': return 'var(--color-success)';
      case 'pending': return 'var(--color-accent)';
      case 'overdue': return 'var(--color-error)';
      default: return 'var(--text-secondary)';
    }
  };

  const headerAction = (
    <div className="header-actions">
      <button className="mobile-icon-button secondary">
        <Icon name="search" size={20} />
      </button>
      <button className="mobile-icon-button primary">
        <Icon name="notification" size={20} color="white" />
      </button>
    </div>
  );

  return (
    <MobileTemplate title="Aurum" headerAction={headerAction}>
      <div className="mobile-dashboard">
        <header className="dashboard-greeting">
          <h1>Hey, Aryan</h1>
          <p>Here's what's happening today</p>
        </header>

        {/* Metrics Row */}
        <div className="mobile-metrics-row">
          {metrics.map((metric) => (
            <div key={metric.label} className={`mobile-metric-card metric-${metric.color}`}>
              <div className="metric-icon-wrapper">
                <Icon name={metric.icon} size={18} />
              </div>
              <span className="mobile-metric-card__value">{metric.value}</span>
              <span className="mobile-metric-card__label">{metric.label}</span>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <section className="mobile-section">
          <div className="mobile-section__header">
            <h2 className="mobile-section__title">Quick Actions</h2>
          </div>
          <div className="mobile-quick-actions">
            {quickActions.map((action) => (
              <a key={action.label} href={action.path} className="mobile-quick-action">
                <div className="mobile-quick-action__icon" style={{ backgroundColor: `${action.color}15`, color: action.color }}>
                  <Icon name={action.icon} size={24} color={action.color} />
                </div>
                <span className="mobile-quick-action__label">{action.label}</span>
              </a>
            ))}
          </div>
        </section>

        {/* Recent Activity */}
        <section className="mobile-section">
          <div className="mobile-section__header">
            <h2 className="mobile-section__title">Recent Activity</h2>
            <a href="/credits" className="mobile-section__link">View All</a>
          </div>
          <div className="mobile-activity-list">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="mobile-activity-item glass-panel">
                <div className="mobile-activity-item__avatar">
                  {activity.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="mobile-activity-item__info">
                  <span className="mobile-activity-item__name">{activity.name}</span>
                  <span className="mobile-activity-item__status">{activity.status}</span>
                </div>
                <div className="mobile-activity-item__right">
                  <span
                    className="mobile-activity-item__amount"
                    style={{ color: getStatusColor(activity.type) }}
                  >
                    {activity.amount}
                  </span>
                  <Icon name="arrowRight" size={14} color="var(--text-tertiary)" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </MobileTemplate>
  );
};

export default MobileDashboardPage;


// export default MobileDashboardPage;