import React from 'react';
import './NameCell.css';

const NameCell = ({ name }) => {
  if (!name || name === 'N/A') {
    return <span className="name-cell-empty">N/A</span>;
  }

  // Get initials from name
  const getInitials = (nameStr) => {
    const parts = nameStr.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return nameStr.substring(0, 2).toUpperCase();
  };

  // Generate consistent color based on name
  const getColorForName = (nameStr) => {
    const colors = [
      { bg: '#3b82f6', text: '#ffffff' }, // Blue
      { bg: '#10b981', text: '#ffffff' }, // Green
      { bg: '#f59e0b', text: '#ffffff' }, // Yellow/Orange
      { bg: '#8b5cf6', text: '#ffffff' }, // Purple
      { bg: '#ef4444', text: '#ffffff' }, // Red
      { bg: '#06b6d4', text: '#ffffff' }, // Cyan
    ];
    const index = nameStr.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const initials = getInitials(name);
  const colors = getColorForName(name);

  return (
    <div className="name-cell">
      <div
        className="name-cell-avatar"
        style={{
          backgroundColor: colors.bg,
          color: colors.text,
        }}
        title={name}
      >
        {initials}
      </div>
      <span className="name-cell-text">{name}</span>
    </div>
  );
};

export default NameCell;
