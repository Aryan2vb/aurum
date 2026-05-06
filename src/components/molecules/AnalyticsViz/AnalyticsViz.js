import React from 'react';
import './AnalyticsViz.css';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const TrendChart = ({ points = [], valueKey = 'sales', labelKey = 'date', formatValue = (v) => v, color = 'var(--accent)' }) => {
  const values = points.map((point) => Number(point[valueKey] || 0));
  const max = Math.max(...values, 1);
  const width = 640;
  const height = 180;
  const pad = 18;
  const usableWidth = width - pad * 2;
  const usableHeight = height - pad * 2;
  const coords = points.map((point, index) => {
    const x = points.length <= 1 ? width / 2 : pad + (index / (points.length - 1)) * usableWidth;
    const y = height - pad - (Number(point[valueKey] || 0) / max) * usableHeight;
    return { x, y, point };
  });
  const line = coords.map((coord) => `${coord.x},${coord.y}`).join(' ');

  if (!points.length) {
    return <div className="viz-empty">No sales data for this period.</div>;
  }

  return (
    <div className="trend-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Sales trend chart">
        <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} className="trend-axis" />
        <polyline points={line} className="trend-line" style={{ stroke: color }} />
        {coords.map((coord, index) => (
          <g key={`${coord.point[labelKey]}-${index}`}>
            <line x1={coord.x} y1={height - pad} x2={coord.x} y2={height - pad - clamp((Number(coord.point[valueKey] || 0) / max) * usableHeight, 4, usableHeight)} className="trend-bar" />
            <circle cx={coord.x} cy={coord.y} r="4" className="trend-point" style={{ fill: color }} />
            <title>{`${coord.point[labelKey]}: ${formatValue(coord.point[valueKey])}`}</title>
          </g>
        ))}
      </svg>
    </div>
  );
};

export const DonutChart = ({ segments = [], centerLabel, centerValue, size = 156 }) => {
  const total = segments.reduce((sum, segment) => sum + Number(segment.value || 0), 0);
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="donut-wrap" style={{ width: size }}>
      <svg viewBox="0 0 120 120" className="donut-chart" role="img" aria-label={centerLabel || 'Donut chart'}>
        <circle cx="60" cy="60" r={radius} className="donut-track" />
        {total > 0 && segments.map((segment) => {
          const ratio = Number(segment.value || 0) / total;
          const dash = ratio * circumference;
          const strokeDasharray = `${dash} ${circumference - dash}`;
          const strokeDashoffset = -offset;
          offset += dash;
          return (
            <circle
              key={segment.label}
              cx="60"
              cy="60"
              r={radius}
              className="donut-segment"
              style={{ stroke: segment.color, strokeDasharray, strokeDashoffset }}
            />
          );
        })}
        <text x="60" y="56" textAnchor="middle" className="donut-center-value">{centerValue || '0'}</text>
        <text x="60" y="72" textAnchor="middle" className="donut-center-label">{centerLabel}</text>
      </svg>
    </div>
  );
};

export const HorizontalBarChart = ({ rows = [], valueKey = 'value', labelKey = 'label', formatValue = (v) => v, color = 'var(--accent)' }) => {
  const max = Math.max(...rows.map((row) => Number(row[valueKey] || 0)), 1);
  if (!rows.length) {
    return <div className="viz-empty">No product data for this period.</div>;
  }

  return (
    <div className="hbar-chart">
      {rows.map((row, index) => {
        const value = Number(row[valueKey] || 0);
        return (
          <div className="hbar-row" key={`${row[labelKey]}-${index}`}>
            <div className="hbar-label" title={row[labelKey]}>{row[labelKey]}</div>
            <div className="hbar-track">
              <div className="hbar-fill" style={{ width: `${Math.max((value / max) * 100, 4)}%`, background: row.color || color }} />
            </div>
            <div className="hbar-value">{formatValue(value)}</div>
          </div>
        );
      })}
    </div>
  );
};

export const SplitBar = ({ segments = [] }) => {
  const total = segments.reduce((sum, segment) => sum + Number(segment.value || 0), 0);
  if (total <= 0) {
    return <div className="viz-empty">No payment data for this period.</div>;
  }

  return (
    <div className="split-chart">
      <div className="split-track">
        {segments.map((segment) => (
          <div
            key={segment.label}
            className="split-fill"
            style={{ width: `${(Number(segment.value || 0) / total) * 100}%`, background: segment.color }}
            title={`${segment.label}: ${segment.formatted || segment.value}`}
          />
        ))}
      </div>
      <div className="split-legend">
        {segments.map((segment) => (
          <span key={segment.label}>
            <i style={{ background: segment.color }} />
            {segment.label}
          </span>
        ))}
      </div>
    </div>
  );
};

export const StackedBarChart = ({ rows = [], segmentKeys = [], colors = {}, formatValue = (v) => v }) => {
  if (!rows.length || !segmentKeys.length) {
    return <div className="viz-empty">No breakdown data for this period.</div>;
  }

  return (
    <div className="stacked-chart">
      {rows.map((row, index) => {
        const total = segmentKeys.reduce((sum, key) => sum + Number(row[key] || 0), 0);
        return (
          <div className="stacked-row" key={`${row.date || row.label}-${index}`}>
            <div className="stacked-label">{row.date || row.label}</div>
            <div className="stacked-track">
              {segmentKeys.map((key) => {
                const value = Number(row[key] || 0);
                if (value <= 0) return null;
                return (
                  <div
                    key={key}
                    className="stacked-fill"
                    style={{ width: `${Math.max((value / Math.max(total, 1)) * 100, 3)}%`, background: colors[key] || 'var(--accent)' }}
                    title={`${key}: ${formatValue(value)}`}
                  />
                );
              })}
            </div>
            <div className="stacked-total">{formatValue(total)}</div>
          </div>
        );
      })}
    </div>
  );
};

export const InsightCallout = ({ children, tone = 'neutral' }) => (
  <div className={`insight-callout insight-${tone}`}>
    {children}
  </div>
);

export const ActionCard = ({ title, description, count, tone = 'neutral', onClick }) => (
  <button type="button" className={`action-card action-${tone}`} onClick={onClick}>
    <span className="action-count">{count}</span>
    <span className="action-copy">
      <strong>{title}</strong>
      <span>{description}</span>
    </span>
  </button>
);
