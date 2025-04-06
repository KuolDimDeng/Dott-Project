/**
 * react-chartjs-2 Stub
 * 
 * This stub provides mock implementations for react-chartjs-2 components
 * to prevent errors when the actual library is not available.
 */

'use client';
import React from 'react';
import Chart from './chart-stub';

// Basic stub component that renders a placeholder
const ChartPlaceholder = ({ type, height = '300px', width = '100%', ...props }) => {
  return (
    <div 
      style={{ 
        height, 
        width, 
        backgroundColor: '#f5f5f5', 
        border: '1px solid #ddd',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
          {type.charAt(0).toUpperCase() + type.slice(1)} Chart
        </div>
        <div style={{ fontSize: '0.8rem', color: '#666' }}>
          (Chart rendering disabled)
        </div>
      </div>
    </div>
  );
};

// Create specific chart components
export const Line = (props) => <ChartPlaceholder type="line" {...props} />;
export const Bar = (props) => <ChartPlaceholder type="bar" {...props} />;
export const Radar = (props) => <ChartPlaceholder type="radar" {...props} />;
export const Doughnut = (props) => <ChartPlaceholder type="doughnut" {...props} />;
export const PolarArea = (props) => <ChartPlaceholder type="polarArea" {...props} />;
export const Bubble = (props) => <ChartPlaceholder type="bubble" {...props} />;
export const Pie = (props) => <ChartPlaceholder type="pie" {...props} />;
export const Scatter = (props) => <ChartPlaceholder type="scatter" {...props} />;

// Re-export Chart from chart-stub
export { Chart };

// Default export for dynamic imports
export default {
  Line,
  Bar,
  Radar,
  Doughnut,
  PolarArea,
  Bubble,
  Pie,
  Scatter,
  Chart
}; 