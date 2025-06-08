'use client';

import React, { useState, useEffect } from 'react';
import { Bar, Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
} from 'chart.js';
import { axiosInstance } from '@/lib/axiosConfig';
import { useToast } from '@/components/Toast/ToastProvider';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title
);

const timeRanges = [
  { value: '1', label: '1 Month' },
  { value: '3', label: '3 Months' },
  { value: '6', label: '6 Months' },
  { value: '12', label: '1 Year' },
];

const formatAmount = (amount) => {
  return typeof amount === 'number' ? amount.toFixed(2) : 'N/A';
};

export default function ExpenseAnalysis() {
  const [timeRange, setTimeRange] = useState('3');
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const toast = useToast();

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const fetchData = async () => {
    try {
      const response = await axiosInstance.get(`/api/analysis/expense-data`, {
        params: { time_range: timeRange },
      });
      setData(response.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch expense data');
    }
  };

  const handleTimeRangeChange = (event) => {
    setTimeRange(event.target.value);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  if (!data) return <p className="text-gray-600 p-4">Loading...</p>;

  const expensesOverTimeData = {
    labels: data.expensesOverTime.map((item) => item.date),
    datasets: [
      {
        label: 'Expenses',
        data: data.expensesOverTime.map((item) => item.amount),
        fill: false,
        borderColor: 'rgb(255, 99, 132)',
        tension: 0.1,
      },
    ],
  };

  const expensesByCategoryData = {
    labels: data.expensesByCategory.map((item) => item.category),
    datasets: [
      {
        data: data.expensesByCategory.map((item) => item.amount),
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)',
        ],
      },
    ],
  };

  const expensesByVendorData = {
    labels: data.expensesByVendor.map((item) => item.vendor),
    datasets: [
      {
        label: 'Expenses',
        data: data.expensesByVendor.map((item) => item.amount),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
      },
    ],
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        Expense Analysis
      </h2>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Time Range
        </label>
        <select
          value={timeRange}
          onChange={handleTimeRangeChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          {timeRanges.map((range) => (
            <option key={range.value} value={range.value}>
              {range.label}
            </option>
          ))}
        </select>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="flex -mb-px">
          <button
            onClick={(e) => handleTabChange(e, 0)}
            className={`py-2 px-4 text-center border-b-2 font-medium text-sm ${
              activeTab === 0
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Expenses Over Time
          </button>
          <button
            onClick={(e) => handleTabChange(e, 1)}
            className={`py-2 px-4 text-center border-b-2 font-medium text-sm ${
              activeTab === 1
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Expenses by Category
          </button>
          <button
            onClick={(e) => handleTabChange(e, 2)}
            className={`py-2 px-4 text-center border-b-2 font-medium text-sm ${
              activeTab === 2
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Expenses by Vendor
          </button>
          <button
            onClick={(e) => handleTabChange(e, 3)}
            className={`py-2 px-4 text-center border-b-2 font-medium text-sm ${
              activeTab === 3
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Summary
          </button>
        </nav>
      </div>

      {activeTab === 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-4">
            Expenses Over Time
          </h3>
          <div className="h-80">
            <Line data={expensesOverTimeData} />
          </div>
        </div>
      )}

      {activeTab === 1 && (
        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-4">
            Expenses by Category
          </h3>
          <div className="h-80">
            <Pie data={expensesByCategoryData} />
          </div>
        </div>
      )}

      {activeTab === 2 && (
        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-4">
            Expenses by Vendor
          </h3>
          <div className="h-80">
            <Bar data={expensesByVendorData} />
          </div>
        </div>
      )}

      {activeTab === 3 && (
        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-4">
            Summary
          </h3>
          <div className="space-y-2">
            <p className="text-gray-700">Total Expenses: <span className="font-medium">${formatAmount(data.totalExpenses)}</span></p>
            <p className="text-gray-700">Average Expense: <span className="font-medium">${formatAmount(data.averageExpense)}</span></p>
            <p className="text-gray-700">Number of Expenses: <span className="font-medium">{data.numberOfExpenses}</span></p>
          </div>
        </div>
      )}
    </div>
  );
}
