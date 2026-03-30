import React from 'react';
import Icon from '../../atoms/Icon/Icon';
import Text from '../../atoms/Text/Text';
import './AnalyticsChart.css';

const AnalyticsChart = () => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const maxValue = 4000;
  const values = [2000, 1800, 2400, 2200, 2600, 2766, 2500, 2300, 2100, 2400, 2200, 2000];
  const maxBarHeight = 120;

  return (
    <div className="analytics-chart-widget">
      <div className="widget-header">
        <Text variant="subheading" weight="bold">Analytics</Text>
        <div className="widget-actions">
          <button className="widget-action-btn">
            <Text variant="small">Filter</Text>
          </button>
          <button className="widget-action-btn">
            <Text variant="small">Last Year</Text>
          </button>
          <button className="widget-action-btn">
            <Icon name="fullscreen" size={18} />
          </button>
        </div>
      </div>
      <div className="chart-container">
        <div className="chart-y-axis">
          {[4000, 3000, 2000, 1000, 0].map((value) => (
            <div key={value} className="y-axis-label">
              ${value === 0 ? '0' : `${value / 1000}K`}
            </div>
          ))}
        </div>
        <div className="chart-bars">
          {months.map((month, index) => {
            const height = (values[index] / maxValue) * maxBarHeight;
            const isHighlighted = index === 5; // June is highlighted
            
            return (
              <div key={month} className="bar-wrapper">
                <div
                  className={`bar ${isHighlighted ? 'bar-highlighted' : 'bar-striped'}`}
                  style={{ height: `${height}px` }}
                  title={`${month}, 2024\nRevenue $${values[index].toLocaleString()}\nConv. Rate 8.7%`}
                >
                  {isHighlighted && (
                    <div className="bar-tooltip">
                      <div>Jun, 2024</div>
                      <div>Revenue ${values[index].toLocaleString()}</div>
                      <div>Conv. Rate 8.7%</div>
                    </div>
                  )}
                </div>
                <div className="bar-label">{month}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsChart;

