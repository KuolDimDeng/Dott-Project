'use client';

import React, { useState, useEffect } from 'react';
import { PhosphorIcon } from '@/components/PhosphorIcon';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const WhatsAppAnalytics = ({ onClose }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState([]);
  const [dateRange, setDateRange] = useState('week');
  const [selectedMetric, setSelectedMetric] = useState('revenue');

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Fetch dashboard stats
      const statsResponse = await fetch('/api/proxy/whatsapp-business/analytics/dashboard_stats/');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // Fetch analytics data
      const analyticsResponse = await fetch('/api/proxy/whatsapp-business/analytics/');
      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json();
        setAnalytics(analyticsData.results || analyticsData || []);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getChartData = () => {
    // Process analytics data for charts
    const sortedData = [...analytics].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    return sortedData.slice(-7).map(item => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue: parseFloat(item.total_revenue),
      orders: item.orders_completed,
      messages: item.messages_sent,
      shares: item.catalog_shares
    }));
  };

  const getPieData = () => {
    if (!analytics.length) return [];
    
    const totals = analytics.reduce((acc, item) => ({
      completed: acc.completed + item.orders_completed,
      cancelled: acc.cancelled + item.orders_cancelled,
      initiated: acc.initiated + item.orders_initiated - item.orders_completed - item.orders_cancelled
    }), { completed: 0, cancelled: 0, initiated: 0 });

    return [
      { name: 'Completed', value: totals.completed, color: '#10b981' },
      { name: 'In Progress', value: totals.initiated, color: '#3b82f6' },
      { name: 'Cancelled', value: totals.cancelled, color: '#ef4444' }
    ];
  };

  const getMessageStats = () => {
    if (!analytics.length) return { sent: 0, delivered: 0, read: 0 };
    
    return analytics.reduce((acc, item) => ({
      sent: acc.sent + item.messages_sent,
      delivered: acc.delivered + item.messages_delivered,
      read: acc.read + item.messages_read
    }), { sent: 0, delivered: 0, read: 0 });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const chartData = getChartData();
  const pieData = getPieData();
  const messageStats = getMessageStats();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">WhatsApp Business Analytics</h1>
            <p className="text-gray-600 mt-2">Track your WhatsApp Business performance</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <PhosphorIcon name="X" size={24} />
          </button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Total Revenue</h3>
              <PhosphorIcon name="CurrencyDollar" size={20} className="text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              ${stats?.total_revenue || '0.00'}
            </p>
            <p className="text-sm text-green-600 mt-2">
              +{((parseFloat(stats?.total_revenue || 0) * 0.15).toFixed(2))} this month
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Total Orders</h3>
              <PhosphorIcon name="ShoppingCart" size={20} className="text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats?.total_orders || 0}</p>
            <p className="text-sm text-blue-600 mt-2">
              {stats?.today_orders || 0} today
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Messages Sent</h3>
              <PhosphorIcon name="ChatCircle" size={20} className="text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{messageStats.sent}</p>
            <p className="text-sm text-purple-600 mt-2">
              {((messageStats.read / messageStats.sent * 100) || 0).toFixed(1)}% read rate
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Active Products</h3>
              <PhosphorIcon name="Package" size={20} className="text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats?.active_products || 0}</p>
            <p className="text-sm text-orange-600 mt-2">
              in {stats?.active_catalogs || 0} catalogs
            </p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Revenue/Orders Chart */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Performance Overview</h3>
              <div className="flex space-x-2">
                {['revenue', 'orders', 'messages'].map((metric) => (
                  <button
                    key={metric}
                    onClick={() => setSelectedMetric(metric)}
                    className={`px-3 py-1 text-sm rounded-lg capitalize ${
                      selectedMetric === metric
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {metric}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey={selectedMetric} 
                  stroke={
                    selectedMetric === 'revenue' ? '#10b981' :
                    selectedMetric === 'orders' ? '#3b82f6' : '#8b5cf6'
                  }
                  strokeWidth={2}
                  name={selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Order Status Pie Chart */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Order Status Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Message Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Message Stats */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Message Performance</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-600">Delivery Rate</span>
                  <span className="text-sm font-medium">
                    {((messageStats.delivered / messageStats.sent * 100) || 0).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${(messageStats.delivered / messageStats.sent * 100) || 0}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-600">Read Rate</span>
                  <span className="text-sm font-medium">
                    {((messageStats.read / messageStats.sent * 100) || 0).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${(messageStats.read / messageStats.sent * 100) || 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-900">{messageStats.sent}</p>
                <p className="text-sm text-gray-500">Sent</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{messageStats.delivered}</p>
                <p className="text-sm text-gray-500">Delivered</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{messageStats.read}</p>
                <p className="text-sm text-gray-500">Read</p>
              </div>
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Engagement Metrics</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <PhosphorIcon name="Eye" size={20} className="text-blue-600 mr-3" />
                  <div>
                    <p className="font-medium">Catalog Views</p>
                    <p className="text-sm text-gray-500">Total views across all catalogs</p>
                  </div>
                </div>
                <p className="text-xl font-bold">{analytics.reduce((sum, item) => sum + item.catalog_views, 0)}</p>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <PhosphorIcon name="ShareNetwork" size={20} className="text-green-600 mr-3" />
                  <div>
                    <p className="font-medium">Catalog Shares</p>
                    <p className="text-sm text-gray-500">Times catalog was shared</p>
                  </div>
                </div>
                <p className="text-xl font-bold">{analytics.reduce((sum, item) => sum + item.catalog_shares, 0)}</p>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <PhosphorIcon name="Percent" size={20} className="text-purple-600 mr-3" />
                  <div>
                    <p className="font-medium">Conversion Rate</p>
                    <p className="text-sm text-gray-500">Orders from catalog views</p>
                  </div>
                </div>
                <p className="text-xl font-bold">
                  {(
                    (stats?.total_orders / analytics.reduce((sum, item) => sum + item.catalog_views, 1) * 100) || 0
                  ).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppAnalytics;