import React from 'react';
import './EmailCell.css';

const EmailCell = ({ email }) => {
  if (!email || email === 'N/A') {
    return <span className="email-cell-empty">N/A</span>;
  }

  return (
    <span className="email-cell">
      {email}
    </span>
  );
};

export default EmailCell;
