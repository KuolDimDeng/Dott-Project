'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { formatCurrency } from '@/utils/formatters';
import MetricsGrid from '../widgets/MetricsGrid';
import RecentTransactions from '../widgets/RecentTransactions';
import QuickActions from '../widgets/QuickActions';
import { useCurrency } from '@/context/CurrencyContext';
import { useSession } from '@/hooks/useSession-v2';

// Custom tooltip for charts
const CustomTooltip = ({ active, payload, label, currencySymbol = '$' }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {currencySymbol}{typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Revenue Chart Component using Recharts
const RevenueChartRecharts = ({ data, currencySymbol = '$' }) => {
  const { t } = useTranslation('dashboard');
  
  if (!data || !data.labels?.length) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('charts.revenueChart', 'Revenue Trend')}
        </h3>
        <div className="h-64 flex items-center justify-center">
          <p className="text-gray-500">{t('empty.noData', 'No data available')}</p>
        </div>
      </div>
    );
  }

  // Transform data for Recharts
  const chartData = data.labels.map((label, index) => ({
    month: label,
    revenue: data.values[index] || 0
  }));

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {t('charts.revenueChart', 'Revenue Trend')}
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="month" 
              tick={{ fill: '#6B7280', fontSize: 12 }}
              axisLine={{ stroke: '#E5E7EB' }}
            />
            <YAxis 
              tick={{ fill: '#6B7280', fontSize: 12 }}
              axisLine={{ stroke: '#E5E7EB' }}
              tickFormatter={(value) => formatCurrency(value, null, true)}
            />
            <Tooltip content={<CustomTooltip currencySymbol={currencySymbol} />} />
            <Area 
              type="monotone" 
              dataKey="revenue" 
              stroke="#3B82F6" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorRevenue)" 
              name={t('charts.revenue', 'Revenue')}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Cash Flow Chart Component
const CashFlowChart = ({ data, currencySymbol = '$' }) => {
  const { t } = useTranslation('dashboard');
  
  if (!data || !data.labels?.length) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('charts.cashFlow', 'Cash Flow')}
        </h3>
        <div className="h-64 flex items-center justify-center">
          <p className="text-gray-500">{t('empty.noData', 'No data available')}</p>
        </div>
      </div>
    );
  }

  // Transform data for Recharts
  const chartData = data.labels.map((label, index) => ({
    month: label,
    inflow: data.inflow?.[index] || 0,
    outflow: data.outflow?.[index] || 0,
    net: (data.inflow?.[index] || 0) - (data.outflow?.[index] || 0)
  }));

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {t('charts.cashFlow', 'Cash Flow')}
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="month" 
              tick={{ fill: '#6B7280', fontSize: 12 }}
              axisLine={{ stroke: '#E5E7EB' }}
            />
            <YAxis 
              tick={{ fill: '#6B7280', fontSize: 12 }}
              axisLine={{ stroke: '#E5E7EB' }}
              tickFormatter={(value) => formatCurrency(value, null, true)}
            />
            <Tooltip content={<CustomTooltip currencySymbol={currencySymbol} />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="inflow" fill="#10B981" name={t('charts.inflow', 'Inflow')} />
            <Bar dataKey="outflow" fill="#EF4444" name={t('charts.outflow', 'Outflow')} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Expense Breakdown Chart
const ExpenseBreakdown = ({ data, currencySymbol = '$' }) => {
  const { t } = useTranslation('dashboard');
  
  if (!data || !data.categories?.length) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('charts.expenseBreakdown', 'Expense Breakdown')}
        </h3>
        <div className="h-64 flex items-center justify-center">
          <p className="text-gray-500">{t('empty.noData', 'No data available')}</p>
        </div>
      </div>
    );
  }

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  // Transform data for Recharts
  const chartData = data.categories.map((category, index) => ({
    name: category,
    value: data.values[index] || 0
  }));

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {t('charts.expenseBreakdown', 'Expense Breakdown')}
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip currencySymbol={currencySymbol} />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Main Dashboard Component
export default function BusinessOverviewDashboardRecharts() {
  const { t } = useTranslation('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currency } = useCurrency();
  const { user } = useSession();
  
  // Get currency symbol and code
  const currencySymbol = currency?.symbol || user?.currency?.symbol || '$';
  const currencyCode = currency?.code || user?.currency?.code || 'USD';
  
  console.log('[Dashboard] Currency:', { currency, currencySymbol, currencyCode });

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/dashboard/overview', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }

        const data = await response.json();
        console.log('[BusinessOverviewDashboard] Data fetched:', data);
        setDashboardData(data);
      } catch (err) {
        console.error('[BusinessOverviewDashboard] Error:', err);
        setError(err.message);
        // Set sample data for demo purposes
        setDashboardData({
          revenue: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            values: [45000, 52000, 48000, 61000, 55000, 67000]
          },
          cashFlow: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            inflow: [50000, 55000, 52000, 65000, 58000, 70000],
            outflow: [42000, 48000, 45000, 52000, 49000, 55000]
          },
          expenses: {
            categories: ['Salaries', 'Rent', 'Utilities', 'Marketing', 'Supplies', 'Other'],
            values: [25000, 8000, 3500, 5000, 4000, 2500]
          },
          metrics: {
            totalRevenue: 328000,
            totalExpenses: 281000,
            netProfit: 47000,
            cashBalance: 125000,
            revenueGrowth: 12.5,
            expenseGrowth: 8.2,
            profitMargin: 14.3,
            cashFlowTrend: 15.8
          }
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded-lg mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-80 bg-gray-200 rounded-lg"></div>
            <div className="h-80 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Currency Display */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-blue-900">Currency Settings</h3>
            <p className="text-sm text-blue-700 mt-1">
              Displaying all amounts in: <span className="font-semibold">{currencyCode} ({currencySymbol})</span>
            </p>
          </div>
          <a href="/Settings" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            Change Currency →
          </a>
        </div>
      </div>
      
      {/* Metrics Grid */}
      <MetricsGrid data={dashboardData?.metrics} currencySymbol={currencySymbol} />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <RevenueChartRecharts data={dashboardData?.revenue} currencySymbol={currencySymbol} />

        {/* Cash Flow Chart */}
        <CashFlowChart data={dashboardData?.cashFlow} currencySymbol={currencySymbol} />

        {/* Expense Breakdown */}
        <ExpenseBreakdown data={dashboardData?.expenses} currencySymbol={currencySymbol} />

        {/* Recent Transactions */}
        <RecentTransactions data={dashboardData?.transactions} currencySymbol={currencySymbol} />
      </div>

      {/* Quick Actions */}
      <QuickActions />
    </div>
  );
}