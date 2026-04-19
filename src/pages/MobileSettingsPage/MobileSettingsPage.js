import Icon from '../../components/atoms/Icon/Icon';

const MobileSettingsPage = () => {
  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  const settingsSections = [
    {
      title: 'Account',
      items: [
        { label: 'Organization', value: 'My Shop', icon: 'customer' },
        { label: 'Email', value: 'you@example.com', icon: 'invoice' },
        { label: 'Plan', value: 'Business Pro', icon: 'dollar' },
      ],
    },
    {
      title: 'App Settings',
      items: [
        { label: 'Theme', value: 'System Default', icon: 'settings' },
        { label: 'Notifications', value: 'On', icon: 'notification' },
      ],
    },
    {
      title: 'Support',
      items: [
        { label: 'Help Center', value: '', icon: 'checkCircle' },
        { label: 'Version', value: '2.4.0', icon: 'settings' },
      ],
    },
  ];

  return (
    <MobileTemplate title="Settings">
      <div className="mobile-settings">
        <header className="settings-profile-card glass-panel">
          <div className="profile-avatar">AS</div>
          <div className="profile-info">
            <h2>Aryan Soni</h2>
            <p>Admin • Aurum Enterprise</p>
          </div>
        </header>

        {settingsSections.map((section) => (
          <div key={section.title} className="mobile-settings-section">
            <h3 className="mobile-settings-section__title">{section.title}</h3>
            <div className="mobile-settings-section__content glass-panel">
              {section.items.map((item, idx) => (
                <div key={item.label} className={`mobile-settings-row ${idx === section.items.length - 1 ? '' : 'has-divider'}`}>
                  <div className="settings-item-left">
                    <div className="settings-icon-wrapper">
                      <Icon name={item.icon} size={18} />
                    </div>
                    <span className="mobile-settings-row__label">{item.label}</span>
                  </div>
                  <div className="settings-item-right">
                    <span className="mobile-settings-row__value">{item.value}</span>
                    <Icon name="arrowRight" size={12} color="var(--text-tertiary)" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="settings-footer">
          <button onClick={handleLogout} className="mobile-settings__logout">
            <Icon name="logout" size={18} />
            <span>Sign Out</span>
          </button>
          <p className="footer-version">Designed with elegance by Antigravity</p>
        </div>
      </div>
    </MobileTemplate>
  );
};

export default MobileSettingsPage;


// export default MobileSettingsPage;