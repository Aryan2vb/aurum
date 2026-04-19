import React from 'react';
import { NavLink } from 'react-router-dom';
import Icon from '../../atoms/Icon/Icon';
import './MobileTemplate.css';

const navItems = [
  { iconName: 'home', label: 'Home', path: '/dashboard' },
  { iconName: 'customer', label: 'Customers', path: '/customers' },
  { iconName: 'udhar', label: 'Credits', path: '/credits' },
  { iconName: 'invoice', label: 'Invoices', path: '/invoices' },
  { iconName: 'settings', label: 'Settings', path: '/settings' },
];

const MobileTemplate = ({ children, title, headerAction }) => {
  return (
    <div className="mobile-template">
      <header className="mobile-header">
        <h1 className="mobile-header__title">{title}</h1>
        {headerAction && <div className="mobile-header__action">{headerAction}</div>}
      </header>
      <main className="mobile-content">
        {children}
      </main>
      <div className="mobile-nav-container">
        <nav className="mobile-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `mobile-nav__item ${isActive ? 'active' : ''}`}
            >
              <Icon name={item.iconName} size={22} color={({ isActive }) => isActive ? 'var(--color-accent)' : 'var(--text-secondary)'} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default MobileTemplate;