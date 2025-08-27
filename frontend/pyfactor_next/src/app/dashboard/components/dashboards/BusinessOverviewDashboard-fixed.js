'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  ChartBarIcon, 
  CurrencyDollarIcon, 
  UserGroupIcon,
  ShoppingBagIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  DocumentTextIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/20/solid';
import { useCurrency } from '@/context/CurrencyContext';
import { formatCurrency } from '@/utils/currencyFormatter';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Area
} from 'recharts';

// Colors for charts
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

// Metric card component with currency support
const MetricCard = ({ title, value, change, icon: Icon, color = 'blue', loading = false, prefix = '', suffix = '' }) => {
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
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {prefix}{value}{suffix}
          </p>
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

// Recent activity component
const RecentActivity = ({ activities = [], loading = false }) => {
  const getIcon = (type) => {
    switch(type) {
      case 'invoice': return DocumentTextIcon;
      case 'payment': return CurrencyDollarIcon;
      case 'customer': return UserGroupIcon;
      case 'product': return ShoppingBagIcon;
      default: return ClockIcon;
    }
  };

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
      {activities.length > 0 ? (
        <div className="space-y-4">
          {activities.slice(0, 5).map((activity, index) => {
            const Icon = getIcon(activity.type);
            return (
              <div key={index} className="flex items-start space-x-3">
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
      ) : (
        <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
      )}
    </div>
  );
};

export default function BusinessOverviewDashboard() {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [salesData, setSalesData] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [pieData, setPieData] = useState([]);
  const [timeRange, setTimeRange] = useState('30'); // days
  const [chartWidth, setChartWidth] = useState(600);
  const chartContainerRef = useRef(null);
  
  const { currency } = useCurrency();
  const userCurrency = currency?.code || 'USD';
  const currencySymbol = currency?.symbol || '$';

  // Update chart width on resize
  useEffect(() => {
    const updateChartWidth = () => {
      if (chartContainerRef.current) {
        const width = chartContainerRef.current.offsetWidth - 48;
        setChartWidth(Math.max(width, 400));
      }
    };
    
    updateChartWidth();
    window.addEventListener('resize', updateChartWidth);
    return () => window.removeEventListener('resize', updateChartWidth);
  }, []);

  // Fetch dashboard overview data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch multiple endpoints in parallel
      const [overviewRes, salesRes, customersRes, productsRes] = await Promise.all([
        fetch('/api/dashboard/overview', { credentials: 'include' }),
        fetch(`/api/analytics/sales-data?time_range=1`, { credentials: 'include' }),
        fetch('/api/crm/customers?limit=5', { credentials: 'include' }),
        fetch('/api/products?limit=5', { credentials: 'include' })
      ]);

      // Process overview data
      let metrics = {
        revenue: { value: 0, change: 0 },
        customers: { value: 0, change: 0 },
        invoices: { value: 0, change: 0 },
        products: { value: 0, change: 0 }
      };

      let activities = [];

      // Process sales data
      if (salesRes.ok) {
        const salesData = await salesRes.json();
        setSalesData(salesData);
        
        metrics.revenue = {
          value: salesData.total_sales || 0,
          change: salesData.sales_growth || 0
        };
        
        metrics.invoices = {
          value: salesData.total_transactions || 0,
          change: salesData.transaction_growth || 0
        };

        // Process chart data
        if (salesData.sales_over_time && Array.isArray(salesData.sales_over_time)) {
          const chartData = salesData.sales_over_time.slice(-30).map(item => ({
            date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            revenue: item.amount || 0,
            transactions: item.count || 0
          }));
          setChartData(chartData);
        }

        // Process category data for pie chart
        if (salesData.sales_by_category && Array.isArray(salesData.sales_by_category)) {
          setPieData(salesData.sales_by_category.map(cat => ({
            name: cat.category || 'Other',
            value: cat.amount || 0
          })));
        }

        // Add recent sales to activities
        if (salesData.recent_sales && Array.isArray(salesData.recent_sales)) {
          activities = salesData.recent_sales.slice(0, 5).map(sale => ({
            type: 'invoice',
            description: `Invoice #${sale.invoice_number || sale.id} - ${formatCurrency(sale.amount, userCurrency)}`,
            time: new Date(sale.date).toLocaleString()
          }));
        }
      }

      // Process customers data
      if (customersRes.ok) {
        const customersData = await customersRes.json();
        const customerCount = customersData.count || customersData.length || 0;
        metrics.customers = {
          value: customerCount,
          change: 5.2 // Mock change for now
        };
        
        // Add recent customers to activities
        if (customersData.results && Array.isArray(customersData.results)) {
          customersData.results.slice(0, 2).forEach(customer => {
            activities.push({
              type: 'customer',
              description: `New customer: ${customer.name || customer.email}`,
              time: new Date(customer.created_at).toLocaleString()
            });
          });
        }
      }

      // Process products data
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        const productCount = productsData.count || productsData.length || 0;
        metrics.products = {
          value: productCount,
          change: 3.8 // Mock change for now
        };
      }

      // If overview endpoint works, override with its data
      if (overviewRes.ok) {
        const overviewData = await overviewRes.json();
        if (overviewData.metrics) {
          metrics = { ...metrics, ...overviewData.metrics };
        }
        if (overviewData.activities) {
          activities = [...activities, ...overviewData.activities];
        }
      }

      setDashboardData({
        metrics,
        activities: activities.slice(0, 5) // Limit to 5 most recent
      });

    } catch (error) {
      console.error('[BusinessOverviewDashboard] Error fetching data:', error);
      // Set default data on error
      setDashboardData({
        metrics: {
          revenue: { value: 0, change: 0 },
          customers: { value: 0, change: 0 },
          invoices: { value: 0, change: 0 },
          products: { value: 0, change: 0 }
        },
        activities: []
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-4 text-sm">
              <span style={{ color: entry.color }} className="flex items-center gap-1">
                {entry.name}:
              </span>
              <span className="font-medium">
                {entry.name === 'revenue' ? formatCurrency(entry.value, userCurrency) : entry.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Business Overview</h1>
            <p className="text-gray-600 mt-1">
              Welcome back! Here's what's happening with your business.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(dashboardData?.metrics?.revenue?.value || 0, userCurrency)}
          change={dashboardData?.metrics?.revenue?.change}
          icon={CurrencyDollarIcon}
          color="green"
          loading={loading}
        />
        <MetricCard
          title="Total Customers"
          value={dashboardData?.metrics?.customers?.value || 0}
          change={dashboardData?.metrics?.customers?.change}
          icon={UserGroupIcon}
          color="blue"
          loading={loading}
        />
        <MetricCard
          title="Total Invoices"
          value={dashboardData?.metrics?.invoices?.value || 0}
          change={dashboardData?.metrics?.invoices?.change}
          icon={DocumentTextIcon}
          color="purple"
          loading={loading}
        />
        <MetricCard
          title="Products"
          value={dashboardData?.metrics?.products?.value || 0}
          change={dashboardData?.metrics?.products?.change}
          icon={ShoppingBagIcon}
          color="orange"
          loading={loading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" ref={chartContainerRef}>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
            </div>
          ) : chartData.length > 0 ? (
            <div className="w-full overflow-x-auto">
              <ComposedChart width={chartWidth} height={300} data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date"
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickFormatter={(value) => {
                    if (value >= 1000) {
                      return `${currencySymbol}${(value / 1000).toFixed(0)}k`;
                    }
                    return `${currencySymbol}${value}`;
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="revenue" fill="#3B82F6" name="Revenue" radius={[4, 4, 0, 0]} />
                <Line 
                  type="monotone" 
                  dataKey="transactions" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  name="Transactions"
                  dot={{ fill: '#10B981', r: 3 }}
                  yAxisId="right"
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right"
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
              </ComposedChart>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-center">
                <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">No revenue data available</p>
                <p className="text-xs text-gray-500 mt-1">Start creating invoices to see your revenue trend</p>
              </div>
            </div>
          )}
        </div>

        {/* Sales by Category Pie Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales by Category</h3>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
            </div>
          ) : pieData.length > 0 ? (
            <div className="w-full h-64 flex justify-center">
              <PieChart width={300} height={250}>
                <Pie
                  data={pieData}
                  cx={150}
                  cy={125}
                  labelLine={false}
                  label={(entry) => `${entry.name} (${((entry.value / pieData.reduce((a, b) => a + b.value, 0)) * 100).toFixed(1)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value, userCurrency)} />
              </PieChart>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-center">
                <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">No category data available</p>
                <p className="text-xs text-gray-500 mt-1">Categorize your products to see distribution</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Monthly Performance */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(salesData?.average_order_value || 0, userCurrency)}
                </p>
                <p className="text-sm text-gray-500 mt-1">Avg Order Value</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {salesData?.conversion_rate || 0}%
                </p>
                <p className="text-sm text-gray-500 mt-1">Conversion Rate</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {salesData?.returning_customers || 0}
                </p>
                <p className="text-sm text-gray-500 mt-1">Returning Customers</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">
                  {salesData?.growth_rate || 0}%
                </p>
                <p className="text-sm text-gray-500 mt-1">Growth Rate</p>
              </div>
            </div>
          </div>
        </div>
        <div className="lg:col-span-1">
          <RecentActivity 
            activities={dashboardData?.activities || []} 
            loading={loading} 
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('menuNavigation', { detail: { item: 'create-invoice' } }))}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center transition-colors"
          >
            <CurrencyDollarIcon className="h-8 w-8 mx-auto text-gray-600 mb-2" />
            <span className="text-sm font-medium text-gray-900">Create Invoice</span>
          </button>
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('menuNavigation', { detail: { item: 'customer-list' } }))}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center transition-colors"
          >
            <UserGroupIcon className="h-8 w-8 mx-auto text-gray-600 mb-2" />
            <span className="text-sm font-medium text-gray-900">Add Customer</span>
          </button>
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('menuNavigation', { detail: { item: 'product-management' } }))}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center transition-colors"
          >
            <ShoppingBagIcon className="h-8 w-8 mx-auto text-gray-600 mb-2" />
            <span className="text-sm font-medium text-gray-900">Add Product</span>
          </button>
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('menuNavigation', { detail: { item: 'reports-dashboard' } }))}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center transition-colors"
          >
            <ChartBarIcon className="h-8 w-8 mx-auto text-gray-600 mb-2" />
            <span className="text-sm font-medium text-gray-900">View Reports</span>
          </button>
        </div>
      </div>
    </div>
  );
}