import React from 'react';
import Sidebar from '../../organisms/Sidebar/Sidebar';
import DashboardHeader from '../../organisms/DashboardHeader/DashboardHeader';
import BottomNav from '../../organisms/BottomNav/BottomNav';
// import MetricGrid from '../../organisms/MetricGrid/MetricGrid';
// import SalesPerformanceWidget from '../../organisms/SalesPerformanceWidget/SalesPerformanceWidget';
// import AnalyticsChart from '../../organisms/AnalyticsChart/AnalyticsChart';
// import VisitHeatmap from '../../organisms/VisitHeatmap/VisitHeatmap';
// import VisitDonutChart from '../../organisms/VisitDonutChart/VisitDonutChart';
// import EmptyWidget from '../../organisms/EmptyWidget/EmptyWidget';
import Icon from '../../atoms/Icon/Icon';
import './DashboardTemplate.css';

const DashboardTemplate = ({ children, headerTitle = 'Dashboard', headerTabs }) => {
  // Persist sidebar collapsed state in localStorage
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved === 'true';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const defaultTabs = headerTabs ?? ['Overview', 'Sales', 'Order'];
  const [activeTab, setActiveTab] = React.useState(defaultTabs[0] || null);

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
        <DashboardHeader 
          title={headerTitle}
          tabs={defaultTabs}
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
        />
        <div className="dashboard-content">
          {children}

          {/* {children || (
            <>
              <MetricGrid />
              <div className="widgets-row">
                <SalesPerformanceWidget />
                <AnalyticsChart />
              </div>
              <div className="widgets-row">
                <EmptyWidget />
              </div>
              <div className="widgets-row">
                <VisitHeatmap />
                <VisitDonutChart />
              </div>
            </>
          )} */}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default DashboardTemplate;
