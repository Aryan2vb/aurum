import React from 'react';
import './AvatarCell.css';

const AvatarCell = ({ email }) => {
  if (!email || email === 'N/A') {
    return <span className="avatar-cell-empty">N/A</span>;
  }

  // Get initials from email
  const getInitials = (emailStr) => {
    const parts = emailStr.split('@')[0].split(/[._-]/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return emailStr.substring(0, 2).toUpperCase();
  };

  const initials = getInitials(email);

  return (
    <div className="avatar-cell">
      <div className="avatar-cell-avatar" title={email}>
        {initials}
      </div>
      <span className="avatar-cell-email">{email}</span>
    </div>
  );
};

export default AvatarCell;
