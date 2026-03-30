import React from 'react';
import Icon from '../../atoms/Icon/Icon';
import Text from '../../atoms/Text/Text';
import DragHandle from '../../atoms/DragHandle/DragHandle';
import './ColumnCustomizer.css';

const ColumnCustomizer = ({ 
  columns, 
  visibleColumns, 
  onToggleColumn, 
  onReorderColumns,
  onClose 
}) => {
  const handleToggle = (columnId) => {
    onToggleColumn(columnId);
  };

  const handleHideAll = () => {
    visibleColumns.forEach(colId => {
      if (colId !== 'fullName') { // Keep at least one column visible
        onToggleColumn(colId);
      }
    });
  };

  const shownColumns = columns.filter(col => visibleColumns.includes(col.id));
  const hiddenColumns = columns.filter(col => !visibleColumns.includes(col.id));

  return (
    <div className="column-customizer-overlay" onClick={onClose}>
      <div className="column-customizer-sidebar" onClick={(e) => e.stopPropagation()}>
        <div className="column-customizer-header">
          <Text variant="body" weight="bold">Customize view</Text>
          <button className="column-customizer-close" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="column-customizer-search">
          <Icon name="search" size={16} color="var(--text-tertiary)" />
          <input 
            type="text" 
            placeholder="Search" 
            className="column-customizer-search-input"
          />
          <button className="column-customizer-search-clear">
            <Icon name="close" size={14} />
          </button>
          <div className="column-customizer-search-nav">
            <Icon name="chevronUp" size={14} />
            <Icon name="chevronDown" size={14} />
          </div>
        </div>

        <div className="column-customizer-section">
          <div className="column-customizer-section-header">
            <Text variant="small" weight="medium" color="var(--text-secondary)">
              Shown
            </Text>
            <button 
              className="column-customizer-hide-all"
              onClick={handleHideAll}
            >
              Hide all
            </button>
          </div>
          <div className="column-customizer-list">
            {shownColumns.map((column) => (
              <div key={column.id} className="column-customizer-item">
                <div className="column-customizer-drag-handle">
                  <DragHandle />
                </div>
                <div className="column-customizer-item-icon">
                  <div className="column-icon-placeholder" />
                </div>
                <Text variant="small" className="column-customizer-item-label">
                  {column.header}
                </Text>
                <label className="column-customizer-toggle">
                  <input
                    type="checkbox"
                    checked={visibleColumns.includes(column.id)}
                    onChange={() => handleToggle(column.id)}
                  />
                  <span className="column-customizer-toggle-slider" />
                </label>
              </div>
            ))}
          </div>
        </div>

        {hiddenColumns.length > 0 && (
          <div className="column-customizer-section">
            <div className="column-customizer-section-header">
              <Text variant="small" weight="medium" color="var(--text-secondary)">
                Popular
              </Text>
            </div>
            <div className="column-customizer-list">
              {hiddenColumns.map((column) => (
                <div key={column.id} className="column-customizer-item">
                  <div className="column-customizer-drag-handle">
                    <DragHandle />
                  </div>
                  <div className="column-customizer-item-icon">
                    <div className="column-icon-placeholder" />
                  </div>
                  <Text variant="small" className="column-customizer-item-label">
                    {column.header}
                  </Text>
                  <label className="column-customizer-toggle">
                    <input
                      type="checkbox"
                      checked={visibleColumns.includes(column.id)}
                      onChange={() => handleToggle(column.id)}
                    />
                    <span className="column-customizer-toggle-slider" />
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ColumnCustomizer;
