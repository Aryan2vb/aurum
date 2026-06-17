import React from 'react';
import Tab from '../../molecules/Tab/Tab';
import Button from '../../atoms/Button/Button';
import Icon from '../../atoms/Icon/Icon';
import Text from '../../atoms/Text/Text';
import './DashboardHeader.css';

const FirmLogo = ({ identity }) => {
  const [logoFailed, setLogoFailed] = React.useState(false);
  const logoUrl = identity?.logoUrl;
  const initials = identity?.initials || 'AU';

  React.useEffect(() => {
    setLogoFailed(false);
  }, [logoUrl]);

  if (logoUrl && !logoFailed) {
    return (
      <img
        className="firm-identity-logo-img"
        src={logoUrl}
        alt={`${identity?.displayName || 'Firm'} logo`}
        onError={() => setLogoFailed(true)}
      />
    );
  }

  return <span className="firm-identity-logo-fallback">{initials}</span>;
};

const FirmIdentityBadge = ({ identity }) => {
  if (!identity?.displayName) return null;

  return (
    <div className="firm-identity-badge" title={`Billing from ${identity.displayName}`}>
      <div className="firm-identity-logo">
        <FirmLogo identity={identity} />
      </div>
      <div className="firm-identity-copy">
        {/* <span className="firm-identity-kicker">Billing from</span> */}
        <span className="firm-identity-name">{identity.displayName}</span>
        {identity.metaLabel && (
          <span className="firm-identity-meta">{identity.metaLabel}</span>
        )}
      </div>
    </div>
  );
};

const DashboardHeader = ({
  title = 'Dashboard',
  tabs = ['Overview', 'Sales', 'Order'],
  activeTab,
  onTabChange,
  firmIdentity,
}) => {
  const showTabs = Array.isArray(tabs) && tabs.length > 0;

  return (
    <div className="dashboard-header">
      <div className="header-top">
        <Text variant="heading" weight="bold">{title}</Text>
        <div className="header-right">
          <FirmIdentityBadge identity={firmIdentity} />
          <div className="header-actions">
            <button className="header-action-btn">
              <Icon name="share" size={20} />
            </button>
            <button className="header-action-btn">
              <Icon name="notification" size={20} />
            </button>
            <div className="user-avatars">
              <div className="avatar">
                <Icon name="customer" size={16} />
              </div>
              <div className="avatar">
                <Icon name="customer" size={16} />
              </div>
              <div className="avatar-more">+3</div>
            </div>
            <button className="header-action-btn">
              <Icon name="add" size={20} />
            </button>
            <Button variant="secondary" size="small">
              Customize Widget
            </Button>
          </div>
        </div>
      </div>
      {showTabs && (
        <div className="header-tabs">
          <div className="tabs-container">
            {tabs.map((tab) => (
              <Tab
                key={tab}
                label={tab}
                active={activeTab === tab}
                onClick={() => onTabChange(tab)}
              />
            ))}
          </div>
          <Button variant="secondary" size="small">
            + Add Widget
          </Button>
        </div>
      )}
    </div>
  );
};

export default DashboardHeader;
