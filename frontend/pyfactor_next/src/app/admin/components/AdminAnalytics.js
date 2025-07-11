'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  UsersIcon,
  DocumentTextIcon,
  CreditCardIcon,
  GlobeAltIcon,
  CalendarIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import StandardSpinner, { CenteredSpinner } from '@/components/ui/StandardSpinner';

export default function AdminAnalytics({ adminUser }) {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30'); // days

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/admin/proxy/admin/analytics?days=${dateRange}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data);
      } else {
        toast.error('Failed to load analytics data');
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num?.toLocaleString() || '0';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  const formatPercentage = (value) => {
    if (!value) return '0%';
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getTrendIcon = (trend) => {
    if (trend > 0) {
      return <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />;
    } else if (trend < 0) {
      return <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />;
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <CenteredSpinner size="large" />
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No analytics data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          <div className="flex gap-2">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
            <button
              onClick={loadAnalytics}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ArrowPathIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(analyticsData.revenue?.total)}
              </p>
              <div className="flex items-center mt-1">
                {getTrendIcon(analyticsData.revenue?.trend)}
                <span className={`text-sm ml-1 ${analyticsData.revenue?.trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercentage(analyticsData.revenue?.trend)}
                </span>
              </div>
            </div>
            <CreditCardIcon className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(analyticsData.users?.active)}
              </p>
              <div className="flex items-center mt-1">
                {getTrendIcon(analyticsData.users?.trend)}
                <span className={`text-sm ml-1 ${analyticsData.users?.trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercentage(analyticsData.users?.trend)}
                </span>
              </div>
            </div>
            <UsersIcon className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Documents</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(analyticsData.documents?.total)}
              </p>
              <div className="flex items-center mt-1">
                {getTrendIcon(analyticsData.documents?.trend)}
                <span className={`text-sm ml-1 ${analyticsData.documents?.trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercentage(analyticsData.documents?.trend)}
                </span>
              </div>
            </div>
            <DocumentTextIcon className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Countries</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(analyticsData.geographic?.countries_count)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {analyticsData.geographic?.new_countries} new
              </p>
            </div>
            <GlobeAltIcon className="h-8 w-8 text-indigo-500" />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Revenue Trend</h3>
          {analyticsData.revenue?.chart_data ? (
            <div className="h-64 flex items-end justify-between gap-2">
              {analyticsData.revenue.chart_data.map((point, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div 
                    className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors"
                    style={{ 
                      height: `${(point.value / Math.max(...analyticsData.revenue.chart_data.map(p => p.value))) * 100}%` 
                    }}
                  />
                  <span className="text-xs text-gray-500 mt-2">{point.label}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              No chart data available
            </div>
          )}
        </div>

        {/* User Growth Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">User Growth</h3>
          {analyticsData.users?.chart_data ? (
            <div className="h-64 flex items-end justify-between gap-2">
              {analyticsData.users.chart_data.map((point, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div 
                    className="w-full bg-green-500 rounded-t hover:bg-green-600 transition-colors"
                    style={{ 
                      height: `${(point.value / Math.max(...analyticsData.users.chart_data.map(p => p.value))) * 100}%` 
                    }}
                  />
                  <span className="text-xs text-gray-500 mt-2">{point.label}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              No chart data available
            </div>
          )}
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plan Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Plan Distribution</h3>
          {analyticsData.subscriptions?.plan_distribution ? (
            <div className="space-y-3">
              {Object.entries(analyticsData.subscriptions.plan_distribution).map(([plan, data]) => (
                <div key={plan}>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{plan}</span>
                    <span className="font-medium">{data.count} ({data.percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div 
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${data.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">No data available</p>
          )}
        </div>

        {/* Top Countries */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Top Countries</h3>
          {analyticsData.geographic?.top_countries ? (
            <div className="space-y-2">
              {analyticsData.geographic.top_countries.map((country, index) => (
                <div key={country.code} className="flex justify-between items-center">
                  <div className="flex items-center">
                    <span className="text-lg mr-2">{country.flag}</span>
                    <span className="text-sm">{country.name}</span>
                  </div>
                  <span className="text-sm font-medium">{country.users}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">No data available</p>
          )}
        </div>

        {/* Key Performance Indicators */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Key Metrics</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Avg. Revenue per User</span>
              <span className="text-sm font-medium">
                {formatCurrency(analyticsData.kpis?.arpu)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Churn Rate</span>
              <span className="text-sm font-medium">
                {analyticsData.kpis?.churn_rate}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Conversion Rate</span>
              <span className="text-sm font-medium">
                {analyticsData.kpis?.conversion_rate}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Support Tickets</span>
              <span className="text-sm font-medium">
                {analyticsData.kpis?.support_tickets}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}