import React from 'react';
import Sidebar from '../../organisms/Sidebar/Sidebar';
import BottomNav from '../../organisms/BottomNav/BottomNav';
import Icon from '../../atoms/Icon/Icon';
import './DashboardTemplate.css';

const DashboardTemplate = ({ children }) => {
  // Persist sidebar collapsed state in localStorage
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved === 'true';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  // Only toggle collapse, don't affect mobile menu
  const handleSidebarToggle = () => {
    setSidebarCollapsed(prev => {
      const newValue = !prev;
      localStorage.setItem('sidebarCollapsed', String(newValue));
      return newValue;
    });
  };

  return (
    <div className="dashboard-template">
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggleCollapse={handleSidebarToggle}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      {mobileMenuOpen && (
        <div 
          className="mobile-overlay"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      <div className="dashboard-main">
        <button 
          className="mobile-menu-button"
          onClick={() => setMobileMenuOpen(true)}
        >
          <Icon name="menu" size={24} />
        </button>
        <div className="dashboard-content">
          {children}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default DashboardTemplate;
