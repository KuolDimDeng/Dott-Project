///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/components/forms/AnalysisPage.js
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import axios from 'axios';

const AnalysisPage = () => {
  const [chartData, setChartData] = useState([]);
  const [xAxis, setXAxis] = useState('date');
  const [yAxis, setYAxis] = useState('sales');
  const [timeGranularity, setTimeGranularity] = useState('month');
  const [chartType, setChartType] = useState('line');

  useEffect(() => {
    fetchChartData();
  }, [xAxis, yAxis, timeGranularity]);

  const fetchChartData = async () => {
    try {
      const response = await axios.get('/api/analysis/financial-data/get_chart_data/', {
        params: { x_axis: xAxis, y_axis: yAxis, time_granularity: timeGranularity },
      });
      setChartData(response.data);
    } catch (error) {
      console.error('Error fetching chart data:', error);
    }
  };

  const renderChart = () => {
    switch (chartType) {
      case 'line':
        return (
          <LineChart width={600} height={300} data={chartData}>
            <XAxis dataKey="period" />
            <YAxis />
            <CartesianGrid strokeDasharray="3 3" />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="total" stroke="#8884d8" />
          </LineChart>
        );
      // Add more chart types as needed
      default:
        return null;
    }
  };

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <select 
            value={xAxis} 
            onChange={(e) => setXAxis(e.target.value)} 
            className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="date">Date</option>
            {/* Add more x-axis options */}
          </select>
        </div>
        <div>
          <select 
            value={yAxis} 
            onChange={(e) => setYAxis(e.target.value)} 
            className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="sales">Sales</option>
            <option value="expenses">Expenses</option>
            <option value="profit">Profit</option>
          </select>
        </div>
        <div>
          <select 
            value={timeGranularity} 
            onChange={(e) => setTimeGranularity(e.target.value)} 
            className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="month">Month</option>
            <option value="year">Year</option>
          </select>
        </div>
        <div>
          <select 
            value={chartType} 
            onChange={(e) => setChartType(e.target.value)} 
            className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="line">Line Chart</option>
            {/* Add more chart type options */}
          </select>
        </div>
      </div>
      
      <div className="mt-6 overflow-x-auto">
        {renderChart()}
      </div>
    </div>
  );
};

export default AnalysisPage;