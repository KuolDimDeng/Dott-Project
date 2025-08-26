'use client';

import React, { useState, useEffect } from 'react';
import { 
  ChartBarIcon, 
  CurrencyDollarIcon, 
  UserGroupIcon,
  ShoppingBagIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  DocumentTextIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/20/solid';

// Simple metric card component
const MetricCard = ({ title, value, change, icon: Icon, color = 'blue', loading = false }) => {
  const isPositive = change > 0;
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/3"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
          {change !== undefined && change !== null && (
            <div className="flex items-center mt-2">
              {isPositive ? (
                <ArrowUpIcon className="h-4 w-4 text-green-500 mr-1" />
              ) : (
                <ArrowDownIcon className="h-4 w-4 text-red-500 mr-1" />
              )}
              <span className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {Math.abs(change)}%
              </span>
              <span className="text-sm text-gray-500 ml-1">vs last period</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
};

// Simple chart placeholder
const SimpleChart = ({ title, loading = false }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center">
          <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">Chart visualization coming soon</p>
          <p className="text-xs text-gray-500 mt-1">Add transactions to see your data</p>
        </div>
      </div>
    </div>
  );
};

// Recent activity component
const RecentActivity = ({ loading = false }) => {
  const activities = [
    { id: 1, type: 'invoice', description: 'Invoice #1234 created', time: '2 hours ago', icon: DocumentTextIcon },
    { id: 2, type: 'payment', description: 'Payment received from John Doe', time: '4 hours ago', icon: CurrencyDollarIcon },
    { id: 3, type: 'customer', description: 'New customer added: Jane Smith', time: '1 day ago', icon: UserGroupIcon },
    { id: 4, type: 'product', description: 'Product "Widget Pro" updated', time: '2 days ago', icon: ShoppingBagIcon },
  ];

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-2 bg-gray-200 rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
      <div className="space-y-4">
        {activities.map((activity) => {
          const Icon = activity.icon;
          return (
            <div key={activity.id} className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="p-2 bg-gray-100 rounded-full">
                  <Icon className="h-5 w-5 text-gray-600" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                <p className="text-xs text-gray-500 flex items-center mt-1">
                  <ClockIcon className="h-3 w-3 mr-1" />
                  {activity.time}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <button className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium">
        View all activity →
      </button>
    </div>
  );
};

export default function BusinessOverviewDashboard() {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    // Simulate data loading
    const timer = setTimeout(() => {
      setDashboardData({
        metrics: {
          revenue: { value: '$12,345', change: 12.5 },
          customers: { value: '156', change: 8.2 },
          invoices: { value: '42', change: -3.1 },
          products: { value: '89', change: 5.7 },
        }
      });
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Business Overview</h1>
            <p className="text-gray-600 mt-1">Welcome back! Here's what's happening with your business.</p>
          </div>
          <div className="flex items-center space-x-2">
            <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
              Last 30 days
            </button>
            <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700">
              Export Report
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Revenue"
          value={dashboardData?.metrics?.revenue?.value || '$0'}
          change={dashboardData?.metrics?.revenue?.change}
          icon={CurrencyDollarIcon}
          color="green"
          loading={loading}
        />
        <MetricCard
          title="Total Customers"
          value={dashboardData?.metrics?.customers?.value || '0'}
          change={dashboardData?.metrics?.customers?.change}
          icon={UserGroupIcon}
          color="blue"
          loading={loading}
        />
        <MetricCard
          title="Active Invoices"
          value={dashboardData?.metrics?.invoices?.value || '0'}
          change={dashboardData?.metrics?.invoices?.change}
          icon={DocumentTextIcon}
          color="purple"
          loading={loading}
        />
        <MetricCard
          title="Products"
          value={dashboardData?.metrics?.products?.value || '0'}
          change={dashboardData?.metrics?.products?.change}
          icon={ShoppingBagIcon}
          color="orange"
          loading={loading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SimpleChart title="Revenue Trend" loading={loading} />
        <SimpleChart title="Sales by Category" loading={loading} />
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SimpleChart title="Monthly Performance" loading={loading} />
        </div>
        <div className="lg:col-span-1">
          <RecentActivity loading={loading} />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center">
            <CurrencyDollarIcon className="h-8 w-8 mx-auto text-gray-600 mb-2" />
            <span className="text-sm font-medium text-gray-900">Create Invoice</span>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center">
            <UserGroupIcon className="h-8 w-8 mx-auto text-gray-600 mb-2" />
            <span className="text-sm font-medium text-gray-900">Add Customer</span>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center">
            <ShoppingBagIcon className="h-8 w-8 mx-auto text-gray-600 mb-2" />
            <span className="text-sm font-medium text-gray-900">Add Product</span>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center">
            <ChartBarIcon className="h-8 w-8 mx-auto text-gray-600 mb-2" />
            <span className="text-sm font-medium text-gray-900">View Reports</span>
          </button>
        </div>
      </div>
    </div>
  );
}