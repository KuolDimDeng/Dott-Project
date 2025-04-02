// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/chart/ChartContainer.js
import React, { useState, useEffect } from 'react';
import { ChromePicker } from 'react-color';
import ChartComponent from './ChartComponents';

const ChartContainer = () => {
  const [account, setAccount] = useState('');
  const [dateRange, setDateRange] = useState('day');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [chartType, setChartType] = useState('line');
  const [lineColor, setLineColor] = useState('#4BC0C0');
  const [barColor, setBarColor] = useState('#4BC0C0');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Set default dates
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 1);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  }, []);

  const handleColorChange = (color) => {
    if (chartType === 'line') {
      setLineColor(color.hex);
    } else {
      setBarColor(color.hex);
    }
  };

  const handleSubmit = () => {
    setIsLoading(true);
    setError(null);
    // Here you would typically fetch data based on the selected options
    // For now, we'll just simulate a delay
    setTimeout(() => {
      setIsLoading(false);
      // Simulating a potential error
      // if (Math.random() > 0.8) {
      //   setError("An error occurred while fetching data. Please try again.");
      // }
    }, 1000);
  };

  return (
    <div className="flex flex-col space-y-4 p-4">
      <h2 className="text-2xl font-semibold mb-2">
        Sales Analysis
      </h2>

      <div className="w-full">
        <label htmlFor="account" className="block text-sm font-medium text-gray-700 mb-1">
          Account
        </label>
        <select
          id="account"
          value={account}
          onChange={(e) => setAccount(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Accounts</option>
          <option value="Sales">Sales</option>
          <option value="Expenses">Expenses</option>
        </select>
      </div>

      <div className="w-full">
        <label htmlFor="dateRange" className="block text-sm font-medium text-gray-700 mb-1">
          Date Range
        </label>
        <select
          id="dateRange"
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="day">Daily</option>
          <option value="month">Monthly</option>
          <option value="year">Yearly</option>
        </select>
      </div>

      <div className="w-full">
        <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
          Start Date
        </label>
        <input
          id="startDate"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="w-full">
        <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
          End Date
        </label>
        <input
          id="endDate"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="w-full">
        <label htmlFor="chartType" className="block text-sm font-medium text-gray-700 mb-1">
          Chart Type
        </label>
        <select
          id="chartType"
          value={chartType}
          onChange={(e) => setChartType(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="line">Line Chart</option>
          <option value="bar">Bar Chart</option>
          <option value="pie">Pie Chart</option>
        </select>
      </div>

      <button 
        onClick={() => setShowColorPicker(!showColorPicker)}
        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {showColorPicker ? 'Hide' : 'Show'} Color Picker
      </button>

      {showColorPicker && (
        <div className="my-2">
          <ChromePicker
            color={chartType === 'line' ? lineColor : barColor}
            onChange={handleColorChange}
          />
        </div>
      )}

      <button 
        onClick={handleSubmit} 
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Apply Changes
      </button>

      {isLoading ? (
        <div className="flex justify-center my-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="text-red-600 my-4">{error}</div>
      ) : (
        <div className="h-96 my-4">
          <ChartComponent
            account={account}
            dateRange={dateRange}
            startDate={startDate}
            endDate={endDate}
            chartType={chartType}
            lineColor={lineColor}
            barColor={barColor}
          />
        </div>
      )}
    </div>
  );
};

export default ChartContainer;