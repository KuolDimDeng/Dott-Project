'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  AlertCircle, TrendingUp, TrendingDown, DollarSign, 
  Calendar, Download, FileText, Filter, BarChart3,
  PieChart, Activity, CreditCard
} from 'lucide-react';

interface ReportData {
  period: string;
  revenue: number;
  transactions: number;
  averageTransaction: number;
  growth: number;
  refunds: number;
  netRevenue: number;
}

interface PaymentMethodBreakdown {
  method: string;
  count: number;
  amount: number;
  percentage: number;
}

interface TopCustomer {
  name: string;
  totalSpent: number;
  transactionCount: number;
  lastTransaction: string;
}

const PaymentReports: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodBreakdown[]>([]);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [selectedYear, setSelectedYear] = useState('2024');

  useEffect(() => {
    fetchReportData();
  }, [selectedPeriod, selectedYear]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      // Simulating API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data based on period
      const mockMonthlyData: ReportData[] = [
        { period: 'Jan 2024', revenue: 45230, transactions: 342, averageTransaction: 132.25, growth: 12.5, refunds: 2100, netRevenue: 43130 },
        { period: 'Feb 2024', revenue: 52100, transactions: 398, averageTransaction: 130.90, growth: 15.2, refunds: 1800, netRevenue: 50300 },
        { period: 'Mar 2024', revenue: 48900, transactions: 367, averageTransaction: 133.24, growth: -6.1, refunds: 2500, netRevenue: 46400 },
        { period: 'Apr 2024', revenue: 55600, transactions: 412, averageTransaction: 134.95, growth: 13.7, refunds: 1900, netRevenue: 53700 },
        { period: 'May 2024', revenue: 61200, transactions: 445, averageTransaction: 137.53, growth: 10.1, refunds: 2200, netRevenue: 59000 },
        { period: 'Jun 2024', revenue: 58900, transactions: 428, averageTransaction: 137.62, growth: -3.8, refunds: 2600, netRevenue: 56300 }
      ];

      const mockPaymentMethods: PaymentMethodBreakdown[] = [
        { method: 'Credit Card', count: 1250, amount: 165000, percentage: 45.2 },
        { method: 'Debit Card', count: 890, amount: 98500, percentage: 27.0 },
        { method: 'PayPal', count: 560, amount: 72000, percentage: 19.7 },
        { method: 'Bank Transfer', count: 120, amount: 28000, percentage: 7.7 },
        { method: 'Other', count: 15, amount: 1500, percentage: 0.4 }
      ];

      const mockTopCustomers: TopCustomer[] = [
        { name: 'ABC Corporation', totalSpent: 45200, transactionCount: 28, lastTransaction: '2024-06-20' },
        { name: 'XYZ Industries', totalSpent: 38500, transactionCount: 42, lastTransaction: '2024-06-22' },
        { name: 'Global Services Inc', totalSpent: 32100, transactionCount: 18, lastTransaction: '2024-06-19' },
        { name: 'Tech Solutions Ltd', totalSpent: 28900, transactionCount: 35, lastTransaction: '2024-06-21' },
        { name: 'Premier Enterprises', totalSpent: 24500, transactionCount: 22, lastTransaction: '2024-06-18' }
      ];
      
      setReportData(mockMonthlyData);
      setPaymentMethods(mockPaymentMethods);
      setTopCustomers(mockTopCustomers);
      setError(null);
    } catch (err) {
      setError('Failed to fetch report data');
      console.error('Error fetching report data:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    return reportData.reduce((acc, data) => {
      acc.totalRevenue += data.revenue;
      acc.totalTransactions += data.transactions;
      acc.totalRefunds += data.refunds;
      acc.totalNetRevenue += data.netRevenue;
      return acc;
    }, { totalRevenue: 0, totalTransactions: 0, totalRefunds: 0, totalNetRevenue: 0 });
  };

  const exportReport = (format: 'csv' | 'pdf') => {
    console.log(`Exporting report as ${format}`);
    // In a real app, this would generate and download the report
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const totals = calculateTotals();
  const averageGrowth = reportData.reduce((sum, d) => sum + d.growth, 0) / reportData.length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Reports</h1>
        <p className="text-gray-600">Analyze payment trends and performance</p>
      </div>

      {/* Debug Info */}
      {user && (
        <div className="mb-4 p-3 bg-gray-100 rounded-lg text-sm text-gray-600">
          <p>Tenant ID: {user.tenantId}</p>
        </div>
      )}

      {/* Filters and Actions */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
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
          <button className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
            <Filter className="w-4 h-4 mr-2" />
            More Filters
          </button>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => exportReport('csv')}
            className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
          <button
            onClick={() => exportReport('pdf')}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <FileText className="w-4 h-4 mr-2" />
            Generate PDF
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">${totals.totalRevenue.toLocaleString()}</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
          <div className="mt-2 flex items-center">
            {averageGrowth > 0 ? (
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
            )}
            <span className={`text-sm ${averageGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {averageGrowth > 0 ? '+' : ''}{averageGrowth.toFixed(1)}% avg
            </span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Transactions</p>
              <p className="text-2xl font-bold text-gray-900">{totals.totalTransactions.toLocaleString()}</p>
            </div>
            <Activity className="w-8 h-8 text-blue-500" />
          </div>
          <div className="mt-2">
            <p className="text-sm text-gray-500">
              Avg: ${(totals.totalRevenue / totals.totalTransactions).toFixed(2)}
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Refunds</p>
              <p className="text-2xl font-bold text-gray-900">${totals.totalRefunds.toLocaleString()}</p>
            </div>
            <TrendingDown className="w-8 h-8 text-red-500" />
          </div>
          <div className="mt-2">
            <p className="text-sm text-gray-500">
              {((totals.totalRefunds / totals.totalRevenue) * 100).toFixed(1)}% of revenue
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Net Revenue</p>
              <p className="text-2xl font-bold text-gray-900">${totals.totalNetRevenue.toLocaleString()}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-purple-500" />
          </div>
          <div className="mt-2">
            <p className="text-sm text-gray-500">After refunds</p>
          </div>
        </div>
      </div>

      {/* Revenue Trend Chart */}
      <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue Trend</h3>
        <div className="h-64 flex items-end space-x-2">
          {reportData.map((data, index) => {
            const maxRevenue = Math.max(...reportData.map(d => d.revenue));
            const height = (data.revenue / maxRevenue) * 100;
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div className="w-full bg-blue-500 rounded-t" style={{ height: `${height}%` }}>
                  <div className="text-xs text-white text-center p-1 opacity-0 hover:opacity-100">
                    ${(data.revenue / 1000).toFixed(1)}k
                  </div>
                </div>
                <div className="text-xs text-gray-600 mt-2 rotate-45 origin-left">{data.period}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods Breakdown */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <PieChart className="w-5 h-5 mr-2" />
            Payment Methods
          </h3>
          <div className="space-y-3">
            {paymentMethods.map((method, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{method.method}</span>
                  <span className="text-sm text-gray-600">
                    ${(method.amount / 1000).toFixed(1)}k ({method.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${method.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Customers */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Top Customers
          </h3>
          <div className="space-y-3">
            {topCustomers.map((customer, index) => (
              <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded">
                <div>
                  <p className="text-sm font-medium text-gray-900">{customer.name}</p>
                  <p className="text-xs text-gray-500">
                    {customer.transactionCount} transactions • Last: {new Date(customer.lastTransaction).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">${customer.totalSpent.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">
                    Avg: ${(customer.totalSpent / customer.transactionCount).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Report Table */}
      <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Detailed Report</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transactions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Transaction
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Growth
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Refunds
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Net Revenue
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reportData.map((data, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {data.period}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${data.revenue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {data.transactions}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${data.averageTransaction.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center">
                      {data.growth > 0 ? (
                        <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                      )}
                      <span className={data.growth > 0 ? 'text-green-600' : 'text-red-600'}>
                        {data.growth > 0 ? '+' : ''}{data.growth}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${data.refunds.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${data.netRevenue.toLocaleString()}
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