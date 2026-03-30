import React from 'react';
import './DragHandle.css';

const DragHandle = ({ className = '' }) => {
  return (
    <div className={`drag-handle ${className}`}>
      <div className="drag-handle-dot" />
      <div className="drag-handle-dot" />
      <div className="drag-handle-dot" />
      <div className="drag-handle-dot" />
      <div className="drag-handle-dot" />
      <div className="drag-handle-dot" />
    </div>
  );
};

export default DragHandle;
