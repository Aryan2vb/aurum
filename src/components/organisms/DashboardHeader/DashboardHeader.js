import React from 'react';
import { useNavigate } from 'react-router-dom';
import Tab from '../../molecules/Tab/Tab';
import Button from '../../atoms/Button/Button';
import Icon from '../../atoms/Icon/Icon';
import Text from '../../atoms/Text/Text';
import AmountDisplay from '../../atoms/AmountDisplay/AmountDisplay';
import DateDisplay from '../../atoms/DateDisplay/DateDisplay';
import { getDueReminders } from '../../../services/creditsService';
import { getOrganizationMembers } from '../../../services/organizationService';
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

const ROLE_LABELS = { OWNER: 'Owner', ADMIN: 'Admin', STAFF: 'Staff', VIEWER: 'Viewer' };
const AVATAR_COLORS = [
  { bg: '#7c3aed', border: '#8b5cf6', text: '#fff' },   // violet
  { bg: '#0d9488', border: '#14b8a6', text: '#fff' },   // teal
  { bg: '#2563eb', border: '#3b82f6', text: '#fff' },   // blue
  { bg: '#dc2626', border: '#ef4444', text: '#fff' },   // red
  { bg: '#d97706', border: '#f59e0b', text: '#fff' },   // amber
  { bg: '#059669', border: '#10b981', text: '#fff' },   // emerald
  { bg: '#7c3aed', border: '#a78bfa', text: '#fff' },   // purple
  { bg: '#db2777', border: '#ec4899', text: '#fff' },   // pink
];

const TeamAvatars = () => {
  const navigate = useNavigate();
  const [members, setMembers] = React.useState(() => {
    // Load from sessionStorage on first render — avoids API call on every page switch
    try {
      const cached = sessionStorage.getItem('aurum.team.members');
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [hoveredId, setHoveredId] = React.useState(null);

  React.useEffect(() => {
    // Only fetch if cache is empty
    if (members.length > 0) return;
    let cancelled = false;
    getOrganizationMembers()
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];
        setMembers(list);
        try { sessionStorage.setItem('aurum.team.members', JSON.stringify(list)); } catch {}
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!members.length) return null;

  const getInitial = (m) => {
    const name = m.fullName || m.email || '?';
    return name.charAt(0).toUpperCase();
  };

  const getName = (m) => m.fullName || m.email || 'Unknown';

  return (
    <div className="team-stack">
      {members.slice(0, 4).map((m, i) => {
        const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
        return (
          <div
            key={m.id}
            className={`team-stack-avatar ${hoveredId === m.id ? 'team-stack-avatar-hovered' : ''}`}
            style={{
              zIndex: hoveredId === m.id ? 50 : members.length - i,
              background: color.bg,
              borderColor: color.border,
            }}
            onMouseEnter={() => setHoveredId(m.id)}
            onMouseLeave={() => setHoveredId(null)}
            onClick={() => navigate('/settings')}
          >
            <span className="team-stack-initial" style={{ color: color.text }}>{getInitial(m)}</span>

            {hoveredId === m.id && (
              <div className="team-popover">
                <span className="team-popover-name">{getName(m)}</span>
                <span className="team-popover-role">{ROLE_LABELS[m.role] || m.role}</span>
              </div>
            )}
          </div>
        );
      })}
      {members.length > 4 && (
        <div
          className="team-stack-avatar team-stack-more"
          style={{ zIndex: 0 }}
          onClick={() => navigate('/settings')}
        >
          <span className="team-stack-initial">+{members.length - 4}</span>
        </div>
      )}
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
  const navigate = useNavigate();
  const showTabs = Array.isArray(tabs) && tabs.length > 0;

  const [bellOpen, setBellOpen] = React.useState(false);
  const [reminders, setReminders] = React.useState([]);
  const [remindersLoading, setRemindersLoading] = React.useState(false);
  const bellRef = React.useRef(null);

  // Close card on outside click
  React.useEffect(() => {
    if (!bellOpen) return;
    const handleClick = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [bellOpen]);

  // Fetch reminders when card opens
  React.useEffect(() => {
    if (!bellOpen) return;
    let cancelled = false;
    (async () => {
      try {
        setRemindersLoading(true);
        const data = await getDueReminders(14);
        if (!cancelled) setReminders(Array.isArray(data) ? data.slice(0, 6) : []);
      } catch { if (!cancelled) setReminders([]); }
      finally { if (!cancelled) setRemindersLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [bellOpen]);

  return (
    <div className="dashboard-header">
      <div className="header-top">
        <Text variant="heading" weight="bold">{title}</Text>
        <div className="header-right">
          <FirmIdentityBadge identity={firmIdentity} />
            <button className="header-action-btn">
              <Icon name="share" size={20} />
            </button>

            {/* Bell with dropdown */}
            <div className="header-bell-wrap" ref={bellRef}>
              <button
                className={`header-action-btn header-bell-btn ${bellOpen ? 'header-bell-active' : ''}`}
                onClick={() => setBellOpen(v => !v)}
                title="Reminders"
              >
                <Icon name="notification" size={20} />
                {!bellOpen && reminders.length > 0 && (
                  <span className="header-bell-dot" />
                )}
              </button>

              {bellOpen && (
                <div className="header-bell-card">
                  <div className="header-bell-card-header">
                    <span className="header-bell-card-title">Due Reminders</span>
                    <button className="header-bell-card-link" onClick={() => { setBellOpen(false); navigate('/reminders'); }}>
                      View all →
                    </button>
                  </div>
                  <div className="header-bell-card-body">
                    {remindersLoading ? (
                      <p className="header-bell-card-empty">Loading…</p>
                    ) : reminders.length === 0 ? (
                      <p className="header-bell-card-empty">No upcoming reminders 🎉</p>
                    ) : (
                      reminders.map((r) => {
                        const name = r.customer?.fullName || 'Customer';
                        const remaining = Number(r.amount || 0) - Number(r.paidAmount || 0);
                        return (
                          <div key={r.id} className="header-bell-card-item" onClick={() => { setBellOpen(false); navigate(`/credits/${r.id}`); }}>
                            <div className="header-bell-card-item-info">
                              <span className="header-bell-card-item-name">{name}</span>
                              <span className="header-bell-card-item-desc">
                                {r.ledgerEntry?.description || 'Udhar'}
                              </span>
                            </div>
                            <div className="header-bell-card-item-right">
                              <AmountDisplay value={remaining} size="sm" variant="negative" />
                              {r.dueDate && <DateDisplay date={r.dueDate} format="relative" size="sm" />}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <TeamAvatars />
            <button className="header-action-btn">
              <Icon name="add" size={20} />
            </button>
            <div className="header-customize-widget">
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
