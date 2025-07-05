import React, { useState, useEffect } from 'react';
import { Pie, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
} from 'chart.js';
import { axiosInstance } from '@/lib/axiosConfig';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title
);

const timeRanges = [
  { value: '1', label: '1 Month' },
  { value: '6', label: '6 Months' },
  { value: '12', label: '1 Year' },
  { value: '60', label: '5 Years' },
  { value: 'all', label: 'All Time' },
];

const formatAmount = (amount) => {
  return typeof amount === 'number' ? amount.toFixed(2) : 'N/A';
};

export default function BalanceSheetAnalysis() {
  const [timeRange, setTimeRange] = useState('12');
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const fetchData = async () => {
    try {
      const response = await axiosInstance.get(`/api/analysis/balance-sheet-data`, {
        params: { time_granularity: timeRange },
      });
      setData(response.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleTimeRangeChange = (event) => {
    setTimeRange(event.target.value);
  };

  if (!data) return <p className="text-gray-600 text-lg">Loading...</p>;

  const latestData = data[data.length - 1];
  const totalAssets = latestData.assets.total;
  const totalLiabilities = latestData.liabilities.total;
  const totalEquity = latestData.equity.total;

  const pieChartData = {
    labels: ['Assets', 'Liabilities', 'Equity'],
    datasets: [
      {
        data: [totalAssets, totalLiabilities, totalEquity],
        backgroundColor: ['#36A2EB', '#FFCE56', '#FF6384'],
        hoverBackgroundColor: ['#36A2EB', '#FFCE56', '#FF6384'],
      },
    ],
  };

  const lineChartData = {
    labels: data.map((item) => item.date),
    datasets: [
      {
        label: 'Assets',
        data: data.map((item) => item.assets.total),
        fill: false,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
      },
      {
        label: 'Liabilities',
        data: data.map((item) => item.liabilities.total),
        fill: false,
        borderColor: 'rgb(255, 99, 132)',
        tension: 0.1,
      },
      {
        label: 'Equity',
        data: data.map((item) => item.equity.total),
        fill: false,
        borderColor: 'rgb(255, 205, 86)',
        tension: 0.1,
      },
    ],
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">
        Balance Sheet Analysis
      </h1>

      <div className="mt-4">
        <label htmlFor="timeRange" className="block text-sm font-medium text-gray-700 mb-1">
          Time Range
        </label>
        <select
          id="timeRange"
          value={timeRange}
          onChange={handleTimeRangeChange}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        >
          {timeRanges.map((range) => (
            <option key={range.value} value={range.value}>
              {range.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col md:flex-row justify-between mt-8 gap-6">
        <div className="w-full md:w-1/2">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Balance Sheet Breakdown
          </h2>
          <div className="relative h-80">
            <Pie data={pieChartData} />
          </div>
        </div>
        <div className="w-full md:w-1/2">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Balance Sheet Trends Over Time
          </h2>
          <div className="relative h-80">
            <Line data={lineChartData} />
          </div>
        </div>
      </div>

      <div className="mt-8 bg-gray-50 p-4 rounded-lg">
        <h2 className="text-lg font-medium text-gray-900 mb-3">
          Summary
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-sm text-gray-500">Total Assets</p>
            <p className="text-xl font-semibold text-blue-600">${formatAmount(totalAssets)}</p>
          </div>
          <div className="p-3 bg-red-50 rounded-lg border border-red-100">
            <p className="text-sm text-gray-500">Total Liabilities</p>
            <p className="text-xl font-semibold text-red-600">${formatAmount(totalLiabilities)}</p>
          </div>
          <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-100">
            <p className="text-sm text-gray-500">Total Equity</p>
            <p className="text-xl font-semibold text-yellow-600">${formatAmount(totalEquity)}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-500">Debt to Equity Ratio</p>
            <p className="text-xl font-semibold text-gray-700">{formatAmount(totalLiabilities / totalEquity)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
