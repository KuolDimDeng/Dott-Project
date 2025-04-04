// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/chart/Dashboard.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ChartComponent from './ChartComponent';

const Dashboard = () => {
  const [date, setDate] = useState('');
  const [account, setAccount] = useState('');
  const [chartType, setChartType] = useState('line');
  const [chartData, setChartData] = useState([]);

  const fetchData = async () => {
    try {
      const response = await axios.get('/api/chart/transactions/', {
        params: { account, date },
      });
      setChartData(response.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    if (account && date) {
      fetchData();
    }
  }, [account, date]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-3">
          <div className="relative">
            <label htmlFor="date-input" className="block text-sm font-medium text-gray-700 mb-1">
              Select Date
            </label>
            <input
              id="date-input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div className="md:col-span-3">
          <div className="relative">
            <label htmlFor="account-select" className="block text-sm font-medium text-gray-700 mb-1">
              Select Account
            </label>
            <select
              id="account-select"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="" disabled>Select an account</option>
              <option value="sales">Sales</option>
              <option value="expenses">Expenses</option>
              {/* Add more account options here */}
            </select>
          </div>
        </div>
        
        <div className="md:col-span-3">
          <div className="relative">
            <label htmlFor="chart-type-select" className="block text-sm font-medium text-gray-700 mb-1">
              Chart Type
            </label>
            <select
              id="chart-type-select"
              value={chartType}
              onChange={(e) => setChartType(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="line">Line</option>
              <option value="bar">Bar</option>
              <option value="pie">Pie</option>
            </select>
          </div>
        </div>
        
        <div className="md:col-span-12">
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Update Chart
          </button>
        </div>
        
        <div className="md:col-span-6">
          <div className="h-[400px]">
            <ChartComponent data={chartData} type={chartType} />
          </div>
        </div>
        
        <div className="md:col-span-6">
          <div className="h-[400px]">
            {/* Additional charts can be rendered here */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
