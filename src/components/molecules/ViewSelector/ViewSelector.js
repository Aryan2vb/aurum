import React from 'react';
import Dropdown, { DropdownItem } from '../../atoms/Dropdown/Dropdown';
import './ViewSelector.css';

/**
 * View selector dropdown for table views
 * @param {Object} props
 * @param {string} props.currentView - Current view name
 * @param {Array<{id: string, label: string}>} props.views - Available views
 * @param {function} props.onViewChange - View change handler
 */
const ViewSelector = ({ 
  currentView = 'All', 
  views = [{ id: 'all', label: 'All' }],
  onViewChange 
}) => {
  const current = views.find(v => v.id === currentView) || views[0];

  const trigger = ({ isOpen }) => (
    <button className={`view-selector-btn ${isOpen ? 'open' : ''}`}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
      <span>{current?.label}</span>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m6 9 6 6 6-6"/>
      </svg>
    </button>
  );

  return (
    <Dropdown className="view-selector" trigger={trigger}>
      {({ close }) => (
        <>
          {views.map(view => (
            <DropdownItem
              key={view.id}
              active={view.id === currentView}
              onClick={() => {
                onViewChange?.(view.id);
                close();
              }}
            >
              {view.label}
            </DropdownItem>
          ))}
        </>
      )}
    </Dropdown>
  );
};

export default ViewSelector;
