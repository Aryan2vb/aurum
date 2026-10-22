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
import { getInvoiceSettings } from '../../../services/invoicesService';
import {
  FIRM_IDENTITY_CACHE_EVENT,
  buildFirmIdentity,
  readFirmIdentitySettingsCache,
  writeFirmIdentitySettingsCache,
} from '../../../utils/firmIdentity';
import './DashboardTemplate.css';

const getFallbackOrganizationName = () => localStorage.getItem('organizationName') || 'Aurum';

const DashboardTemplate = ({ children, headerTitle = 'Dashboard', headerTabs }) => {
  const [firmIdentity, setFirmIdentity] = React.useState(() =>
    buildFirmIdentity(readFirmIdentitySettingsCache() || {}, getFallbackOrganizationName())
  );

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

  React.useEffect(() => {
    let cancelled = false;

    const applyCachedIdentity = () => {
      const cachedSettings = readFirmIdentitySettingsCache();
      if (!cachedSettings) return false;
      setFirmIdentity(buildFirmIdentity(cachedSettings, getFallbackOrganizationName()));
      return true;
    };

    const loadFirmIdentity = async () => {
      if (applyCachedIdentity()) return;

      try {
        const settings = await getInvoiceSettings();
        if (!cancelled) {
          writeFirmIdentitySettingsCache(settings);
          setFirmIdentity(buildFirmIdentity(settings, getFallbackOrganizationName()));
        }
      } catch (error) {
        if (!cancelled) setFirmIdentity(buildFirmIdentity({}, getFallbackOrganizationName()));
      }
    };

    const handleFirmIdentityCacheChange = () => {
      if (!applyCachedIdentity()) {
        setFirmIdentity(buildFirmIdentity({}, getFallbackOrganizationName()));
      }
    };

    window.addEventListener(FIRM_IDENTITY_CACHE_EVENT, handleFirmIdentityCacheChange);
    loadFirmIdentity();
    return () => {
      cancelled = true;
      window.removeEventListener(FIRM_IDENTITY_CACHE_EVENT, handleFirmIdentityCacheChange);
    };
  }, []);

  React.useEffect(() => {
    document.title = firmIdentity.documentTitle || 'Aurum';
    return () => {
      document.title = 'Aurum';
    };
  }, [firmIdentity.documentTitle]);

  return (
    <div className="dashboard-template" style={{ '--sidebar-width': sidebarCollapsed ? '60px' : '220px' }}>
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggleCollapse={handleSidebarToggle}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
        firmIdentity={firmIdentity}
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
          firmIdentity={firmIdentity}
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
