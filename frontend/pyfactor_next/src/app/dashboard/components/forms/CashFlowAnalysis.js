import React, { useState, useEffect } from 'react';
import { SafePieChart, SafeLineChart } from '@/components/charts/SafeCharts';
import { axiosInstance } from '@/lib/axiosConfig';

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

export default function CashFlowAnalysis() {
  const [timeRange, setTimeRange] = useState('12');
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const fetchData = async () => {
    try {
      const response = await axiosInstance.get(`/api/analysis/cash-flow-data`, {
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

  if (!data) return <p className="text-lg text-center py-8">Loading...</p>;

  const latestData = data[data.length - 1];
  const operatingCashFlow = latestData.operating.total;
  const investingCashFlow = latestData.investing.total;
  const financingCashFlow = latestData.financing.total;

  const pieChartData = {
    labels: ['Operating', 'Investing', 'Financing'],
    datasets: [
      {
        data: [
          Math.abs(operatingCashFlow),
          Math.abs(investingCashFlow),
          Math.abs(financingCashFlow),
        ],
        backgroundColor: ['#36A2EB', '#FFCE56', '#FF6384'],
        hoverBackgroundColor: ['#36A2EB', '#FFCE56', '#FF6384'],
      },
    ],
  };

  const lineChartData = {
    labels: data.map((item) => item.date),
    datasets: [
      {
        label: 'Operating Cash Flow',
        data: data.map((item) => item.operating.total),
        fill: false,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
      },
      {
        label: 'Investing Cash Flow',
        data: data.map((item) => item.investing.total),
        fill: false,
        borderColor: 'rgb(255, 99, 132)',
        tension: 0.1,
      },
      {
        label: 'Financing Cash Flow',
        data: data.map((item) => item.financing.total),
        fill: false,
        borderColor: 'rgb(255, 205, 86)',
        tension: 0.1,
      },
    ],
  };

  const netCashFlow = operatingCashFlow + investingCashFlow + financingCashFlow;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">
        Cash Flow Analysis
      </h1>

      <div className="mt-4 mb-6">
        <label htmlFor="timeRange" className="block text-sm font-medium text-gray-700 mb-1">
          Time Range
        </label>
        <select
          id="timeRange"
          value={timeRange}
          onChange={handleTimeRangeChange}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
        >
          {timeRanges.map((range) => (
            <option key={range.value} value={range.value}>
              {range.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col md:flex-row justify-between mt-6 space-y-6 md:space-y-0 md:space-x-4">
        <div className="w-full md:w-1/2">
          <h2 className="text-lg font-medium mb-3">
            Cash Flow Breakdown
          </h2>
          <div className="p-4 bg-white rounded-lg shadow-md">
            <SafePieChart data={pieChartData} />
          </div>
        </div>
        <div className="w-full md:w-1/2">
          <h2 className="text-lg font-medium mb-3">
            Cash Flow Trends Over Time
          </h2>
          <div className="p-4 bg-white rounded-lg shadow-md">
            <SafeLineChart data={lineChartData} />
          </div>
        </div>
      </div>

      <div className="mt-8 p-4 bg-white rounded-lg shadow-md">
        <h2 className="text-lg font-medium mb-3">
          Summary
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-3 border rounded-md">
            <p className="text-sm text-gray-500">Operating Cash Flow</p>
            <p className="text-lg font-semibold">${formatAmount(operatingCashFlow)}</p>
          </div>
          <div className="p-3 border rounded-md">
            <p className="text-sm text-gray-500">Investing Cash Flow</p>
            <p className="text-lg font-semibold">${formatAmount(investingCashFlow)}</p>
          </div>
          <div className="p-3 border rounded-md">
            <p className="text-sm text-gray-500">Financing Cash Flow</p>
            <p className="text-lg font-semibold">${formatAmount(financingCashFlow)}</p>
          </div>
          <div className="p-3 border rounded-md bg-gray-50">
            <p className="text-sm text-gray-500">Net Cash Flow</p>
            <p className="text-lg font-semibold">${formatAmount(netCashFlow)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}