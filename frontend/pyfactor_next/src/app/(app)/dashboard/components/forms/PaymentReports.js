'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getSecureTenantId } from '@/utils/tenantUtils';
import { logger } from '@/utils/logger';
import { ChartBarSquareIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { CenteredSpinner } from '@/components/ui/StandardSpinner';

// Tooltip component for field help
const FieldTooltip = ({ text }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  return (
    <div className="relative inline-block ml-1">
      <QuestionMarkCircleIcon 
        className="h-4 w-4 text-gray-400 cursor-help hover:text-gray-600"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      />
      {isVisible && (
        <div className="absolute z-10 w-64 p-2 text-xs text-white bg-gray-900 rounded-md shadow-lg -top-2 left-6">
          <div className="relative">
            {text}
            <div className="absolute w-2 h-2 bg-gray-900 rotate-45 -left-1 top-2"></div>
          </div>
        </div>
      )}
    </div>
  );
};

const PaymentReports = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('last30days');
  const [reportData, setReportData] = useState({
    totalRevenue: 0,
    totalTransactions: 0,
    avgTransactionValue: 0,
    growthRate: 0,
    revenueByDay: [],
    paymentMethods: [],
    topCustomers: []
  });

  const [tenantId, setTenantId] = useState(null);
  
  useEffect(() => {
    const fetchTenantId = async () => {
      const id = await getSecureTenantId();
      setTenantId(id);
    };
    fetchTenantId();
  }, []);

  const dateRanges = [
    { value: 'today', label: 'Today' },
    { value: 'last7days', label: 'Last 7 Days' },
    { value: 'last30days', label: 'Last 30 Days' },
    { value: 'last90days', label: 'Last 90 Days' },
    { value: 'thisYear', label: 'This Year' }
  ];

  const fetchReportData = useCallback(async () => {
    logger.debug('[PaymentReports] Fetching report data for tenant:', tenantId);
    setIsLoading(true);
    setError(null);

    try {
      // TODO: Replace with actual API endpoint
      const mockData = {
        totalRevenue: 245890,
        totalTransactions: 1234,
        avgTransactionValue: 199.26,
        growthRate: 12.5,
        revenueByDay: [
          { date: '2025-01-01', amount: 8500 },
          { date: '2025-01-02', amount: 12300 },
          { date: '2025-01-03', amount: 9800 },
          { date: '2025-01-04', amount: 15600 },
          { date: '2025-01-05', amount: 11200 },
          { date: '2025-01-06', amount: 14500 }
        ],
        paymentMethods: [
          { method: 'Credit Card', count: 456, amount: 89500, percentage: 36.4 },
          { method: 'Bank Transfer', count: 345, amount: 78900, percentage: 32.1 },
          { method: 'PayPal', count: 223, amount: 45600, percentage: 18.6 },
          { method: 'Other', count: 210, amount: 31890, percentage: 12.9 }
        ],
        topCustomers: [
          { name: 'ABC Corporation', amount: 45600, transactions: 23 },
          { name: 'XYZ Limited', amount: 38900, transactions: 18 },
          { name: 'Tech Solutions Inc', amount: 32100, transactions: 15 },
          { name: 'Global Services LLC', amount: 28700, transactions: 12 },
          { name: 'Enterprise Co', amount: 24500, transactions: 10 }
        ]
      };

      setReportData(mockData);
      logger.info('[PaymentReports] Report data loaded successfully');
    } catch (err) {
      logger.error('[PaymentReports] Error fetching report data:', err);
      setError(err.message | 'Failed to load report data');
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, dateRange]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);
  
  // Wait for tenant ID to load
  if (!tenantId) {
    return (
      <div className="flex justify-center items-center h-64">
        <CenteredSpinner size="medium" />
      </div>
    );
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const exportReport = (format) => {
    logger.debug('[PaymentReports] Exporting report as:', format);
    // TODO: Implement actual export functionality
    alert(`Exporting report as ${format.toUpperCase()}`);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <CenteredSpinner size="medium" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        <p className="font-semibold">Error loading reports</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  // Calculate max revenue for chart scaling
  const maxRevenue = Math.max(...reportData.revenueByDay.map(d => d.amount));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
            <ChartBarSquareIcon className="h-6 w-6 text-blue-600 mr-2" />
            Payment Reports
          </h1>
          <p className="text-gray-600 text-sm">Analyze payment trends, revenue metrics, and customer payment patterns with comprehensive reporting tools.</p>
        </div>
        <div className="flex space-x-2 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Range
              <FieldTooltip text="Select the time period for your payment analysis. Reports will show revenue, transactions, and trends for the selected period." />
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
            {dateRanges.map(range => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
          </div>
          <button
            onClick={() => exportReport('csv')}
            className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Export CSV
          </button>
          <button
            onClick={() => exportReport('pdf')}
            className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Export PDF
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm font-medium text-gray-600">Total Revenue</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(reportData.totalRevenue)}</p>
          <p className="text-sm text-green-600 mt-1">
            ↑ {reportData.growthRate}% from last period
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm font-medium text-gray-600">Total Transactions</p>
          <p className="text-2xl font-bold text-gray-900">{reportData.totalTransactions.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm font-medium text-gray-600">Average Transaction</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(reportData.avgTransactionValue)}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm font-medium text-gray-600">Success Rate</p>
          <p className="text-2xl font-bold text-green-600">98.5%</p>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue Trend</h3>
        <div className="h-64 flex items-end space-x-2">
          {reportData.revenueByDay.map((day, index) => (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div 
                className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors relative group"
                style={{ height: `${(day.amount / maxRevenue) * 100}%` }}
              >
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                  {formatCurrency(day.amount)}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Methods</h3>
          <div className="space-y-3">
            {reportData.paymentMethods.map((method, index) => (
              <div key={index}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-700">{method.method}</span>
                  <span className="text-sm text-gray-500">{formatCurrency(method.amount)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${method.percentage}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{method.count} transactions ({method.percentage}%)</p>
              </div>
            ))}
          </div>
        </div>

        {/* Top Customers */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top Customers</h3>
          <div className="space-y-3">
            {reportData.topCustomers.map((customer, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{customer.name}</p>
                  <p className="text-xs text-gray-500">{customer.transactions} transactions</p>
                </div>
                <p className="text-sm font-medium text-gray-900">{formatCurrency(customer.amount)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Report Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Transaction Summary by Date</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transactions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Transaction
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Growth
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.revenueByDay.map((day, index) => {
                  const transactions = Math.floor(day.amount / 200) + 10; // Mock calculation
                  const avgTransaction = day.amount / transactions;
                  const previousAmount = index > 0 ? reportData.revenueByDay[index - 1].amount : day.amount;
                  const growth = ((day.amount - previousAmount) / previousAmount) * 100;
                  
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(day.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {transactions}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(day.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(avgTransaction)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={growth >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {growth >= 0 ? '↑' : '↓'} {Math.abs(growth).toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-500 text-center">
        Debug: Tenant ID: {tenantId} | Component: PaymentReports
      </div>
    </div>
  );
};

export default PaymentReports;
