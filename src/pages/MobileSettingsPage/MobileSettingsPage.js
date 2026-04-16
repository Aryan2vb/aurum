import React from 'react';
import MobileTemplate from '../../components/templates/MobileTemplate/MobileTemplate';
import './MobileSettingsPage.css';

const MobileSettingsPage = () => {
  const handleLogout = () => {
    // Handle logout logic
    localStorage.clear();
    window.location.href = '/login';
  };

  const settingsSections = [
    {
      title: 'ACCOUNT',
      items: [
        { label: 'Organization', value: 'My Shop' },
        { label: 'Email', value: 'you@example.com' },
        { label: 'Plan', value: 'Starter' },
      ],
    },
    {
      title: 'NOTIFICATIONS',
      items: [
        { label: 'Payment Reminders', value: 'On' },
        { label: 'Overdue Alerts', value: 'On' },
      ],
    },
    {
      title: 'ABOUT',
      items: [
        { label: 'Version', value: '1.0.0' },
      ],
    },
  ];

  return (
    <MobileTemplate title="Settings">
      <div className="mobile-settings">
        {settingsSections.map((section) => (
          <div key={section.title} className="mobile-settings-section">
            <h3 className="mobile-settings-section__title">{section.title}</h3>
            <div className="mobile-settings-section__content">
              {section.items.map((item) => (
                <div key={item.label} className="mobile-settings-row">
                  <span className="mobile-settings-row__label">{item.label}</span>
                  <span className="mobile-settings-row__value">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        <button onClick={handleLogout} className="mobile-settings__logout">
          Sign Out
        </button>
      </div>
    </MobileTemplate>
  );
};

export default MobileSettingsPage;