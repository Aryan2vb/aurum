import React from 'react';
import './TimelineSkeleton.css';

const TimelineSkeleton = () => {
  return (
    <div className="timeline-skeleton">
      <div className="timeline-skeleton-line" />
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="timeline-skeleton-event">
          <div className="timeline-skeleton-marker" />
          <div className="timeline-skeleton-content">
            <div className="timeline-skeleton-header">
              <div className="timeline-skeleton-bar timeline-skeleton-title" />
              <div className="timeline-skeleton-bar timeline-skeleton-date" />
            </div>
            <div className="timeline-skeleton-bar timeline-skeleton-description" />
            <div className="timeline-skeleton-bar timeline-skeleton-amount" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default TimelineSkeleton;
