import React from 'react';
import './TableSkeleton.css';

const TableSkeleton = ({ rows = 10, columns = 8 }) => {
  return (
    <div className="table-skeleton">
      {[...Array(rows)].map((_, rowIndex) => (
        <div key={rowIndex} className="table-skeleton-row">
          {[...Array(columns)].map((_, colIndex) => (
            <div key={colIndex} className="table-skeleton-cell">
              <div className="table-skeleton-shimmer" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default TableSkeleton;
