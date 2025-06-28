'use client';

import React, { useState, useEffect, Fragment, useCallback, useMemo } from 'react';
import { Dialog, Transition, Menu } from '@headlessui/react';
import { toast } from 'react-hot-toast';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, ComposedChart, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import {
  ChartBarIcon,
  ChartPieIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ArrowPathIcon,
  CalendarIcon,
  EyeIcon,
  DocumentArrowDownIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  Cog6ToothIcon,
  ChevronDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ShoppingBagIcon,
  BanknotesIcon,
  XMarkIcon,
  PlusIcon,
  ArrowTopRightOnSquareIcon,
  InformationCircleIcon,
  Square3Stack3DIcon
} from '@heroicons/react/24/outline';

// Tooltip component for field help
const FieldTooltip = ({ text, position = 'top' }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  return (
    <div className="relative inline-flex items-center ml-1">
      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        className="cursor-help"
      >
        <InformationCircleIcon className="w-4 h-4 text-gray-400 hover:text-gray-600" />
      </div>
      
      {showTooltip && (
        <div className={`absolute z-50 ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 w-72`}>
          <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-lg">
            <div className="relative">
              {text}
              <div className={`absolute ${position === 'top' ? 'top-full' : 'bottom-full'} left-4`}>
                <div className={`${position === 'top' ? '' : 'rotate-180'}`}>
                  <svg className="w-2 h-2 text-gray-900" fill="currentColor" viewBox="0 0 8 4">
                    <path d="M0 0l4 4 4-4z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AnalyticsDashboard = ({ userData }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedTimeframe, setSelectedTimeframe] = useState('30days');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedWidget, setSelectedWidget] = useState(null);
  const [exportType, setExportType] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [metrics, setMetrics] = useState({
    revenue: { current: 0, previous: 0, growth: 0, trend: 'up' },
    expenses: { current: 0, previous: 0, growth: 0, trend: 'down' },
    profit: { current: 0, previous: 0, growth: 0, trend: 'up' },
    customers: { current: 0, new: 0, growth: 0, trend: 'up' },
    orders: { current: 0, pending: 0, completed: 0, trend: 'up' },
    inventory: { total: 0, lowStock: 0, outOfStock: 0, trend: 'stable' },
    cashFlow: { inflow: 0, outflow: 0, net: 0, trend: 'up' },
    conversion: { rate: 0, visitors: 0, leads: 0, trend: 'up' }
  });
  const [chartData, setChartData] = useState({
    revenue: [],
    expenses: [],
    profitTrend: [],
    customerGrowth: [],
    topProducts: [],
    topCustomers: [],
    cashFlow: [],
    salesFunnel: [],
    inventory: [],
    performance: []
  });
  const [selectedMetric, setSelectedMetric] = useState('revenue');
  const [alerts, setAlerts] = useState([]);
  const [kpis, setKpis] = useState({
    avgOrderValue: 0,
    customerLifetimeValue: 0,
    churnRate: 0,
    growthRate: 0
  });

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange, selectedTimeframe]);
  
  // Initialize with mock data
  useEffect(() => {
    setAlerts(generateMockAlerts());
    setKpis(generateMockKPIs());
  }, []);

  const fetchAnalyticsData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, isRefresh ? 500 : 1000));
      
      // Use mock data for demonstration - replace with real API calls
      setMetrics(generateMockMetrics());
      setChartData(generateMockChartData());
      setKpis(generateMockKPIs());
      setAlerts(generateMockAlerts());
      setLastUpdated(new Date());
      
      if (isRefresh) {
        toast.success('Dashboard data refreshed successfully');
      }
      
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast.error('Failed to fetch analytics data');
      // Fallback to mock data
      setMetrics(generateMockMetrics());
      setChartData(generateMockChartData());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Timeframe presets
  const timeframeOptions = [
    { value: '7days', label: 'Last 7 Days', days: 7 },
    { value: '30days', label: 'Last 30 Days', days: 30 },
    { value: '90days', label: 'Last 3 Months', days: 90 },
    { value: '1year', label: 'Last Year', days: 365 },
    { value: 'custom', label: 'Custom Range', days: null }
  ];
  
  const handleTimeframeChange = (value) => {
    setSelectedTimeframe(value);
    const option = timeframeOptions.find(opt => opt.value === value);
    if (option && option.days) {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (option.days * 24 * 60 * 60 * 1000));
      setDateRange({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      });
    }
  };
  
  const handleExport = (type) => {
    setExportType(type);
    toast.success(`Exporting dashboard data as ${type.toUpperCase()}...`);
    // Implement export functionality here
  };
  
  const handleWidgetClick = (widgetType) => {
    setSelectedWidget(widgetType);
  };

  // Auto-refresh functionality
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  
  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchAnalyticsData(true);
      }, 60000); // Refresh every minute
    }
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const generateMockMetrics = () => {
    return {
      revenue: { current: 125000, previous: 110000, growth: 13.6, trend: 'up' },
      expenses: { current: 85000, previous: 82000, growth: 3.7, trend: 'up' },
      profit: { current: 40000, previous: 28000, growth: 42.9, trend: 'up' },
      customers: { current: 250, new: 35, growth: 16.3, trend: 'up' },
      orders: { current: 180, pending: 25, completed: 155, trend: 'up' },
      inventory: { total: 1250, lowStock: 45, outOfStock: 8, trend: 'stable' },
      cashFlow: { inflow: 135000, outflow: 95000, net: 40000, trend: 'up' },
      conversion: { rate: 3.2, visitors: 5420, leads: 173, trend: 'up' }
    };
  };
  
  const generateMockAlerts = () => {
    return [
      {
        id: 1,
        type: 'warning',
        title: 'Low Inventory Alert',
        message: '8 products are out of stock, 45 products have low inventory',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        priority: 'high'
      },
      {
        id: 2,
        type: 'success',
        title: 'Revenue Target Achieved',
        message: 'Monthly revenue target exceeded by 13.6%',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
        priority: 'medium'
      },
      {
        id: 3,
        type: 'info',
        title: 'New Customer Milestone',
        message: '250 total customers reached - 16.3% growth this month',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
        priority: 'low'
      }
    ];
  };
  
  const generateMockKPIs = () => {
    return {
      avgOrderValue: 285.50,
      customerLifetimeValue: 1250.00,
      churnRate: 2.8,
      growthRate: 18.5
    };
  };

  const generateMockChartData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    return {
      revenue: months.map((month, index) => ({
        month,
        revenue: 20000 + Math.random() * 10000,
        target: 22000,
        lastYear: 18000 + Math.random() * 8000,
        forecast: 24000 + Math.random() * 5000
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
        margin: 15 + Math.random() * 10,
        target: 6000
      })),
      customerGrowth: months.map((month, index) => ({
        month,
        total: 200 + index * 10 + Math.floor(Math.random() * 20),
        new: 20 + Math.floor(Math.random() * 15),
        churn: Math.floor(Math.random() * 5),
        retention: 85 + Math.random() * 10
      })),
      topProducts: [
        { name: 'Premium Service Package', revenue: 35000, units: 120, percentage: 28, growth: 15.2 },
        { name: 'Professional Tools', revenue: 30000, units: 95, percentage: 24, growth: 8.7 },
        { name: 'Consulting Services', revenue: 25000, units: 50, percentage: 20, growth: 22.1 },
        { name: 'Basic Package', revenue: 20000, units: 180, percentage: 16, growth: -2.3 },
        { name: 'Training Program', revenue: 15000, units: 30, percentage: 12, growth: 45.8 }
      ],
      topCustomers: [
        { name: 'Acme Corp', revenue: 45000, orders: 25, percentage: 18, satisfaction: 9.2 },
        { name: 'Globex Inc', revenue: 38000, orders: 20, percentage: 15.2, satisfaction: 8.8 },
        { name: 'Wayne Enterprises', revenue: 32000, orders: 18, percentage: 12.8, satisfaction: 9.5 },
        { name: 'Stark Industries', revenue: 28000, orders: 15, percentage: 11.2, satisfaction: 8.9 },
        { name: 'Umbrella Corp', revenue: 22000, orders: 12, percentage: 8.8, satisfaction: 8.3 }
      ],
      cashFlow: months.map((month, index) => ({
        month,
        inflow: 20000 + Math.random() * 10000,
        outflow: -(15000 + Math.random() * 5000),
        net: 5000 + Math.random() * 5000,
        forecast: 6000 + Math.random() * 3000
      })),
      salesFunnel: [
        { stage: 'Leads', count: 1000, value: 0, conversion: 100 },
        { stage: 'Qualified', count: 400, value: 0, conversion: 40 },
        { stage: 'Proposal', count: 150, value: 450000, conversion: 15 },
        { stage: 'Negotiation', count: 80, value: 320000, conversion: 8 },
        { stage: 'Closed Won', count: 32, value: 180000, conversion: 3.2 }
      ],
      inventory: [
        { category: 'Electronics', inStock: 450, lowStock: 12, outOfStock: 2, value: 125000 },
        { category: 'Accessories', inStock: 280, lowStock: 8, outOfStock: 1, value: 45000 },
        { category: 'Software', inStock: 150, lowStock: 5, outOfStock: 0, value: 75000 },
        { category: 'Services', inStock: 999, lowStock: 0, outOfStock: 0, value: 0 }
      ],
      performance: [
        { metric: 'Customer Satisfaction', score: 8.9, target: 9.0, max: 10 },
        { metric: 'Product Quality', score: 9.2, target: 8.5, max: 10 },
        { metric: 'Delivery Speed', score: 7.8, target: 8.0, max: 10 },
        { metric: 'Support Response', score: 8.5, target: 8.0, max: 10 },
        { metric: 'Value for Money', score: 8.1, target: 8.5, max: 10 },
        { metric: 'Innovation', score: 7.9, target: 8.0, max: 10 }
      ]
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
  
  const formatNumber = (value) => {
    return new Intl.NumberFormat('en-US').format(value);
  };
  
  const getTimeAgo = (date) => {
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffHours > 24) {
      return `${Math.floor(diffHours / 24)} days ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hours ago`;
    } else {
      return `${diffMins} minutes ago`;
    }
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];
  
  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up':
        return <TrendingUpIcon className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDownIcon className="w-4 h-4 text-red-500" />;
      default:
        return <div className="w-4 h-4 bg-gray-400 rounded-full" />;
    }
  };
  
  const getAlertIcon = (type) => {
    switch (type) {
      case 'warning':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
      case 'success':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'info':
        return <InformationCircleIcon className="w-5 h-5 text-blue-500" />;
      default:
        return <InformationCircleIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Analytics Dashboard</h2>
          <p className="text-gray-600">Preparing your business insights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-black flex items-center">
                <ChartBarIcon className="w-8 h-8 text-blue-600 mr-3" />
                Analytics Dashboard
                <FieldTooltip text="Comprehensive view of your business performance metrics, trends, and key insights to drive data-driven decisions." />
              </h1>
              <p className="text-gray-500 mt-1">Real-time business intelligence and performance tracking</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-xs text-gray-500">Last updated</p>
                <p className="text-sm font-medium text-gray-900">{lastUpdated.toLocaleTimeString()}</p>
              </div>
              <Menu as="div" className="relative">
                <Menu.Button className="flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                  <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                  Export
                  <ChevronDownIcon className="w-4 h-4 ml-1" />
                </Menu.Button>
                <Menu.Items className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-10">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => handleExport('pdf')}
                        className={`${active ? 'bg-gray-50' : ''} block px-4 py-2 text-sm text-gray-700 w-full text-left`}
                      >
                        Export as PDF
                      </button>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => handleExport('excel')}
                        className={`${active ? 'bg-gray-50' : ''} block px-4 py-2 text-sm text-gray-700 w-full text-left`}
                      >
                        Export as Excel
                      </button>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => handleExport('csv')}
                        className={`${active ? 'bg-gray-50' : ''} block px-4 py-2 text-sm text-gray-700 w-full text-left`}
                      >
                        Export as CSV
                      </button>
                    )}
                  </Menu.Item>
                </Menu.Items>
              </Menu>
              <button
                onClick={() => fetchAnalyticsData(true)}
                disabled={refreshing}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <ArrowPathIcon className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
          
          {/* Tabs and Controls */}
          <div className="flex items-center justify-between border-t border-gray-200 pt-4 pb-4">
            <div className="flex space-x-8">
              {[
                { id: 'overview', label: 'Overview', icon: Square3Stack3DIcon },
                { id: 'revenue', label: 'Revenue', icon: CurrencyDollarIcon },
                { id: 'customers', label: 'Customers', icon: UserGroupIcon },
                { id: 'products', label: 'Products', icon: ShoppingBagIcon },
                { id: 'finance', label: 'Finance', icon: BanknotesIcon }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <tab.icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              ))}
            </div>
            
            <div className="flex items-center space-x-4">
              <Menu as="div" className="relative">
                <Menu.Button className="flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {timeframeOptions.find(opt => opt.value === selectedTimeframe)?.label}
                  <ChevronDownIcon className="w-4 h-4 ml-1" />
                </Menu.Button>
                <Menu.Items className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-10">
                  {timeframeOptions.map((option) => (
                    <Menu.Item key={option.value}>
                      {({ active }) => (
                        <button
                          onClick={() => handleTimeframeChange(option.value)}
                          className={`${active ? 'bg-gray-50' : ''} block px-4 py-2 text-sm text-gray-700 w-full text-left`}
                        >
                          {option.label}
                        </button>
                      )}
                    </Menu.Item>
                  ))}
                </Menu.Items>
              </Menu>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                  showFilters
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 bg-white border border-gray-300'
                }`}
              >
                <FunnelIcon className="w-4 h-4 mr-2" />
                Filters
              </button>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="autoRefresh"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="autoRefresh" className="ml-2 text-sm text-gray-700">
                  Auto-refresh
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-blue-50 border-b border-blue-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                  <FieldTooltip text="Select the beginning date for your analytics data range. Data will include all transactions from this date forward." />
                </label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                  <FieldTooltip text="Select the end date for your analytics data range. Data will include all transactions up to this date." />
                </label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => fetchAnalyticsData()}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Alerts Section */}
        {alerts.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500 mr-2" />
                Business Alerts
              </h3>
              <span className="text-sm text-gray-500">{alerts.length} active alerts</span>
            </div>
            <div className="space-y-2">
              {alerts.slice(0, 3).map((alert) => (
                <div key={alert.id} className="flex items-start p-3 bg-gray-50 rounded-md">
                  {getAlertIcon(alert.type)}
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                    <p className="text-sm text-gray-600">{alert.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{getTimeAgo(alert.timestamp)}</p>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600">
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Revenue Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleWidgetClick('revenue')}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <CurrencyDollarIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-3">
                  <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Total Revenue</p>
                  <FieldTooltip text="Total revenue generated from all sales and services during the selected period." />
                </div>
              </div>
              {getTrendIcon(metrics.revenue.trend)}
            </div>
            <div className="flex items-baseline justify-between">
              <p className="text-3xl font-bold text-blue-600 truncate">{formatCurrency(metrics.revenue.current)}</p>
              <span className={`text-sm font-medium ${metrics.revenue.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercentage(metrics.revenue.growth)}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2">vs {formatCurrency(metrics.revenue.previous)} last period</p>
          </div>

          {/* Customers Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleWidgetClick('customers')}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="bg-green-100 p-2 rounded-lg">
                  <UserGroupIcon className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-3">
                  <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Total Customers</p>
                  <FieldTooltip text="Total number of active customers and new customer acquisition rate." />
                </div>
              </div>
              {getTrendIcon(metrics.customers.trend)}
            </div>
            <div className="flex items-baseline justify-between">
              <p className="text-3xl font-bold text-green-600 truncate">{formatNumber(metrics.customers.current)}</p>
              <span className={`text-sm font-medium ${metrics.customers.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercentage(metrics.customers.growth)}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2">{metrics.customers.new} new customers this period</p>
          </div>

          {/* Orders Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleWidgetClick('orders')}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="bg-yellow-100 p-2 rounded-lg">
                  <ShoppingBagIcon className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-3">
                  <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Total Orders</p>
                  <FieldTooltip text="Total number of orders processed, including pending and completed orders." />
                </div>
              </div>
              {getTrendIcon(metrics.orders.trend)}
            </div>
            <div className="flex items-baseline justify-between">
              <p className="text-3xl font-bold text-yellow-600 truncate">{formatNumber(metrics.orders.current)}</p>
              <div className="text-right">
                <p className="text-xs text-yellow-600">{metrics.orders.pending} pending</p>
                <p className="text-xs text-green-600">{metrics.orders.completed} completed</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Order completion rate: {((metrics.orders.completed / metrics.orders.current) * 100).toFixed(1)}%</p>
          </div>

          {/* Net Profit Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleWidgetClick('profit')}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <BanknotesIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-3">
                  <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Net Profit</p>
                  <FieldTooltip text="Net profit after all expenses, taxes, and cost of goods sold." />
                </div>
              </div>
              {getTrendIcon(metrics.profit.trend)}
            </div>
            <div className="flex items-baseline justify-between">
              <p className={`text-3xl font-bold truncate ${metrics.profit.current >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(metrics.profit.current)}
              </p>
              <span className={`text-sm font-medium ${metrics.profit.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercentage(metrics.profit.growth)}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2">Profit margin: {((metrics.profit.current / metrics.revenue.current) * 100).toFixed(1)}%</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg Order Value</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(kpis.avgOrderValue)}</p>
              </div>
              <div className="bg-blue-100 p-2 rounded-lg">
                <CurrencyDollarIcon className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Customer LTV</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(kpis.customerLifetimeValue)}</p>
              </div>
              <div className="bg-green-100 p-2 rounded-lg">
                <UserGroupIcon className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Churn Rate</p>
                <p className="text-2xl font-bold text-gray-900">{kpis.churnRate}%</p>
              </div>
              <div className="bg-red-100 p-2 rounded-lg">
                <TrendingDownIcon className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Growth Rate</p>
                <p className="text-2xl font-bold text-gray-900">+{kpis.growthRate}%</p>
              </div>
              <div className="bg-green-100 p-2 rounded-lg">
                <TrendingUpIcon className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Revenue Trend Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <h3 className="text-lg font-semibold text-gray-900">Revenue Performance</h3>
                <FieldTooltip text="Monthly revenue trends comparing current performance vs targets and previous year data." />
              </div>
              <div className="flex items-center space-x-2">
                <button className="p-2 text-gray-400 hover:text-gray-600">
                  <EyeIcon className="w-4 h-4" />
                </button>
                <Menu as="div" className="relative">
                  <Menu.Button className="p-2 text-gray-400 hover:text-gray-600">
                    <Cog6ToothIcon className="w-4 h-4" />
                  </Menu.Button>
                  <Menu.Items className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-10">
                    <Menu.Item>
                      {({ active }) => (
                        <button className={`${active ? 'bg-gray-50' : ''} block px-4 py-2 text-sm text-gray-700 w-full text-left`}>
                          View Details
                        </button>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <button className={`${active ? 'bg-gray-50' : ''} block px-4 py-2 text-sm text-gray-700 w-full text-left`}>
                          Export Chart
                        </button>
                      )}
                    </Menu.Item>
                  </Menu.Items>
                </Menu>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={chartData.revenue} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value, name) => [formatCurrency(value), name]}
                  labelStyle={{ color: '#374151' }}
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="line"
                />
                <Bar dataKey="revenue" fill="#3B82F6" name="Current Revenue" radius={[2, 2, 0, 0]} />
                <Line 
                  type="monotone" 
                  dataKey="target" 
                  stroke="#EF4444" 
                  strokeWidth={3}
                  dot={{ fill: '#EF4444', strokeWidth: 2, r: 4 }}
                  name="Target" 
                />
                <Line 
                  type="monotone" 
                  dataKey="lastYear" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  strokeDasharray="8 4"
                  dot={{ fill: '#10B981', strokeWidth: 2, r: 3 }}
                  name="Previous Year" 
                />
                <Line 
                  type="monotone" 
                  dataKey="forecast" 
                  stroke="#8B5CF6" 
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 3 }}
                  name="Forecast" 
                />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
              <div className="text-center">
                <p className="text-sm text-gray-500">Avg Monthly</p>
                <p className="text-lg font-semibold text-blue-600">{formatCurrency(chartData.revenue.reduce((sum, item) => sum + item.revenue, 0) / chartData.revenue.length)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">Best Month</p>
                <p className="text-lg font-semibold text-green-600">{formatCurrency(Math.max(...chartData.revenue.map(item => item.revenue)))}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">Growth Rate</p>
                <p className="text-lg font-semibold text-purple-600">+{metrics.revenue.growth.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          {/* Expense Analysis */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <h3 className="text-lg font-semibold text-gray-900">Expense Analysis</h3>
                <FieldTooltip text="Monthly expense breakdown by category showing cost distribution and trends." />
              </div>
              <div className="flex items-center space-x-2">
                <select className="text-sm border border-gray-300 rounded-md px-2 py-1">
                  <option value="stacked">Stacked View</option>
                  <option value="grouped">Grouped View</option>
                  <option value="percentage">Percentage View</option>
                </select>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData.expenses} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value, name) => [formatCurrency(value), name]}
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend />
                <Bar dataKey="operating" stackId="a" fill="#3B82F6" name="Operating" radius={[0, 0, 0, 0]} />
                <Bar dataKey="marketing" stackId="a" fill="#10B981" name="Marketing" radius={[0, 0, 0, 0]} />
                <Bar dataKey="payroll" stackId="a" fill="#F59E0B" name="Payroll" radius={[0, 0, 0, 0]} />
                <Bar dataKey="other" stackId="a" fill="#8B5CF6" name="Other" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-4 gap-3 pt-4 border-t border-gray-100">
              {[
                { label: 'Operating', color: 'blue', value: chartData.expenses.reduce((sum, item) => sum + item.operating, 0) / chartData.expenses.length },
                { label: 'Marketing', color: 'green', value: chartData.expenses.reduce((sum, item) => sum + item.marketing, 0) / chartData.expenses.length },
                { label: 'Payroll', color: 'yellow', value: chartData.expenses.reduce((sum, item) => sum + item.payroll, 0) / chartData.expenses.length },
                { label: 'Other', color: 'purple', value: chartData.expenses.reduce((sum, item) => sum + item.other, 0) / chartData.expenses.length }
              ].map((expense, index) => (
                <div key={index} className="text-center">
                  <div className={`w-3 h-3 rounded-full mx-auto mb-1 bg-${expense.color}-500`}></div>
                  <p className="text-xs text-gray-500">{expense.label}</p>
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(expense.value)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Sales Funnel Analysis */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <h3 className="text-lg font-semibold text-gray-900">Sales Funnel Performance</h3>
                <FieldTooltip text="Customer journey from leads to closed sales showing conversion rates at each stage." />
              </div>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData.salesFunnel} layout="horizontal" margin={{ top: 20, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                />
                <YAxis 
                  type="category"
                  dataKey="stage"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                  width={80}
                />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'Value') {
                      return [formatCurrency(value), 'Pipeline Value'];
                    }
                    return [formatNumber(value), 'Count'];
                  }}
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar dataKey="count" fill="#3B82F6" name="Count" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-5 gap-2 pt-4 border-t border-gray-100">
              {chartData.salesFunnel.map((stage, index) => (
                <div key={index} className="text-center">
                  <p className="text-xs text-gray-500 mb-1">{stage.stage}</p>
                  <p className="text-sm font-semibold text-gray-900">{stage.conversion}%</p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${stage.conversion}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Radar Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <h3 className="text-lg font-semibold text-gray-900">Business Performance Score</h3>
                <FieldTooltip text="Overall business performance across key metrics compared to industry targets." />
              </div>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <RadarChart data={chartData.performance} margin={{ top: 20, right: 80, bottom: 20, left: 80 }}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis 
                  dataKey="metric" 
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  className="text-xs"
                />
                <PolarRadiusAxis 
                  angle={45} 
                  domain={[0, 10]} 
                  tick={{ fontSize: 10, fill: '#9CA3AF' }}
                  tickCount={6}
                />
                <Radar
                  name="Current"
                  dataKey="score"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
                <Radar
                  name="Target"
                  dataKey="target"
                  stroke="#10B981"
                  fill="transparent"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="line"
                />
                <Tooltip 
                  formatter={(value, name) => [`${value}/10`, name]}
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
              <div className="text-center">
                <p className="text-sm text-gray-500">Overall Score</p>
                <p className="text-2xl font-bold text-blue-600">
                  {(chartData.performance.reduce((sum, item) => sum + item.score, 0) / chartData.performance.length).toFixed(1)}/10
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">Above Target</p>
                <p className="text-2xl font-bold text-green-600">
                  {chartData.performance.filter(item => item.score >= item.target).length}/{chartData.performance.length}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">Improvement Areas</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {chartData.performance.filter(item => item.score < item.target).length}
                </p>
              </div>
            </div>
          </div>
      </div>

        </div>

        {/* Additional Analytics Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Top Products/Services */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Top Products</h3>
              <button className="text-sm text-blue-600 hover:text-blue-800">
                View All
              </button>
            </div>
            <div className="space-y-4">
              {chartData.topProducts.slice(0, 4).map((product, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-900 text-sm">{product.name}</span>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-gray-900">{formatCurrency(product.revenue)}</span>
                        <div className={`text-xs ${
                          product.growth >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {product.growth >= 0 ? '+' : ''}{product.growth.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${product.percentage}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between mt-1">
                      <p className="text-xs text-gray-500">{product.units} units</p>
                      <p className="text-xs text-gray-500">{product.percentage}% of total</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Customers */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Top Customers</h3>
              <button className="text-sm text-blue-600 hover:text-blue-800">
                View All
              </button>
            </div>
            <div className="space-y-4">
              {chartData.topCustomers.slice(0, 4).map((customer, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-900 text-sm">{customer.name}</span>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-gray-900">{formatCurrency(customer.revenue)}</span>
                        <div className="text-xs text-yellow-600">
                          ★ {customer.satisfaction}/10
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${customer.percentage}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between mt-1">
                      <p className="text-xs text-gray-500">{customer.orders} orders</p>
                      <p className="text-xs text-gray-500">{customer.percentage}% of revenue</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Inventory Status */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Inventory Status</h3>
              <FieldTooltip text="Current inventory levels and stock alerts by category." />
            </div>
            <div className="space-y-4">
              {chartData.inventory.map((category, index) => (
                <div key={index} className="">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-900 text-sm">{category.category}</span>
                    <span className="text-sm text-gray-600">{formatCurrency(category.value)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center p-2 bg-green-50 rounded">
                      <p className="font-semibold text-green-800">{category.inStock}</p>
                      <p className="text-green-600">In Stock</p>
                    </div>
                    <div className="text-center p-2 bg-yellow-50 rounded">
                      <p className="font-semibold text-yellow-800">{category.lowStock}</p>
                      <p className="text-yellow-600">Low Stock</p>
                    </div>
                    <div className="text-center p-2 bg-red-50 rounded">
                      <p className="font-semibold text-red-800">{category.outOfStock}</p>
                      <p className="text-red-600">Out of Stock</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cash Flow Analysis */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <h3 className="text-lg font-semibold text-gray-900">Cash Flow Analysis</h3>
              <FieldTooltip text="Monthly cash inflows, outflows, and net cash position with forecasting." />
            </div>
            <div className="flex items-center space-x-2">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                metrics.cashFlow.net >= 0 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                Net: {formatCurrency(metrics.cashFlow.net)}
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={chartData.cashFlow} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="month" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6B7280' }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6B7280' }}
                tickFormatter={(value) => `$${(Math.abs(value) / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                formatter={(value, name) => {
                  if (name === 'Cash Outflow') {
                    return [formatCurrency(Math.abs(value)), name];
                  }
                  return [formatCurrency(value), name];
                }}
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '8px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              <Bar dataKey="inflow" fill="#10B981" name="Cash Inflow" radius={[2, 2, 0, 0]} />
              <Bar dataKey="outflow" fill="#EF4444" name="Cash Outflow" radius={[2, 2, 0, 0]} />
              <Line 
                type="monotone" 
                dataKey="net" 
                stroke="#3B82F6" 
                strokeWidth={3}
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                name="Net Cash Flow" 
              />
              <Line 
                type="monotone" 
                dataKey="forecast" 
                stroke="#8B5CF6" 
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 3 }}
                name="Forecast" 
              />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-4 gap-4 pt-4 border-t border-gray-100">
            <div className="text-center">
              <p className="text-sm text-gray-500">Avg Inflow</p>
              <p className="text-lg font-semibold text-green-600">
                {formatCurrency(chartData.cashFlow.reduce((sum, item) => sum + item.inflow, 0) / chartData.cashFlow.length)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Avg Outflow</p>
              <p className="text-lg font-semibold text-red-600">
                {formatCurrency(Math.abs(chartData.cashFlow.reduce((sum, item) => sum + item.outflow, 0) / chartData.cashFlow.length))}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Best Month</p>
              <p className="text-lg font-semibold text-blue-600">
                {formatCurrency(Math.max(...chartData.cashFlow.map(item => item.net)))}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Cash Runway</p>
              <p className="text-lg font-semibold text-purple-600">
                {metrics.cashFlow.net > 0 ? '12+ months' : '3 months'}
              </p>
            </div>
          </div>
        </div>

        {/* Widget Details Modal */}
        <Transition appear show={selectedWidget !== null} as={Fragment}>
          <Dialog as="div" className="relative z-50" onClose={() => setSelectedWidget(null)}>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black bg-opacity-25" />
            </Transition.Child>

            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4 text-center">
                <Transition.Child
                  as={Fragment}
                  enter="ease-out duration-300"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="ease-in duration-200"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
                >
                  <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 flex items-center justify-between">
                      <span>Detailed {selectedWidget} Analytics</span>
                      <button
                        onClick={() => setSelectedWidget(null)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <XMarkIcon className="w-6 h-6" />
                      </button>
                    </Dialog.Title>
                    <div className="mt-4">
                      <p className="text-sm text-gray-500">
                        Detailed analytics for {selectedWidget} would be displayed here with drill-down capabilities,
                        historical comparisons, and actionable insights.
                      </p>
                    </div>
                    <div className="mt-6 flex justify-end">
                      <button
                        type="button"
                        className="inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                        onClick={() => setSelectedWidget(null)}
                      >
                        Close
                      </button>
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;