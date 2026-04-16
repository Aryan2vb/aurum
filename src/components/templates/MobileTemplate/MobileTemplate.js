import React from 'react';
import { NavLink } from 'react-router-dom';
import Icon from '../../atoms/Icon/Icon';
import './MobileTemplate.css';

const navItems = [
  { iconName: 'home', label: 'Home', path: '/mobile/dashboard' },
  { iconName: 'customer', label: 'Customers', path: '/mobile/customers' },
  { iconName: 'udhar', label: 'Credits', path: '/mobile/credits' },
  { iconName: 'invoice', label: 'Invoices', path: '/mobile/invoices' },
  { iconName: 'settings', label: 'Settings', path: '/mobile/settings' },
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
      <nav className="mobile-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `mobile-nav__item ${isActive ? 'active' : ''}`}
          >
            <Icon name={item.iconName} size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default MobileTemplate;