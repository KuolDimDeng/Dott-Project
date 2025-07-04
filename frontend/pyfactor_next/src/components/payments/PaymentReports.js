'use client';

import React, { useState, useEffect } from 'react';
import { useSessionContext } from '@/providers/SessionProvider';
import { 
  AlertCircle, TrendingUp, TrendingDown, DollarSign, 
  Calendar, Download, FileText, Filter, BarChart3,
  PieChart, Activity, CreditCard
} from 'lucide-react';

const PaymentReports = () => {
  const { user } = useSessionContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [selectedYear, setSelectedYear] = useState('2024');

  useEffect(() => {
    fetchReportData();
  }, [selectedPeriod, selectedYear]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Mock data for demonstration
      const mockReportData = [
        {
          period: 'January 2024',
          revenue: 45678.90,
          transactions: 234,
          averageTransaction: 195.21,
          growth: 12.5,
          refunds: 1234.56,
          netRevenue: 44444.34
        },
        {
          period: 'February 2024',
          revenue: 52341.20,
          transactions: 267,
          averageTransaction: 196.11,
          growth: 14.6,
          refunds: 987.65,
          netRevenue: 51353.55
        },
        {
          period: 'March 2024',
          revenue: 48976.45,
          transactions: 251,
          averageTransaction: 195.12,
          growth: -6.4,
          refunds: 1456.78,
          netRevenue: 47519.67
        }
      ];

      const mockPaymentMethods = [
        { method: 'Credit Card', count: 425, amount: 83456.78, percentage: 67.8 },
        { method: 'PayPal', count: 156, amount: 30234.56, percentage: 24.6 },
        { method: 'Bank Transfer', count: 89, amount: 13456.89, percentage: 10.9 },
        { method: 'Apple Pay', count: 67, amount: 9876.54, percentage: 8.0 },
        { method: 'Google Pay', count: 45, amount: 6789.12, percentage: 5.5 }
      ];

      const mockTopCustomers = [
        {
          name: 'Acme Corporation',
          totalSpent: 12456.78,
          transactionCount: 34,
          lastTransaction: '2024-03-15'
        },
        {
          name: 'Tech Solutions Inc',
          totalSpent: 9876.54,
          transactionCount: 28,
          lastTransaction: '2024-03-14'
        },
        {
          name: 'Global Enterprises',
          totalSpent: 8765.43,
          transactionCount: 22,
          lastTransaction: '2024-03-13'
        }
      ];

      setReportData(mockReportData);
      setPaymentMethods(mockPaymentMethods);
      setTopCustomers(mockTopCustomers);
    } catch (err) {
      setError('Failed to fetch payment reports');
      console.error('Error fetching payment reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = (format) => {
    // Mock export functionality
    console.log(`Exporting report in ${format} format`);
    // In real implementation, this would generate and download the report
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading payment reports...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">{error}</p>
          <button
            onClick={fetchReportData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Payment Reports</h2>
        <div className="flex space-x-4">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>
          
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="2024">2024</option>
            <option value="2023">2023</option>
            <option value="2022">2022</option>
          </select>

          <button
            onClick={() => exportReport('pdf')}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </button>
          
          <button
            onClick={() => exportReport('csv')}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <FileText className="h-4 w-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {reportData.map((data, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{data.period}</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.revenue)}</p>
                <p className="text-sm text-gray-500">{data.transactions} transactions</p>
              </div>
              <div className={`flex items-center ${data.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {data.growth >= 0 ? (
                  <TrendingUp className="h-5 w-5 mr-1" />
                ) : (
                  <TrendingDown className="h-5 w-5 mr-1" />
                )}
                <span className="text-sm font-medium">{Math.abs(data.growth)}%</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Avg. Transaction:</span>
                <span className="font-medium">{formatCurrency(data.averageTransaction)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-500">Net Revenue:</span>
                <span className="font-medium">{formatCurrency(data.netRevenue)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Payment Methods Breakdown */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Methods Breakdown</h3>
        <div className="space-y-4">
          {paymentMethods.map((method, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center">
                <CreditCard className="h-5 w-5 text-gray-400 mr-3" />
                <span className="font-medium text-gray-900">{method.method}</span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">{method.count} transactions</span>
                <span className="font-medium">{formatCurrency(method.amount)}</span>
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${method.percentage}%` }}
                  ></div>
                </div>
                <span className="text-sm text-gray-500 w-12">{method.percentage}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Customers */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Customers</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Spent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transactions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Transaction
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {topCustomers.map((customer, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatCurrency(customer.totalSpent)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{customer.transactionCount}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{customer.lastTransaction}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PaymentReports;