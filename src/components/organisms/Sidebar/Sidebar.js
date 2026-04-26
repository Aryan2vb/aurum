import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../../contexts/ThemeContext';
import { logout as logoutRequest } from '../../../services/authService';
import Icon from '../../atoms/Icon/Icon';
import './Sidebar.css';

const Sidebar = ({ collapsed, onToggleCollapse, mobileOpen, onMobileClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toggleTheme, isDark } = useTheme();
  const [loggingOut, setLoggingOut] = useState(false);
  const [workspaceDropdownOpen, setWorkspaceDropdownOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    records: true,
  });
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setWorkspaceDropdownOpen(false);
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
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userEmail');
      setLoggingOut(false);
      navigate('/login');
  };

  const workspaceName = localStorage.getItem('organizationName') || 'Aurum';
  const userEmail = localStorage.getItem('userEmail') || 'user@example.com';
  const userRole = localStorage.getItem('userRole');

  const records = [
    // { iconName: 'dashboard', label: 'Dashboard', path: '/dashboard', color: '#8b5cf6' },
    { iconName: 'customer', label: 'Customers', path: '/customers', color: '#3b82f6' },
    { iconName: 'udhar', label: 'Udhar', path: '/credits', color: '#f59e0b' },
    { iconName: 'reminder', label: 'Reminders', path: '/reminders', color: '#10b981' },
    { iconName: 'invoice', label: 'Invoice Table', path: '/invoices', color: '#14b8a6' },
    { iconName: 'add', label: 'Create Invoice', path: '/invoices/new', color: '#f97316' },
    { iconName: 'dashboard', label: 'Reports', path: '/reports', color: '#8b5cf6' },
  ].filter(item => {
    if (item.label === 'Reports' && userRole !== 'OWNER') return false;
    return true;
  });

  // Collapsed sidebar (on desktop only)
  if (collapsed && !mobileOpen) {
    return (
      <div className="attio-sidebar attio-sidebar-collapsed">
        <button className="attio-collapse-btn" onClick={onToggleCollapse} title="Expand sidebar">
          <Icon name="sidebar" size={18} />
        </button>
        <div className="attio-collapsed-nav">
          {records.map((item, idx) => (
            <button
              key={idx}
              className={`attio-collapsed-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => item.path && navigate(item.path)}
              title={item.label}
              style={{ color: location.pathname === item.path ? item.color : undefined }}
            >
              <Icon name={item.iconName} size={18} />
            </button>
          ))}
        </div>
        <div className="attio-collapsed-footer">
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
      {/* Workspace Header with Dropdown */}
      <div className="attio-workspace-header" ref={dropdownRef}>
        <button 
          className="attio-workspace-btn"
          onClick={() => setWorkspaceDropdownOpen(!workspaceDropdownOpen)}
        >
          <div className="attio-workspace-icon">
            <Icon name="workspace" size={20} />
          </div>
          <span className="attio-workspace-name">{workspaceName}</span>
          <Icon name="chevronDown" size={12} />
        </button>
        <button className="attio-collapse-btn" onClick={onToggleCollapse} title="Collapse sidebar">
          <Icon name="collapse" size={18} />
        </button>
        
        {/* Workspace Dropdown */}
        {workspaceDropdownOpen && (
          <div className="attio-workspace-dropdown">
            <div className="attio-dropdown-user">
              <div className="attio-user-avatar">
                <Icon name="user" size={16} />
              </div>
              <div className="attio-user-info">
                <span className="attio-user-email">{userEmail}</span>
                <span className="attio-user-workspace">{workspaceName}</span>
              </div>
            </div>
            <div className="attio-dropdown-divider" />
            <button
              className="attio-dropdown-item"
              onClick={() => { navigate('/settings'); setWorkspaceDropdownOpen(false); }}
            >
              <Icon name="settings" size={18} />
              <span>Settings</span>
            </button>
            <div className="attio-dropdown-divider" />
            <button 
              className="attio-dropdown-item attio-dropdown-signout" 
              onClick={handleLogout}
              disabled={loggingOut}
            >
              <Icon name="logout" size={18} />
              <span>{loggingOut ? 'Signing out...' : 'Sign out'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="attio-search-container">
        <button className="attio-search-btn">
          <Icon name="search" size={16} />
          <span>Search...</span>
          <span className="attio-shortcut">/</span>
        </button>
      </div>

      {/* Records Section */}
      <div className="attio-section">
        <button className="attio-section-header" onClick={() => toggleSection('records')}>
          <span className={`attio-section-chevron ${expandedSections.records ? 'expanded' : ''}`}>
            <Icon name="arrowRight" size={12} />
          </span>
          <span className="attio-section-title">Records</span>
        </button>
        {expandedSections.records && (
          <div className="attio-section-content">
            {records.map((item, idx) => (
              <button 
                key={idx}
                className={`attio-record-item ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => item.path && navigate(item.path)}
              >
                <span className="attio-record-icon" style={{ color: item.color }}>
                  <Icon name={item.iconName} size={18} />
                </span>
                <span className="attio-record-label">{item.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Spacer */}
      <div className="attio-spacer" />
    </div>
  );
};

export default Sidebar;
