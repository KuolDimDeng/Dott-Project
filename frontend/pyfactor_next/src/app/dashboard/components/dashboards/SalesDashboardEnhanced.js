'use client';

import React, { useState, useEffect } from 'react';
import { 
  CurrencyDollarIcon, 
  ShoppingCartIcon, 
  UserGroupIcon,
  ArrowTrendingUpIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChartBarIcon,
  CalendarIcon,
  CalculatorIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { useCurrency } from '@/context/CurrencyContext';
import { formatCurrency } from '@/utils/currencyFormatter';
import StandardSpinner from '@/components/ui/StandardSpinner';
import { toast } from 'react-hot-toast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import TestChart from '@/components/charts/TestChart';

const SalesDashboardEnhanced = () => {
  console.log('[SalesDashboardEnhanced] Component rendering');
  
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState(null);
  const [taxData, setTaxData] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [posTransactions, setPosTransactions] = useState([]);
  const [timeRange, setTimeRange] = useState(30); // Days
  const [chartView, setChartView] = useState('day'); // day, week, month, year
  const [fetchError, setFetchError] = useState(null);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalTransactions: 0,
    averageOrderValue: 0,
    topProducts: [],
    recentSales: []
  });
  
  // Debug: Check if recharts is loaded
  console.log('[SalesDashboardEnhanced] BarChart available:', typeof BarChart);
  console.log('[SalesDashboardEnhanced] ResponsiveContainer available:', typeof ResponsiveContainer);
  
  const { currency } = useCurrency();
  const userCurrency = currency?.code || 'USD';
  const currencySymbol = currency?.symbol || '$';

  // Fetch sales analysis data
  const fetchSalesData = async () => {
    try {
      setFetchError(null);
      
      const response = await fetch(`/api/analytics/sales-data?time_range=${Math.ceil(timeRange/30)}`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        const data = await response.json();
        setSalesData(data);
        
        // Calculate stats
        setStats({
          totalSales: data.total_sales || 0,
          totalTransactions: data.total_transactions || 0,
          averageOrderValue: data.average_order_value || 0,
          topProducts: Array.isArray(data.top_products) ? data.top_products : [],
          recentSales: Array.isArray(data.recent_sales) ? data.recent_sales : []
        });
        
        // Process data for charts - API returns sales_over_time not daily_sales
        if (data.sales_over_time && data.sales_over_time.length > 0) {
          console.log('[SalesDashboard] Processing chart data:', data.sales_over_time.length, 'items');
          processChartData(data.sales_over_time, chartView);
        } else if (data.salesOverTime && data.salesOverTime.length > 0) {
          // Fallback to camelCase version if present
          console.log('[SalesDashboard] Processing chart data (camelCase):', data.salesOverTime.length, 'items');
          processChartData(data.salesOverTime, chartView);
        } else {
          console.log('[SalesDashboard] No sales_over_time data available');
          setChartData([]);
        }
      }
    } catch (error) {
      console.error('[SalesDashboard] Error fetching sales data:', error);
      setFetchError('Failed to load sales data');
    }
  };

  // Fetch tax data
  const fetchTaxData = async () => {
    try {
      const response = await fetch('/api/taxes/summary', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTaxData(data);
      }
    } catch (error) {
      console.error('[SalesDashboard] Error fetching tax data:', error);
    }
  };

  // Process data for chart based on view type
  const processChartData = (rawData, view) => {
    if (!Array.isArray(rawData)) {
      setChartData([]);
      return;
    }

    let processedData = [];
    
    switch(view) {
      case 'day':
        // Show daily data for last N days
        processedData = rawData.slice(-timeRange).map(item => ({
          date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          sales: item.amount || 0,
          transactions: item.count || 0,
          tax: item.tax || 0
        }));
        break;
        
      case 'week':
        // Group by week
        const weeks = {};
        rawData.forEach(item => {
          const date = new Date(item.date);
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          const weekKey = weekStart.toISOString().split('T')[0];
          
          if (!weeks[weekKey]) {
            weeks[weekKey] = { sales: 0, transactions: 0, tax: 0 };
          }
          weeks[weekKey].sales += item.amount || 0;
          weeks[weekKey].transactions += item.count || 0;
          weeks[weekKey].tax += item.tax || 0;
        });
        
        processedData = Object.keys(weeks).slice(-12).map(weekKey => ({
          date: new Date(weekKey).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          sales: weeks[weekKey].sales,
          transactions: weeks[weekKey].transactions,
          tax: weeks[weekKey].tax
        }));
        break;
        
      case 'month':
        // Group by month
        const months = {};
        rawData.forEach(item => {
          const date = new Date(item.date);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          
          if (!months[monthKey]) {
            months[monthKey] = { sales: 0, transactions: 0, tax: 0 };
          }
          months[monthKey].sales += item.amount || 0;
          months[monthKey].transactions += item.count || 0;
          months[monthKey].tax += item.tax || 0;
        });
        
        processedData = Object.keys(months).slice(-12).map(monthKey => ({
          date: new Date(monthKey + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          sales: months[monthKey].sales,
          transactions: months[monthKey].transactions,
          tax: months[monthKey].tax
        }));
        break;
        
      case 'year':
        // Group by year
        const years = {};
        rawData.forEach(item => {
          const year = new Date(item.date).getFullYear();
          
          if (!years[year]) {
            years[year] = { sales: 0, transactions: 0, tax: 0 };
          }
          years[year].sales += item.amount || 0;
          years[year].transactions += item.count || 0;
          years[year].tax += item.tax || 0;
        });
        
        processedData = Object.keys(years).map(year => ({
          date: year,
          sales: years[year].sales,
          transactions: years[year].transactions,
          tax: years[year].tax
        }));
        break;
    }
    
    setChartData(processedData);
  };

  // Fetch POS transactions
  const fetchPOSTransactions = async () => {
    try {
      const response = await fetch(`/api/pos/transactions?days=${timeRange}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setPosTransactions(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('[SalesDashboard] Error fetching POS transactions:', error);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchSalesData(), fetchPOSTransactions(), fetchTaxData()])
      .finally(() => setLoading(false));
  }, [timeRange]);

  useEffect(() => {
    if (salesData?.sales_over_time && salesData.sales_over_time.length > 0) {
      processChartData(salesData.sales_over_time, chartView);
    } else if (salesData?.salesOverTime && salesData.salesOverTime.length > 0) {
      processChartData(salesData.salesOverTime, chartView);
    }
  }, [chartView, salesData]);

  // Calculate growth rate
  const growthRate = salesData?.growth_rate || 0;
  
  // Tax calculations
  const totalTaxCollected = taxData?.total_collected || 0;
  const taxByJurisdiction = taxData?.by_jurisdiction || [];
  const averageTaxRate = taxData?.average_rate || 0;
  const taxableTransactions = taxData?.taxable_transactions || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <StandardSpinner />
      </div>
    );
  }

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Track your sales performance and metrics</p>
        </div>
        
        {/* Time Controls */}
        <div className="flex items-center space-x-4">
          {/* Chart View Selector */}
          <div className="flex rounded-lg shadow-sm">
            {['day', 'week', 'month', 'year'].map(view => (
              <button
                key={view}
                onClick={() => setChartView(view)}
                className={`px-4 py-2 text-sm font-medium capitalize ${
                  chartView === view
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                } ${
                  view === 'day' ? 'rounded-l-lg' : ''
                } ${
                  view === 'year' ? 'rounded-r-lg' : ''
                } border`}
              >
                {view}
              </button>
            ))}
          </div>
          
          {/* Time Range Selector */}
          <div className="flex items-center space-x-2">
            <CalendarIcon className="h-5 w-5 text-gray-400" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 3 months</option>
              <option value={180}>Last 6 months</option>
              <option value={365}>Last 12 months</option>
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Sales */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Sales</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(stats.totalSales, userCurrency)}
              </p>
              <div className="flex items-center mt-2">
                {growthRate > 0 ? (
                  <>
                    <ArrowUpIcon className="h-4 w-4 text-green-600 mr-1" />
                    <span className="text-sm text-green-600">+{growthRate}%</span>
                  </>
                ) : (
                  <>
                    <ArrowDownIcon className="h-4 w-4 text-red-600 mr-1" />
                    <span className="text-sm text-red-600">{growthRate}%</span>
                  </>
                )}
                <span className="text-sm text-gray-500 ml-2">vs last period</span>
              </div>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <CurrencyDollarIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Total Transactions */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Transactions</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats.totalTransactions}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {Math.round(stats.totalTransactions / timeRange)} per day
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <ShoppingCartIcon className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Average Order Value */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Average Order Value</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(stats.averageOrderValue, userCurrency)}
              </p>
              <p className="text-sm text-gray-500 mt-2">Per transaction</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <ArrowTrendingUpIcon className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Tax Collected */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Tax Collected</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(totalTaxCollected, userCurrency)}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {averageTaxRate.toFixed(2)}% avg rate
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <CalculatorIcon className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Test Chart First */}
      <TestChart />
      
      {/* Sales Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Sales Trends</h2>
        {console.log('[SalesDashboardEnhanced] Chart data:', chartData)}
        {chartData?.length === 0 && (
          <p className="text-center text-gray-500 py-8">No data available for charts</p>
        )}
        {(() => {
          try {
            return (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => formatCurrency(value, userCurrency)}
                    labelStyle={{ color: '#111827' }}
                  />
                  <Legend />
                  <Bar dataKey="sales" fill="#3B82F6" name="Sales" />
                  <Bar dataKey="tax" fill="#F59E0B" name="Tax" />
                </BarChart>
              </ResponsiveContainer>
            );
          } catch (error) {
            console.error('[SalesDashboardEnhanced] Error rendering chart:', error);
            return <div className="text-red-500 p-4">Error rendering chart: {error.message}</div>;
          }
        })()}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Tax Widget */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Sales Tax Summary</h2>
            <DocumentTextIcon className="h-5 w-5 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            {/* Tax Summary Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Total Collected</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(totalTaxCollected, userCurrency)}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Taxable Sales</p>
                <p className="text-lg font-semibold text-gray-900">
                  {taxableTransactions}
                </p>
              </div>
            </div>
            
            {/* Tax by Jurisdiction */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">By Jurisdiction</p>
              <div className="space-y-2">
                {taxByJurisdiction.slice(0, 5).map((item, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm text-gray-600">{item.jurisdiction}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(item.amount, userCurrency)}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        ({item.rate}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Tax Rate Distribution */}
            <div className="pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Average Tax Rate</span>
                <span className="text-lg font-semibold text-gray-900">
                  {averageTaxRate.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm text-gray-600">Tax Compliance</span>
                <span className="text-sm font-medium text-green-600">
                  ✓ Up to date
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Products</h2>
          <div className="space-y-3">
            {stats.topProducts.slice(0, 5).map((product, index) => (
              <div key={index} className="flex justify-between items-center">
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-900 mr-2">
                    #{index + 1}
                  </span>
                  <span className="text-sm text-gray-600">{product.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {formatCurrency(product.revenue || 0, userCurrency)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {product.quantity || 0} sold
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Sales Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Recent Sales</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tax
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats.recentSales.slice(0, 10).map((sale, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(sale.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {sale.customer || 'Walk-in'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {sale.items || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(sale.tax || 0, userCurrency)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(sale.amount || 0, userCurrency)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      {sale.status || 'Completed'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SalesDashboardEnhanced;