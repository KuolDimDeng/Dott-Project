'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const TestChart = () => {
  // Simple test data
  const data = [
    { name: 'Jan', value: 400 },
    { name: 'Feb', value: 300 },
    { name: 'Mar', value: 600 },
    { name: 'Apr', value: 800 },
    { name: 'May', value: 500 }
  ];

  console.log('[TestChart] Rendering with data:', data);
  console.log('[TestChart] BarChart type:', typeof BarChart);
  console.log('[TestChart] ResponsiveContainer type:', typeof ResponsiveContainer);

  return (
    <div className="p-6">
      <h2 className="text-lg font-bold mb-4">Test Chart - Recharts</h2>
      
      {/* Test 1: Simple div with fixed size */}
      <div className="mb-8">
        <h3 className="font-semibold mb-2">Test 1: Fixed Size</h3>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Test 2: With explicit width and height */}
      <div className="mb-8">
        <h3 className="font-semibold mb-2">Test 2: Explicit Dimensions</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" fill="#82ca9d" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Test 3: Without ResponsiveContainer */}
      <div className="mb-8">
        <h3 className="font-semibold mb-2">Test 3: Without ResponsiveContainer</h3>
        <BarChart width={600} height={300} data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="value" fill="#ffc658" />
        </BarChart>
      </div>
    </div>
  );
};

export default TestChart;