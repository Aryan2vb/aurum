import React from 'react';
import { NavLink } from 'react-router-dom';
import Icon from '../../atoms/Icon/Icon';
import './BottomNav.css';

const allNavItems = [
  { iconName: 'analytics', label: 'Dashboard', path: '/dashboard' },
  { iconName: 'add', label: 'New Invoice', path: '/invoices/new' },
  { iconName: 'dashboard', label: 'Analytics', path: '/analytics' },
  { iconName: 'file', label: 'Reports', path: '/reports' },
  { iconName: 'reminder', label: 'Alerts', path: '/alerts' },
];

const BottomNav = () => {
  const userRole = localStorage.getItem('userRole');
  const navItems = allNavItems.filter((item) => {
    if (item.label === 'Reports' && userRole !== 'OWNER') return false;
    if ((item.label === 'Dashboard' || item.label === 'Analytics' || item.label === 'Alerts') && !['OWNER', 'ADMIN'].includes(userRole)) return false;
    return true;
  });

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) => 
            `bottom-nav-item ${isActive ? 'active' : ''}`
          }
        >
          <div className="bottom-nav-icon">
            <Icon name={item.iconName} size={24} />
          </div>
          <span className="bottom-nav-label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
};

export default BottomNav;
