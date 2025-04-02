import React, { useState, useEffect } from 'react';
import { Bar, Line } from 'react-chartjs-2';
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

const calculateVariance = (budgeted, actual) => {
  if (typeof budgeted !== 'number' || typeof actual !== 'number') return 'N/A';
  return (((actual - budgeted) / budgeted) * 100).toFixed(2) + '%';
};

export default function BudgetVsActualAnalysis() {
  const [timeRange, setTimeRange] = useState('3');
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const fetchData = async () => {
    try {
      const response = await axiosInstance.get(`/api/analysis/budget-vs-actual`, {
        params: { time_range: timeRange },
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

  const barChartData = {
    labels: data.map((item) => item.account_name),
    datasets: [
      {
        label: 'Budgeted',
        data: data.map((item) => item.budgeted_amount),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
      },
      {
        label: 'Actual',
        data: data.map((item) => item.actual_amount),
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
      },
    ],
  };

  const lineChartData = {
    labels: data.map((item) => item.account_name),
    datasets: [
      {
        label: 'Variance %',
        data: data.map(
          (item) => ((item.actual_amount - item.budgeted_amount) / item.budgeted_amount) * 100
        ),
        fill: false,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
      },
    ],
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">
        Budget vs Actual Analysis
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

      <div className="mt-8 overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Account
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Budgeted
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actual
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Variance
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Variance %
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item, index) => {
              const variance = item.actual_amount - item.budgeted_amount;
              const isPositiveVariance = variance >= 0;
              
              return (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.account_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                    ${formatAmount(item.budgeted_amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                    ${formatAmount(item.actual_amount)}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${
                    isPositiveVariance ? 'text-green-600' : 'text-red-600'
                  }`}>
                    ${formatAmount(variance)}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${
                    isPositiveVariance ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {calculateVariance(item.budgeted_amount, item.actual_amount)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col lg:flex-row justify-between mt-8 gap-6">
        <div className="w-full lg:w-1/2">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Budget vs Actual Comparison
          </h2>
          <div className="relative h-80">
            <Bar data={barChartData} />
          </div>
        </div>
        <div className="w-full lg:w-1/2">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Variance Trend
          </h2>
          <div className="relative h-80">
            <Line data={lineChartData} />
          </div>
        </div>
      </div>
    </div>
  );
}
