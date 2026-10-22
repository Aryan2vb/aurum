import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Shared column-resize state for TanStack tables.
 * - persists widths per `storageKey`
 * - applies drag updates once per animation frame so resizing stays smooth on big tables
 *
 * Spread `resizeOptions` into `useReactTable({ ... })`, render <ColumnResizer header={header} />
 * in each <th>, and use `pinnedLeft(table, id)` for sticky columns whose offset depends on widths.
 */
export const useColumnResize = (storageKey) => {
  const [columnSizing, setColumnSizing] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey)) || {};
    } catch {
      return {};
    }
  });
  const frame = useRef(null);
  const pendingUpdater = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(columnSizing));
    } catch {
      /* storage unavailable */
    }
  }, [storageKey, columnSizing]);

  useEffect(() => () => frame.current && cancelAnimationFrame(frame.current), []);

  // TanStack calls this on every mousemove; only the latest update per frame is applied.
  const onColumnSizingChange = useCallback((updater) => {
    pendingUpdater.current = updater;
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const next = pendingUpdater.current;
      pendingUpdater.current = null;
      if (next) setColumnSizing(next);
    });
  }, []);

  return {
    columnSizing,
    resizeOptions: {
      enableColumnResizing: true,
      columnResizeMode: 'onChange',
      defaultColumn: { minSize: 40, maxSize: 600 },
      onColumnSizingChange,
    },
  };
};

/** Sticky `left` offset = total width of the visible columns before `columnId`. */
export const pinnedLeft = (table, columnId) => {
  let left = 0;
  for (const col of table.getVisibleFlatColumns()) {
    if (col.id === columnId) return left;
    left += col.getSize();
  }
  return left;
};
