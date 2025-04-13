// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/chart/component/ChartContainer.js
'use client';
import React, { useState, useEffect } from 'react';
import ChartComponent from './ChartComponents';

const ChartContainer = () => {
  const [account, setAccount] = useState('');
  const [dateRange, setDateRange] = useState('day');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [chartType, setChartType] = useState('line');
  const [lineColor, setLineColor] = useState('#3B82F6'); // Tailwind blue-500
  const [barColor, setBarColor] = useState('#3B82F6'); // Tailwind blue-500
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

  const handleColorChange = (e) => {
    const color = e.target.value;
    if (chartType === 'line') {
      setLineColor(color);
    } else {
      setBarColor(color);
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
    <div className="bg-gray-50 rounded-xl p-6 shadow-sm">
      <h2 className="text-2xl font-semibold mb-4 text-gray-800">
        Sales Analysis
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="w-full">
          <label htmlFor="account" className="block text-sm font-medium text-gray-700 mb-1">
            Account
          </label>
          <select
            id="account"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="day">Daily</option>
            <option value="month">Monthly</option>
            <option value="year">Yearly</option>
          </select>
        </div>

        <div className="w-full">
          <label htmlFor="chartType" className="block text-sm font-medium text-gray-700 mb-1">
            Chart Type
          </label>
          <select
            id="chartType"
            value={chartType}
            onChange={(e) => setChartType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="line">Line Chart</option>
            <option value="bar">Bar Chart</option>
            <option value="pie">Pie Chart</option>
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>

        <div className="w-full">
          <label htmlFor="chartColor" className="block text-sm font-medium text-gray-700 mb-1">
            Chart Color
          </label>
          <div className="flex items-center">
            <input
              type="color"
              id="chartColor"
              value={chartType === 'line' ? lineColor : barColor}
              onChange={handleColorChange}
              className="w-12 h-8 border-0 p-0 mr-2 rounded cursor-pointer"
            />
            <span className="text-sm text-gray-600">{chartType === 'line' ? lineColor : barColor}</span>
          </div>
        </div>
      </div>

      <button 
        onClick={handleSubmit} 
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 shadow-sm"
      >
        Apply Changes
      </button>

      {isLoading ? (
        <div className="flex justify-center items-center my-8 h-72 bg-gray-100 rounded-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">Loading chart...</span>
        </div>
      ) : error ? (
        <div className="my-8 p-4 border-l-4 border-red-500 bg-red-50 text-red-700 rounded">
          <p className="font-medium">Error</p>
          <p>{error}</p>
        </div>
      ) : (
        <div className="h-72 my-8">
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