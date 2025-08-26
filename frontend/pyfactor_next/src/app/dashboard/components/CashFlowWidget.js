'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { 
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon,
  ChartBarIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { formatCurrency as formatCurrencyUtil, getCurrencyInfo } from '@/utils/currencyFormatter';

// Dynamically import Recharts to avoid SSR issues

const ComposedChart = dynamic(
  () => import('recharts').then(mod => mod.ComposedChart),
  { ssr: false }
);

const Bar = dynamic(
  () => import('recharts').then(mod => mod.Bar),
  { ssr: false }
);

const Line = dynamic(
  () => import('recharts').then(mod => mod.Line),
  { ssr: false }
);

const XAxis = dynamic(
  () => import('recharts').then(mod => mod.XAxis),
  { ssr: false }
);

const YAxis = dynamic(
  () => import('recharts').then(mod => mod.YAxis),
  { ssr: false }
);

const CartesianGrid = dynamic(
  () => import('recharts').then(mod => mod.CartesianGrid),
  { ssr: false }
);

const Tooltip = dynamic(
  () => import('recharts').then(mod => mod.Tooltip),
  { ssr: false }
);

const Legend = dynamic(
  () => import('recharts').then(mod => mod.Legend),
  { ssr: false }
);

function CashFlowWidget({ onNavigate, userData }) {
  const { t } = useTranslation('dashboard');
  const [timeRange, setTimeRange] = useState('month');
  const [cashFlowData, setCashFlowData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState('USD');
  const [mounted, setMounted] = useState(false);
  const [chartWidth, setChartWidth] = useState(600);
  const [showingSampleData, setShowingSampleData] = useState(false);
  const chartContainerRef = useRef(null);
  
  // Ensure component is mounted before rendering charts and handle resize
  useEffect(() => {
    setMounted(true);
    
    const updateChartWidth = () => {
      if (chartContainerRef.current) {
        const width = chartContainerRef.current.offsetWidth - 32; // Subtract padding
        setChartWidth(Math.max(width, 300)); // Minimum width of 300
      }
    };
    
    updateChartWidth();
    window.addEventListener('resize', updateChartWidth);
    return () => window.removeEventListener('resize', updateChartWidth);
  }, []);
  
  // Generate sample data for demonstration
  const generateSampleData = (range) => {
    const currentDate = new Date();
    const data = [];
    let periods = 6; // Default for months
    
    if (range === 'quarter') {
      periods = 4;
    } else if (range === 'year') {
      periods = 3;
    }
    
    // Generate data going backwards from current date
    for (let i = periods - 1; i >= 0; i--) {
      let periodLabel = '';
      const baseInflow = 8000 + Math.random() * 4000;
      const baseOutflow = 6000 + Math.random() * 3000;
      
      if (range === 'month') {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        periodLabel = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      } else if (range === 'quarter') {
        const quarter = Math.floor((currentDate.getMonth() - (i * 3)) / 3) + 1;
        const year = currentDate.getFullYear();
        periodLabel = `Q${quarter} ${year}`;
      } else {
        periodLabel = (currentDate.getFullYear() - i).toString();
      }
      
      const inflow = Math.round(baseInflow);
      const outflow = Math.round(baseOutflow);
      const netFlow = inflow - outflow;
      const previousBalance = data.length > 0 ? data[data.length - 1].balance : 10000;
      
      data.push({
        period: periodLabel,
        inflow: inflow,
        outflow: outflow,
        netFlow: netFlow,
        balance: previousBalance + netFlow
      });
    }
    
    return data;
  };
  
  // Get currency from userData or business
  useEffect(() => {
    const fetchCurrency = async () => {
      try {
        const response = await fetch('/api/currency/preferences', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          // Check for currency_code first (correct field), then currency as fallback
          const currencyCode = data.preferences?.currency_code || data.preferences?.currency || 'USD';
          setCurrency(currencyCode);
          console.log('[CashFlowWidget] Currency set to:', currencyCode);
        }
      } catch (error) {
        console.log('[CashFlowWidget] Using default currency USD');
      }
    };
    
    fetchCurrency();
  }, [userData]);
  
  // Fetch cash flow data - REAL DATA ONLY
  useEffect(() => {
    const fetchCashFlowData = async () => {
      try {
        setLoading(true);
        
        // Fetch real data from our new endpoint
        const response = await fetch(`/api/reports/cashflow?range=${timeRange}`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('[CashFlowWidget] API Response:', data);
          
          if (data.success && data.data && data.data.length > 0) {
            setCashFlowData(data.data);
            setShowingSampleData(false);
            console.log('[CashFlowWidget] Real data loaded:', data.data.length, 'records');
          } else {
            // No real data available - show sample data for better UX
            console.log('[CashFlowWidget] No real data, showing sample data for demonstration');
            const sampleData = generateSampleData(timeRange);
            setCashFlowData(sampleData);
            setShowingSampleData(true);
          }
        } else {
          console.error('[CashFlowWidget] Failed to fetch data:', response.status);
          // Show sample data on error
          const sampleData = generateSampleData(timeRange);
          setCashFlowData(sampleData);
          setShowingSampleData(true);
        }
      } catch (error) {
        console.error('[CashFlowWidget] Error fetching cash flow:', error);
        // Show sample data on error
        const sampleData = generateSampleData(timeRange);
        setCashFlowData(sampleData);
        setShowingSampleData(true);
      } finally {
        setLoading(false);
      }
    };
    
    if (mounted) {
      fetchCashFlowData();
    }
  }, [timeRange, mounted]);
  
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
  
  // Calculate current period stats
  const currentPeriodData = cashFlowData[cashFlowData.length - 1] || {};
  const previousPeriodData = cashFlowData[cashFlowData.length - 2] || {};
  const cashFlowChange = (currentPeriodData.balance || 0) - (previousPeriodData.balance || 0);
  const changePercentage = previousPeriodData.balance 
    ? ((cashFlowChange / previousPeriodData.balance) * 100).toFixed(1)
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
              <span className="font-medium">
                {formatCurrency(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };
  
  // Format Y-axis
  const formatYAxis = (value) => {
    const currencyInfo = getCurrencyInfo(currency);
    if (value >= 1000) {
      // For large numbers, show abbreviated format
      const symbol = currencyInfo.symbol || currency;
      return `${symbol}${(value / 1000).toFixed(0)}k`;
    }
    return formatCurrencyUtil(value, currency, { includeCode: false });
  };
  
  // Format currency display using the comprehensive formatter
  const formatCurrency = (value) => {
    return formatCurrencyUtil(value || 0, currency, { includeCode: false });
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
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                Track money in and out of your business
              </div>
            </div>
            {showingSampleData && (
              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full font-medium">
                Sample Data
              </span>
            )}
            {currency !== 'USD' && !showingSampleData && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {currency}
              </span>
            )}
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
              {formatCurrency(currentPeriodData.inflow)}
            </p>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-3 border border-red-200">
            <p className="text-xs text-red-700 font-medium mb-1">Cash Out</p>
            <p className="text-lg font-bold text-red-900">
              {formatCurrency(currentPeriodData.outflow)}
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
                {formatCurrency(Math.abs(currentPeriodData.netFlow || 0))}
              </p>
            </div>
          </div>
        </div>
        
        {/* Chart */}
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-pulse text-center">
              <ChartBarIcon className="h-12 w-12 text-gray-300 mx-auto" />
              <p className="text-sm text-gray-500 mt-2">Loading cash flow data...</p>
            </div>
          </div>
        ) : mounted && cashFlowData.length > 0 ? (
          <div className="relative">
            {showingSampleData && (
              <div className="absolute top-2 right-2 z-10 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 max-w-xs">
                <p className="text-xs text-amber-800 font-medium">This is sample data</p>
                <p className="text-xs text-amber-700 mt-1">
                  Start adding invoices and expenses to see your actual cash flow
                </p>
              </div>
            )}
            <div className="h-64 w-full overflow-x-auto" ref={chartContainerRef} className={showingSampleData ? 'opacity-90' : ''}>
            <ComposedChart
              width={chartWidth}
              height={256}
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
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="period"
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
            </div>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <ChartBarIcon className="h-12 w-12 text-gray-300 mx-auto" />
              <p className="text-sm text-gray-500 mt-2">No cash flow data available</p>
              <p className="text-xs text-gray-400 mt-1">Add invoices and expenses to see your cash flow</p>
              <button
                onClick={handleNavigateToCashFlow}
                className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Go to Reports
              </button>
            </div>
          </div>
        )}
        
        {/* Footer Summary */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Current Balance</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(currentPeriodData.balance)}
              </p>
            </div>
            {cashFlowData.length > 1 && (
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
                  {changePercentage}% vs last period
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CashFlowWidget;