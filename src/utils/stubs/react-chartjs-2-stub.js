// React-chartjs-2 stub for static export
import React from 'react';

const ChartComponent = ({ width = 400, height = 400, data, options, ...props }) => (
  <div 
    style={{ width, height }}
    className="flex items-center justify-center bg-gray-100 rounded border-2 border-dashed border-gray-300"
    {...props}
  >
    <span className="text-gray-500">Chart ({data?.datasets?.[0]?.label || 'Data'})</span>
  </div>
);

export const Bar = ChartComponent;
export const Line = ChartComponent;
export const Pie = ChartComponent;
export const Doughnut = ChartComponent;
export const Scatter = ChartComponent;
export const Bubble = ChartComponent;
export const PolarArea = ChartComponent;
export const Radar = ChartComponent;

export const Chart = ChartComponent; 