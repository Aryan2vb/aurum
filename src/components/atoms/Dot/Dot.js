import React from 'react';
import './Dot.css';

const Dot = ({ color, className = '' }) => {
  return (
    <span
      className={`dot ${className}`}
      style={{ backgroundColor: color }}
    />
  );
};

export default Dot;

