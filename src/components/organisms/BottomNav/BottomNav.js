import React from 'react';
import { NavLink } from 'react-router-dom';
import Icon from '../../atoms/Icon/Icon';
import './BottomNav.css';

const navItems = [
  { iconName: 'add', label: 'New Invoice', path: '/invoices/new' },
  { iconName: 'customer', label: 'Customers', path: '/customers' },
  { iconName: 'udhar', label: 'Udhar', path: '/credits' },
  { iconName: 'reminder', label: 'Reminders', path: '/reminders' },
  { iconName: 'settings', label: 'Settings', path: '/settings' },
];

const BottomNav = () => {
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
