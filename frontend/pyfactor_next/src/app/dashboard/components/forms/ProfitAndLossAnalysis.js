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

export default function ProfitAndLossAnalysis() {
  const [timeRange, setTimeRange] = useState('12');
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const fetchData = async () => {
    try {
      const response = await axiosInstance.get(`/api/analysis/financial-data/get_chart_data`, {
        params: {
          x_axis: 'date',
          y_axis: 'sales',
          time_granularity: timeRange,
        },
      });
      setData(response.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleTimeRangeChange = (event) => {
    setTimeRange(event.target.value);
  };

  if (!data) return (
    <div className="flex justify-center items-center h-40">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
    </div>
  );

  // Calculate totals
  const totalRevenue = data.reduce((sum, item) => sum + item.sales, 0);
  const totalCOGS = data.reduce((sum, item) => sum + item.cogs, 0);
  const totalOperatingExpenses = data.reduce((sum, item) => sum + item.operating_expenses, 0);
  const netIncome = totalRevenue - totalCOGS - totalOperatingExpenses;

  const pieChartData = {
    labels: ['Revenue', 'Cost of Goods Sold', 'Operating Expenses'],
    datasets: [
      {
        data: [totalRevenue, totalCOGS, totalOperatingExpenses],
        backgroundColor: ['#36A2EB', '#FFCE56', '#FF6384'],
        hoverBackgroundColor: ['#36A2EB', '#FFCE56', '#FF6384'],
      },
    ],
  };

  const lineChartData = {
    labels: data.map((item) => item.date),
    datasets: [
      {
        label: 'Revenue',
        data: data.map((item) => item.sales),
        fill: false,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
      },
      {
        label: 'Cost of Goods Sold',
        data: data.map((item) => item.cogs),
        fill: false,
        borderColor: 'rgb(255, 99, 132)',
        tension: 0.1,
      },
      {
        label: 'Operating Expenses',
        data: data.map((item) => item.operating_expenses),
        fill: false,
        borderColor: 'rgb(255, 205, 86)',
        tension: 0.1,
      },
    ],
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">
        Profit & Loss Analysis
      </h1>

      <div className="mb-6">
        <label htmlFor="timeRange" className="block text-sm font-medium text-gray-700 mb-1">
          Time Range
        </label>
        <div className="relative">
          <select
            id="timeRange"
            value={timeRange}
            onChange={handleTimeRangeChange}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            {timeRanges.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between gap-6 mt-6">
        <div className="w-full md:w-1/2">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            Profit & Loss Breakdown
          </h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <Pie data={pieChartData} />
          </div>
        </div>
        <div className="w-full md:w-1/2">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            Financial Trends Over Time
          </h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <Line data={lineChartData} />
          </div>
        </div>
      </div>

      <div className="mt-8 bg-gray-50 p-5 rounded-lg">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Summary
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-white rounded-lg shadow-sm">
            <span className="text-sm text-gray-500">Total Revenue</span>
            <p className="text-xl font-bold text-blue-600">${totalRevenue.toFixed(2)}</p>
          </div>
          <div className="p-4 bg-white rounded-lg shadow-sm">
            <span className="text-sm text-gray-500">Total Cost of Goods Sold</span>
            <p className="text-xl font-bold text-yellow-500">${totalCOGS.toFixed(2)}</p>
          </div>
          <div className="p-4 bg-white rounded-lg shadow-sm">
            <span className="text-sm text-gray-500">Total Operating Expenses</span>
            <p className="text-xl font-bold text-red-500">${totalOperatingExpenses.toFixed(2)}</p>
          </div>
          <div className="p-4 bg-white rounded-lg shadow-sm">
            <span className="text-sm text-gray-500">Net Income</span>
            <p className={`text-xl font-bold ${netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${netIncome.toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
