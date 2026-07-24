import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../../contexts/ThemeContext';
import { clearSession, logout as logoutRequest } from '../../../services/authService';
import { usePermission } from '../../../hooks/usePermission';
import Icon from '../../atoms/Icon/Icon';
import './Sidebar.css';

const SidebarFirmLogo = ({ identity, className = '' }) => {
  const [logoFailed, setLogoFailed] = useState(false);
  const logoUrl = identity?.logoUrl;
  const initials = identity?.initials || 'AU';

  useEffect(() => {
    setLogoFailed(false);
  }, [logoUrl]);

  if (logoUrl && !logoFailed) {
    return (
      <img
        className={`attio-firm-logo-img ${className}`}
        src={logoUrl}
        alt={`${identity?.displayName || 'Firm'} logo`}
        onError={() => setLogoFailed(true)}
      />
    );
  }

  return <span className={`attio-firm-logo-fallback ${className}`}>{initials}</span>;
};

const Sidebar = ({ collapsed, onToggleCollapse, mobileOpen, onMobileClose, firmIdentity }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toggleTheme, isDark } = useTheme();
  const [loggingOut, setLoggingOut] = useState(false);
  const [workspaceDropdownOpen, setWorkspaceDropdownOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    sales: true,
    inventory: true,
    finance: true,
  });
  const dropdownRef = useRef(null);
  const accountMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setWorkspaceDropdownOpen(false);
      }
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target)) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logoutRequest(localStorage.getItem('authToken'));
    } catch (e) {}
      clearSession();
      setLoggingOut(false);
      navigate('/login');
  };

  const workspaceName = firmIdentity?.displayName || localStorage.getItem('organizationName') || 'Aurum';
  const userFullName = localStorage.getItem('userFullName') || 'Aurum user';
  const userEmail = localStorage.getItem('userEmail') || 'user@example.com';
  const { can } = usePermission();
  const canWrite = can('write');

  const navigationGroups = [
    {
      id: 'sales',
      label: 'Sales',
      iconName: 'analytics',
      items: [
        { iconName: 'customer', label: 'Customers', path: '/customers', color: '#3b82f6' },
        { iconName: 'udhar', label: 'Udhar', path: '/credits', color: '#f59e0b' },
        { iconName: 'advance', label: 'Advance', path: '/advance', color: '#10b981' },
        { iconName: 'invoice', label: 'Invoice Table', path: '/invoices', color: '#14b8a6' },
        ...(canWrite
          ? [{ iconName: 'add', label: 'Create Invoice', path: '/invoices/new', color: '#f97316' }]
          : []),
      ],
    },
    {
      id: 'inventory',
      label: 'Inventory',
      iconName: 'product',
      items: [
        { iconName: 'product', label: 'Stock', path: '/stock', color: '#8b5cf6' },
        { iconName: 'order', label: 'Purchases', path: '/purchases', color: '#ec4899' },
      ],
    },
    {
      id: 'finance',
      label: 'Finance',
      iconName: 'book',
      items: [
        { iconName: 'book', label: 'Cash & Bank', path: '/books', color: '#0f766e' },
        { iconName: 'dashboard', label: 'Reports', path: '/reports', color: '#64748b' },
      ],
    },
  ];
  const records = navigationGroups.flatMap((group) => group.items);
  const isItemActive = (item) => {
    if (location.pathname === item.path) return true;
    if (item.path === '/invoices' && location.pathname === '/invoices/new') return false;
    return location.pathname.startsWith(`${item.path}/`);
  };
  const goTo = (path) => {
    navigate(path);
    onMobileClose?.();
  };

  // Collapsed sidebar (on desktop only)
  if (collapsed && !mobileOpen) {
    return (
      <div className="attio-sidebar attio-sidebar-collapsed">
        <button className="attio-collapse-btn" onClick={onToggleCollapse} title="Expand sidebar">
          <Icon name="sidebar" size={18} />
        </button>
        <div className="attio-collapsed-workspace" title={workspaceName}>
          <SidebarFirmLogo identity={firmIdentity} />
        </div>
        <div className="attio-collapsed-nav">
          {records.map((item) => (
            <button
              key={item.path}
              className={`attio-collapsed-item ${isItemActive(item) ? 'active' : ''}`}
              onClick={() => goTo(item.path)}
              title={item.label}
              style={{ color: isItemActive(item) ? item.color : undefined }}
            >
              <Icon name={item.iconName} size={18} />
            </button>
          ))}
        </div>
        <div className="attio-collapsed-footer">
          <button
            className={`attio-collapsed-item ${location.pathname === '/settings' ? 'active' : ''}`}
            onClick={() => goTo('/settings')}
            title="Settings"
          >
            <Icon name="settings" size={18} />
          </button>
          <button className="attio-collapsed-item" onClick={toggleTheme} title={isDark ? 'Light mode' : 'Dark mode'}>
            <Icon name={isDark ? 'sun' : 'moon'} size={16} />
          </button>
          <button className="attio-collapsed-item" onClick={handleLogout} disabled={loggingOut} title="Logout">
            <Icon name="logout" size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`attio-sidebar ${mobileOpen ? 'open' : ''}`}>
      <div className="attio-workspace-header" ref={dropdownRef}>
        <button 
          className="attio-workspace-btn"
          onClick={() => setWorkspaceDropdownOpen(!workspaceDropdownOpen)}
        >
          <div className="attio-workspace-icon">
            <SidebarFirmLogo identity={firmIdentity} />
          </div>
          <span className="attio-workspace-name">{workspaceName}</span>
          <Icon name="chevronDown" size={12} />
        </button>
        <button className="attio-collapse-btn" onClick={onToggleCollapse} title="Collapse sidebar">
          <Icon name="collapse" size={18} />
        </button>
        
        {workspaceDropdownOpen && (
          <div className="attio-workspace-dropdown">
            <div className="attio-dropdown-user">
              <div className="attio-user-avatar">
                <SidebarFirmLogo identity={firmIdentity} />
              </div>
              <div className="attio-user-info">
                <span className="attio-user-email">{userEmail}</span>
                <span className="attio-user-workspace">{workspaceName}</span>
                {firmIdentity?.metaLabel && (
                  <span className="attio-user-firm-meta">{firmIdentity.metaLabel}</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="attio-search-container">
        <button className="attio-search-btn">
          <Icon name="search" size={16} />
          <span>Search...</span>
          <span className="attio-shortcut">/</span>
        </button>
      </div>

      <div className="attio-navigation">
        <div className="attio-navigation-label">Workspace</div>
        {navigationGroups.map((group) => (
          <div className="attio-section" key={group.id}>
            <button
              className="attio-section-header"
              onClick={() => toggleSection(group.id)}
              aria-expanded={expandedSections[group.id]}
            >
              <span className={`attio-section-chevron ${expandedSections[group.id] ? 'expanded' : ''}`}>
                <Icon name="arrowRight" size={14} />
              </span>
              <span className="attio-section-group-icon">
                <Icon name={group.iconName} size={17} />
              </span>
              <span className="attio-section-title">{group.label}</span>
            </button>
            {expandedSections[group.id] && (
              <div className="attio-section-content">
                {group.items.map((item) => (
                  <button
                    key={item.path}
                    className={`attio-record-item ${isItemActive(item) ? 'active' : ''}`}
                    onClick={() => goTo(item.path)}
                  >
                    <span className="attio-record-icon" style={{ color: item.color }}>
                      <Icon name={item.iconName} size={17} />
                    </span>
                    <span className="attio-record-label">{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <footer className="attio-sidebar-footer">
        <button
          className={`attio-settings-link ${location.pathname === '/settings' ? 'active' : ''}`}
          onClick={() => goTo('/settings')}
        >
          <Icon name="settings" size={18} />
          <span>Settings</span>
        </button>
        <div className="attio-profile-menu-wrap" ref={accountMenuRef}>
          {accountMenuOpen && (
            <div className="attio-profile-menu">
              <button onClick={toggleTheme}>
                <Icon name={isDark ? 'sun' : 'moon'} size={16} />
                <span>{isDark ? 'Light mode' : 'Dark mode'}</span>
              </button>
              <button className="danger" onClick={handleLogout} disabled={loggingOut}>
                <Icon name="logout" size={16} />
                <span>{loggingOut ? 'Signing out…' : 'Sign out'}</span>
              </button>
            </div>
          )}
          <button
            className="attio-profile-card"
            onClick={() => setAccountMenuOpen((open) => !open)}
            aria-expanded={accountMenuOpen}
          >
            <span className="attio-profile-avatar">
              <SidebarFirmLogo identity={firmIdentity} />
            </span>
            <span className="attio-profile-copy">
              <strong>{userFullName}</strong>
              <small>{userEmail}</small>
            </span>
            <Icon name={accountMenuOpen ? 'chevronDown' : 'chevronUp'} size={17} />
          </button>
        </div>
      </footer>
    </div>
  );
};

export default Sidebar;
