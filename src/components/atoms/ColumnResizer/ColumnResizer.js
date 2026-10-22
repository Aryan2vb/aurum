import React from 'react';
import './ColumnResizer.css';

const RESIZING_CLASS = 'is-col-resizing';

/** Drag handle for a TanStack <th>. Double-click resets the column width. */
const ColumnResizer = ({ header }) => {
  if (!header.column.getCanResize()) return null;

  const startResize = (event) => {
    document.body.classList.add(RESIZING_CLASS);
    const stop = () => {
      document.body.classList.remove(RESIZING_CLASS);
      window.removeEventListener('mouseup', stop);
      window.removeEventListener('touchend', stop);
    };
    window.addEventListener('mouseup', stop);
    window.addEventListener('touchend', stop);
    header.getResizeHandler()(event);
  };

  return (
    <div
      className={`col-resizer${header.column.getIsResizing() ? ' is-resizing' : ''}`}
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize ${header.column.id} column`}
      onMouseDown={startResize}
      onTouchStart={startResize}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={() => header.column.resetSize()}
    />
  );
};

export default ColumnResizer;
