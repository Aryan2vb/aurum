import React from 'react';
import Text from '../../atoms/Text/Text';
import './VisitHeatmap.css';

const VisitHeatmap = () => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const timeSlots = [
    { label: '12 AM-8 AM', start: 0, end: 8 },
    { label: '8 AM-4 PM', start: 8, end: 16 },
    { label: '4 PM-12 AM', start: 16, end: 24 },
  ];

  // Generate sample data (visits per time slot per day)
  const generateData = () => {
    const data = {};
    days.forEach((day) => {
      timeSlots.forEach((slot) => {
        const key = `${day}-${slot.label}`;
        data[key] = Math.floor(Math.random() * 12000);
      });
    });
    return data;
  };

  const [visitData] = React.useState(generateData());
  const maxVisits = Math.max(...Object.values(visitData));

  const getIntensity = (visits) => {
    const ratio = visits / maxVisits;
    if (ratio > 0.8) return 5;
    if (ratio > 0.6) return 4;
    if (ratio > 0.4) return 3;
    if (ratio > 0.2) return 2;
    return 1;
  };

  return (
    <div className="visit-heatmap-widget">
      <div className="widget-header">
        <Text variant="subheading" weight="bold">Visit by Time</Text>
        <div className="widget-actions">
          <button className="widget-action-btn">
            <Text variant="small">Filter</Text>
          </button>
          <button className="widget-action-btn">
            <Text variant="small">Export</Text>
          </button>
        </div>
      </div>
      <div className="heatmap-container">
        <div className="heatmap-grid">
          <div className="heatmap-header">
            <div className="time-label"></div>
            {days.map((day) => (
              <div key={day} className="day-label">
                {day}
              </div>
            ))}
          </div>
          {timeSlots.map((slot) => (
            <div key={slot.label} className="heatmap-row">
              <div className="time-label">{slot.label}</div>
              {days.map((day) => {
                const key = `${day}-${slot.label}`;
                const visits = visitData[key];
                const intensity = getIntensity(visits);
                return (
                  <div
                    key={key}
                    className={`heatmap-cell intensity-${intensity}`}
                    title={`${day}, ${slot.label}: ${visits.toLocaleString()} visits`}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="heatmap-legend">
          <Text variant="small" color="#666">Less</Text>
          <div className="legend-colors">
            {[1, 2, 3, 4, 5].map((level) => (
              <div
                key={level}
                className={`legend-color intensity-${level}`}
              />
            ))}
          </div>
          <Text variant="small" color="#666">More</Text>
        </div>
      </div>
    </div>
  );
};

export default VisitHeatmap;

