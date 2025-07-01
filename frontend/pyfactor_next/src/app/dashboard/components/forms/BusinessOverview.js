'use client';

import React, { useState, useEffect } from 'react';
import { 
  ChartBarIcon,
  CurrencyDollarIcon,
  BanknotesIcon,
  BuildingLibraryIcon,
  ScaleIcon,
  ChartPieIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  CreditCardIcon,
  UserGroupIcon,
  ShoppingCartIcon,
  CubeIcon,
  DocumentTextIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';

const BusinessOverview = () => {
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  // Format number
  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num || 0);
  };

  // Metric Card Component
  const MetricCard = ({ title, value, subValue, icon: Icon, color, trend, onClick }) => (
    <div 
      className={`bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-full ${
          color === 'blue' ? 'bg-blue-100' :
          color === 'green' ? 'bg-green-100' :
          color === 'red' ? 'bg-red-100' :
          color === 'purple' ? 'bg-purple-100' :
          color === 'orange' ? 'bg-orange-100' :
          color === 'teal' ? 'bg-teal-100' :
          color === 'yellow' ? 'bg-yellow-100' :
          color === 'indigo' ? 'bg-indigo-100' :
          'bg-gray-100'
        }`}>
          <Icon className={`w-6 h-6 ${
            color === 'blue' ? 'text-blue-600' :
            color === 'green' ? 'text-green-600' :
            color === 'red' ? 'text-red-600' :
            color === 'purple' ? 'text-purple-600' :
            color === 'orange' ? 'text-orange-600' :
            color === 'teal' ? 'text-teal-600' :
            color === 'yellow' ? 'text-yellow-600' :
            color === 'indigo' ? 'text-indigo-600' :
            'text-gray-600'
          }`} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center text-sm ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend >= 0 ? (
              <ArrowTrendingUpIcon className="w-4 h-4 mr-1" />
            ) : (
              <ArrowTrendingDownIcon className="w-4 h-4 mr-1" />
            )}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">{title}</h3>
      <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
      {subValue && <p className="text-sm text-gray-600 mt-1">{subValue}</p>}
    </div>
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-black mb-2 flex items-center">
          <ChartBarIcon className="h-6 w-6 text-blue-600 mr-2" />
          Business Overview
        </h1>
        <p className="text-gray-600">Complete snapshot of your business performance</p>
      </div>

      {/* Financial Position Section */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <ScaleIcon className="w-5 h-5 text-gray-600 mr-2" />
          Financial Position
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Assets"
            value={formatCurrency(0)}
            subValue="Cash + Inventory + Receivables"
            icon={ChartPieIcon}
            color="blue"
          />
          <MetricCard
            title="Total Liabilities"
            value={formatCurrency(0)}
            subValue="Payables + Loans"
            icon={CreditCardIcon}
            color="red"
          />
          <MetricCard
            title="Equity"
            value={formatCurrency(0)}
            subValue="Assets - Liabilities"
            icon={ScaleIcon}
            color="green"
          />
          <MetricCard
            title="Bank Balance"
            value={formatCurrency(0)}
            subValue="All accounts"
            icon={BuildingLibraryIcon}
            color="purple"
          />
        </div>
      </div>

      {/* Cash Flow & Liquidity */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <BanknotesIcon className="w-5 h-5 text-gray-600 mr-2" />
          Cash Flow & Liquidity
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Cash on Hand"
            value={formatCurrency(0)}
            subValue="Available immediately"
            icon={BanknotesIcon}
            color="green"
          />
          <MetricCard
            title="Accounts Receivable"
            value={formatCurrency(0)}
            subValue="Due from customers"
            icon={DocumentTextIcon}
            color="blue"
          />
          <MetricCard
            title="Accounts Payable"
            value={formatCurrency(0)}
            subValue="Due to suppliers"
            icon={ExclamationTriangleIcon}
            color="yellow"
          />
          <MetricCard
            title="Working Capital"
            value={formatCurrency(0)}
            subValue="Current assets - liabilities"
            icon={TrendingUpIcon}
            color="teal"
          />
        </div>
      </div>

      {/* Revenue & Performance */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <CurrencyDollarIcon className="w-5 h-5 text-gray-600 mr-2" />
          Revenue & Performance
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Revenue"
            value={formatCurrency(0)}
            subValue="All time"
            icon={CurrencyDollarIcon}
            color="blue"
            trend={0}
          />
          <MetricCard
            title="Monthly Revenue"
            value={formatCurrency(0)}
            subValue="This month"
            icon={CalendarIcon}
            color="green"
            trend={0}
          />
          <MetricCard
            title="Profit Margin"
            value="0%"
            subValue="Revenue - Expenses"
            icon={ChartBarIcon}
            color="purple"
          />
          <MetricCard
            title="Expenses"
            value={formatCurrency(0)}
            subValue="This month"
            icon={TrendingDownIcon}
            color="red"
          />
        </div>
      </div>

      {/* Operations Metrics */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <ShoppingCartIcon className="w-5 h-5 text-gray-600 mr-2" />
          Operations
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Orders"
            value={formatNumber(0)}
            subValue="All time"
            icon={ShoppingCartIcon}
            color="indigo"
          />
          <MetricCard
            title="Pending Orders"
            value={formatNumber(0)}
            subValue="Requires action"
            icon={ClockIcon}
            color="yellow"
          />
          <MetricCard
            title="Active Customers"
            value={formatNumber(0)}
            subValue="Last 30 days"
            icon={UserGroupIcon}
            color="green"
          />
          <MetricCard
            title="Inventory Value"
            value={formatCurrency(0)}
            subValue="Products + Services"
            icon={CubeIcon}
            color="orange"
          />
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <ChartBarIcon className="w-5 h-5 text-gray-600 mr-2" />
          Key Performance Indicators
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <MetricCard
            title="Customer Lifetime Value"
            value={formatCurrency(0)}
            subValue="Average per customer"
            icon={UserGroupIcon}
            color="purple"
          />
          <MetricCard
            title="Average Order Value"
            value={formatCurrency(0)}
            subValue="Per transaction"
            icon={ShoppingCartIcon}
            color="blue"
          />
          <MetricCard
            title="Inventory Turnover"
            value="0x"
            subValue="Times per year"
            icon={CubeIcon}
            color="green"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <ShoppingCartIcon className="w-6 h-6 text-blue-600 mb-2" />
            <span className="text-sm text-gray-700">New Order</span>
          </button>
          <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <CurrencyDollarIcon className="w-6 h-6 text-green-600 mb-2" />
            <span className="text-sm text-gray-700">Create Invoice</span>
          </button>
          <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <UserGroupIcon className="w-6 h-6 text-purple-600 mb-2" />
            <span className="text-sm text-gray-700">Add Customer</span>
          </button>
          <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <CubeIcon className="w-6 h-6 text-orange-600 mb-2" />
            <span className="text-sm text-gray-700">Add Product</span>
          </button>
          <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <ChartBarIcon className="w-6 h-6 text-indigo-600 mb-2" />
            <span className="text-sm text-gray-700">View Reports</span>
          </button>
          <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <BanknotesIcon className="w-6 h-6 text-teal-600 mb-2" />
            <span className="text-sm text-gray-700">Record Payment</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BusinessOverview;