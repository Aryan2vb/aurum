import React, { useState } from 'react';
import Icon from '../../atoms/Icon/Icon';
import Text from '../../atoms/Text/Text';
import './FilterPanel.css';

const FilterPanel = ({ filters, onFiltersChange, onClose }) => {
  const [localFilters, setLocalFilters] = useState(filters);

  const filterOptions = {
    status: ['ACTIVE', 'INACTIVE', 'PENDING', 'SUSPENDED'],
    gender: ['MALE', 'FEMALE', 'OTHER'],
  };

  const handleFilterChange = (key, value, checked) => {
    const newFilters = { ...localFilters };
    if (!newFilters[key]) {
      newFilters[key] = [];
    }
    
    if (checked) {
      newFilters[key] = [...newFilters[key], value];
    } else {
      newFilters[key] = newFilters[key].filter((v) => v !== value);
    }
    
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearFilter = (key) => {
    const newFilters = { ...localFilters };
    delete newFilters[key];
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    setLocalFilters({});
    onFiltersChange({});
  };

  const activeFilterCount = Object.keys(localFilters).reduce(
    (count, key) => count + (localFilters[key]?.length || 0),
    0
  );

  return (
    <div className="filter-panel-overlay" onClick={onClose}>
      <div className="filter-panel" onClick={(e) => e.stopPropagation()}>
        <div className="filter-panel-header">
          <Text variant="body" weight="bold">Filters</Text>
          <button className="filter-panel-close" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="filter-panel-content">
          {activeFilterCount > 0 && (
            <div className="filter-panel-clear-all">
              <button onClick={clearAllFilters}>Clear all</button>
            </div>
          )}

          <div className="filter-section">
            <Text variant="small" weight="medium" color="var(--text-secondary)">
              Status
            </Text>
            <div className="filter-options">
              {filterOptions.status.map((option) => (
                <label key={option} className="filter-option">
                  <input
                    type="checkbox"
                    checked={localFilters.status?.includes(option) || false}
                    onChange={(e) => handleFilterChange('status', option, e.target.checked)}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
            {localFilters.status?.length > 0 && (
              <button
                className="filter-clear"
                onClick={() => clearFilter('status')}
              >
                Clear
              </button>
            )}
          </div>

          <div className="filter-section">
            <Text variant="small" weight="medium" color="var(--text-secondary)">
              Gender
            </Text>
            <div className="filter-options">
              {filterOptions.gender.map((option) => (
                <label key={option} className="filter-option">
                  <input
                    type="checkbox"
                    checked={localFilters.gender?.includes(option) || false}
                    onChange={(e) => handleFilterChange('gender', option, e.target.checked)}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
            {localFilters.gender?.length > 0 && (
              <button
                className="filter-clear"
                onClick={() => clearFilter('gender')}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;
