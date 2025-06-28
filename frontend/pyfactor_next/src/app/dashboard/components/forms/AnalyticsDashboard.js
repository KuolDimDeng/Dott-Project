'use client';

import React, { useState, useEffect } from 'react';
import { analyticsApi } from '@/services/api/analytics';
import { toast } from 'react-hot-toast';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, ComposedChart
} from 'recharts';

const AnalyticsDashboard = ({ userData }) => {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [metrics, setMetrics] = useState({
    revenue: { current: 0, previous: 0, growth: 0 },
    expenses: { current: 0, previous: 0, growth: 0 },
    profit: { current: 0, previous: 0, growth: 0 },
    customers: { current: 0, new: 0, growth: 0 },
    cashFlow: { inflow: 0, outflow: 0, net: 0 }
  });
  const [chartData, setChartData] = useState({
    revenue: [],
    expenses: [],
    profitTrend: [],
    customerGrowth: [],
    topProducts: [],
    topCustomers: [],
    cashFlow: []
  });
  const [selectedMetric, setSelectedMetric] = useState('revenue');

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Fetch key metrics
      const metricsResponse = await analyticsApi.getKeyMetrics({
        start_date: dateRange.startDate,
        end_date: dateRange.endDate
      });
      if (metricsResponse?.data) {
        // Ensure proper structure with defaults
        const metricsData = {
          revenue: metricsResponse.data.revenue || { current: 0, previous: 0, growth: 0 },
          expenses: metricsResponse.data.expenses || { current: 0, previous: 0, growth: 0 },
          profit: metricsResponse.data.profit || { current: 0, previous: 0, growth: 0 },
          customers: metricsResponse.data.customers || { current: 0, new: 0, growth: 0 },
          cashFlow: metricsResponse.data.cashFlow || { inflow: 0, outflow: 0, net: 0 }
        };
        setMetrics(metricsData);
      } else {
        // Use mock data if no response
        setMetrics(generateMockMetrics());
      }
      
      // Fetch chart data
      const chartResponse = await analyticsApi.getChartData({
        start_date: dateRange.startDate,
        end_date: dateRange.endDate,
        metric: selectedMetric
      });
      if (chartResponse?.data) {
        // Ensure proper structure with defaults
        const chartDataResponse = {
          revenue: chartResponse.data.revenue || [],
          expenses: chartResponse.data.expenses || [],
          profitTrend: chartResponse.data.profitTrend || [],
          customerGrowth: chartResponse.data.customerGrowth || [],
          topProducts: chartResponse.data.topProducts || [],
          topCustomers: chartResponse.data.topCustomers || [],
          cashFlow: chartResponse.data.cashFlow || []
        };
        setChartData(chartDataResponse);
      } else {
        // Use mock data if no response
        setChartData(generateMockChartData());
      }
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      // Use mock data for demonstration
      setMetrics(generateMockMetrics());
      setChartData(generateMockChartData());
    } finally {
      setLoading(false);
    }
  };

  const generateMockMetrics = () => {
    return {
      revenue: { current: 125000, previous: 110000, growth: 13.6 },
      expenses: { current: 85000, previous: 82000, growth: 3.7 },
      profit: { current: 40000, previous: 28000, growth: 42.9 },
      customers: { current: 250, new: 35, growth: 16.3 },
      cashFlow: { inflow: 135000, outflow: 95000, net: 40000 }
    };
  };

  const generateMockChartData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return {
      revenue: months.map((month, index) => ({
        month,
        revenue: 20000 + Math.random() * 10000,
        target: 22000,
        lastYear: 18000 + Math.random() * 8000
      })),
      expenses: months.map((month, index) => ({
        month,
        operating: 12000 + Math.random() * 3000,
        marketing: 3000 + Math.random() * 1000,
        payroll: 8000 + Math.random() * 2000,
        other: 2000 + Math.random() * 500
      })),
      profitTrend: months.map((month, index) => ({
        month,
        profit: 5000 + Math.random() * 5000,
        margin: 15 + Math.random() * 10
      })),
      customerGrowth: months.map((month, index) => ({
        month,
        total: 200 + index * 10 + Math.floor(Math.random() * 20),
        new: 20 + Math.floor(Math.random() * 15),
        churn: Math.floor(Math.random() * 5)
      })),
      topProducts: [
        { name: 'Product A', revenue: 35000, units: 120, percentage: 28 },
        { name: 'Product B', revenue: 30000, units: 95, percentage: 24 },
        { name: 'Service C', revenue: 25000, units: 50, percentage: 20 },
        { name: 'Product D', revenue: 20000, units: 180, percentage: 16 },
        { name: 'Service E', revenue: 15000, units: 30, percentage: 12 }
      ],
      topCustomers: [
        { name: 'Acme Corp', revenue: 45000, orders: 25, percentage: 18 },
        { name: 'Globex Inc', revenue: 38000, orders: 20, percentage: 15.2 },
        { name: 'Wayne Enterprises', revenue: 32000, orders: 18, percentage: 12.8 },
        { name: 'Stark Industries', revenue: 28000, orders: 15, percentage: 11.2 },
        { name: 'Umbrella Corp', revenue: 22000, orders: 12, percentage: 8.8 }
      ],
      cashFlow: months.map((month, index) => ({
        month,
        inflow: 20000 + Math.random() * 10000,
        outflow: -(15000 + Math.random() * 5000),
        net: 5000 + Math.random() * 5000
      }))
    };
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercentage = (value) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="text-gray-600 mt-2">Track your business performance and insights</p>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="block w-full border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="block w-full border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={fetchAnalyticsData}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Update
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Revenue</p>
            <span className={`text-sm font-medium ${metrics.revenue?.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercentage(metrics.revenue?.growth || 0)}
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.revenue?.current || 0)}</p>
          <p className="text-xs text-gray-500 mt-1">vs {formatCurrency(metrics.revenue?.previous || 0)} last period</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Expenses</p>
            <span className={`text-sm font-medium ${metrics.expenses?.growth <= 5 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercentage(metrics.expenses?.growth || 0)}
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.expenses?.current || 0)}</p>
          <p className="text-xs text-gray-500 mt-1">vs {formatCurrency(metrics.expenses?.previous || 0)} last period</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Profit</p>
            <span className={`text-sm font-medium ${metrics.profit?.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercentage(metrics.profit?.growth || 0)}
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.profit?.current || 0)}</p>
          <p className="text-xs text-gray-500 mt-1">vs {formatCurrency(metrics.profit?.previous || 0)} last period</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Customers</p>
            <span className={`text-sm font-medium ${metrics.customers?.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercentage(metrics.customers?.growth || 0)}
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{metrics.customers?.current || 0}</p>
          <p className="text-xs text-gray-500 mt-1">{metrics.customers?.new || 0} new this period</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Cash Flow</p>
          </div>
          <p className={`text-2xl font-bold ${metrics.cashFlow?.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(metrics.cashFlow?.net || 0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Net cash position</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue Trend */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData.revenue}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="revenue" fill="#3B82F6" name="Current" />
              <Line type="monotone" dataKey="target" stroke="#EF4444" name="Target" strokeWidth={2} />
              <Line type="monotone" dataKey="lastYear" stroke="#10B981" name="Last Year" strokeDasharray="5 5" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Expense Breakdown */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Expense Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.expenses}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="operating" stackId="a" fill="#3B82F6" />
              <Bar dataKey="marketing" stackId="a" fill="#10B981" />
              <Bar dataKey="payroll" stackId="a" fill="#F59E0B" />
              <Bar dataKey="other" stackId="a" fill="#8B5CF6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Profit Margin Trend */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Profit & Margin Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData.profitTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="profit" fill="#10B981" name="Profit ($)" />
              <Line yAxisId="right" type="monotone" dataKey="margin" stroke="#EF4444" name="Margin (%)" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Customer Growth */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Customer Growth</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData.customerGrowth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="total" stackId="1" stroke="#3B82F6" fill="#3B82F6" name="Total Customers" />
              <Area type="monotone" dataKey="new" stackId="2" stroke="#10B981" fill="#10B981" name="New Customers" />
              <Area type="monotone" dataKey="churn" stackId="2" stroke="#EF4444" fill="#EF4444" name="Churned" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Section - Top Products and Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products/Services */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Top Products & Services</h3>
          <div className="space-y-3">
            {chartData.topProducts.map((product, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium">{product.name}</span>
                    <span className="text-sm text-gray-600">{formatCurrency(product.revenue)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${product.percentage}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{product.units} units sold</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Customers */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Top Customers</h3>
          <div className="space-y-3">
            {chartData.topCustomers.map((customer, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium">{customer.name}</span>
                    <span className="text-sm text-gray-600">{formatCurrency(customer.revenue)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${customer.percentage}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{customer.orders} orders</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cash Flow Chart */}
      <div className="bg-white rounded-lg shadow p-6 mt-6">
        <h3 className="text-lg font-semibold mb-4">Cash Flow Analysis</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData.cashFlow}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => formatCurrency(Math.abs(value))} />
            <Legend />
            <Bar dataKey="inflow" fill="#10B981" name="Cash Inflow" />
            <Bar dataKey="outflow" fill="#EF4444" name="Cash Outflow" />
            <Bar dataKey="net" fill="#3B82F6" name="Net Cash Flow" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;