import React from 'react';
import { PieChart as RechartsChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-2 border border-gray-200 dark:border-gray-700 rounded shadow-sm">
        <p className="text-sm text-gray-900 dark:text-white">
          {`${payload[0].name}: ${payload[0].value}`}
        </p>
      </div>
    );
  }
  return null;
};

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
    >
      {percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
    </text>
  );
};

const PieChart = ({ data, colors = [] }) => {
  // Default colors for the chart
  const defaultColors = [
    '#3f51b5', // primary
    '#f50057', // secondary
    '#4caf50', // success
    '#ff9800', // warning
    '#f44336', // error
    '#2196f3', // info
    '#9c27b0', // purple
    '#ff9800', // orange
    '#795548', // brown
    '#607d8b', // blueGrey
  ];

  const chartColors = colors.length > 0 ? colors : defaultColors;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderCustomizedLabel}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
          nameKey="name"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend />
      </RechartsChart>
    </ResponsiveContainer>
  );
};

export default PieChart;