'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area
} from 'recharts';
import { 
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon,
  ChartBarIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

function CashFlowWidget({ onNavigate }) {
  const { t } = useTranslation('dashboard');
  const [timeRange, setTimeRange] = useState('month');
  const [cashFlowData, setCashFlowData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const generateCashFlowData = () => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      const dataArray = [];
      let runningBalance = 25000;
      
      for (let i = 0; i < months.length; i++) {
        const inflow = Math.floor(Math.random() * 20000) + 15000;
        const outflow = Math.floor(Math.random() * 15000) + 10000;
        const netFlow = inflow - outflow;
        runningBalance += netFlow;
        
        dataArray.push({
          month: months[i],
          inflow,
          outflow,
          netFlow,
          balance: runningBalance
        });
      }
      
      return dataArray;
    };
    
    setTimeout(() => {
      setCashFlowData(generateCashFlowData());
      setLoading(false);
    }, 500);
  }, [timeRange]);
  
  const handleNavigateToCashFlow = () => {
    console.log('[CashFlowWidget] Navigating to reports');
    // Dispatch a custom event for navigation
    const event = new CustomEvent('menuNavigation', {
      detail: { item: 'reports-dashboard' }
    });
    window.dispatchEvent(event);
    
    // Also try the onNavigate prop if available
    if (onNavigate) {
      onNavigate('reports', { activeTab: 'cashflow' });
    }
  };
  
  // Calculate current month stats
  const currentMonthData = cashFlowData[cashFlowData.length - 1] || {};
  const previousMonthData = cashFlowData[cashFlowData.length - 2] || {};
  const cashFlowChange = (currentMonthData.balance || 0) - (previousMonthData.balance || 0);
  const changePercentage = previousMonthData.balance 
    ? ((cashFlowChange / previousMonthData.balance) * 100).toFixed(1)
    : 0;
  
  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-4 text-sm">
              <span style={{ color: entry.color }} className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></span>
                {entry.name}:
              </span>
              <span className="font-medium">${entry.value?.toLocaleString()}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };
  
  // Format Y-axis
  const formatYAxis = (value) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}k`;
    }
    return `$${value}`;
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-gray-900">Cash Flow</h2>
            <div className="group relative">
              <InformationCircleIcon className="h-4 w-4 text-gray-400 cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                Track money in and out of your business
              </div>
            </div>
          </div>
          <button
            onClick={handleNavigateToCashFlow}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
          >
            View Details
            <ChartBarIcon className="h-4 w-4 ml-1" />
          </button>
        </div>
        
        {/* Time Range Selector */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-4">
          {['month', 'quarter', 'year'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                timeRange === range
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {range === 'month' ? 'Monthly' : range === 'quarter' ? 'Quarterly' : 'Yearly'}
            </button>
          ))}
        </div>
        
        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border border-green-200">
            <p className="text-xs text-green-700 font-medium mb-1">Cash In</p>
            <p className="text-lg font-bold text-green-900">
              ${currentMonthData.inflow?.toLocaleString() || '0'}
            </p>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-3 border border-red-200">
            <p className="text-xs text-red-700 font-medium mb-1">Cash Out</p>
            <p className="text-lg font-bold text-red-900">
              ${currentMonthData.outflow?.toLocaleString() || '0'}
            </p>
          </div>
          <div className={`bg-gradient-to-br rounded-lg p-3 border ${
            cashFlowChange >= 0 
              ? 'from-blue-50 to-blue-100 border-blue-200' 
              : 'from-orange-50 to-orange-100 border-orange-200'
          }`}>
            <p className={`text-xs font-medium mb-1 ${
              cashFlowChange >= 0 ? 'text-blue-700' : 'text-orange-700'
            }`}>Net Flow</p>
            <div className="flex items-center gap-1">
              {cashFlowChange >= 0 ? (
                <ArrowTrendingUpIcon className="h-4 w-4 text-blue-600" />
              ) : (
                <ArrowTrendingDownIcon className="h-4 w-4 text-orange-600" />
              )}
              <p className={`text-lg font-bold ${
                cashFlowChange >= 0 ? 'text-blue-900' : 'text-orange-900'
              }`}>
                ${Math.abs(currentMonthData.netFlow || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        
        {/* Chart */}
        {loading || !cashFlowData.length ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-pulse">
              <ChartBarIcon className="h-12 w-12 text-gray-300" />
              <p className="text-sm text-gray-500 mt-2">Loading cash flow data...</p>
            </div>
          </div>
        ) : cashFlowData.length > 0 && (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={cashFlowData}
                margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.3}/>
                  </linearGradient>
                  <linearGradient id="colorOutflow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.3}/>
                  </linearGradient>
                  <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickFormatter={formatYAxis}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ fontSize: '12px' }}
                  iconType="rect"
                />
                <Bar 
                  dataKey="inflow" 
                  fill="url(#colorInflow)" 
                  name="Cash In" 
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="outflow" 
                  fill="url(#colorOutflow)" 
                  name="Cash Out" 
                  radius={[4, 4, 0, 0]}
                />
                <Line 
                  type="monotone" 
                  dataKey="balance" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Balance"
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
        
        {/* Footer Summary */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Current Balance</p>
              <p className="text-xl font-bold text-gray-900">
                ${currentMonthData.balance?.toLocaleString() || '0'}
              </p>
            </div>
            <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full ${
              cashFlowChange >= 0 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700'
            }`}>
              {cashFlowChange >= 0 ? (
                <ArrowTrendingUpIcon className="h-4 w-4" />
              ) : (
                <ArrowTrendingDownIcon className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">
                {changePercentage}% vs last month
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CashFlowWidget;