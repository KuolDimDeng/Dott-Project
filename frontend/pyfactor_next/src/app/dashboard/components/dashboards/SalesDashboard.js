'use client';

import React, { useState, useEffect } from 'react';
import { 
  CurrencyDollarIcon, 
  ShoppingCartIcon, 
  UserGroupIcon,
  TrendingUpIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChartBarIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { useCurrency } from '@/context/CurrencyContext';
import { formatCurrency } from '@/utils/currencyFormatter';
import StandardSpinner from '@/components/ui/StandardSpinner';
import { toast } from 'react-hot-toast';

const SalesDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState(null);
  const [posTransactions, setPosTransactions] = useState([]);
  const [timeRange, setTimeRange] = useState(1); // 1 month default
  const [fetchError, setFetchError] = useState(null);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalTransactions: 0,
    averageOrderValue: 0,
    topProducts: [],
    recentSales: []
  });
  
  const { currency } = useCurrency();
  const userCurrency = currency?.code || 'USD';

  // Fetch sales analysis data
  const fetchSalesData = async () => {
    try {
      console.log('[SalesDashboard] Starting fetchSalesData, timeRange:', timeRange);
      setFetchError(null);
      
      // First try the analytics endpoint
      const url = `/api/analytics/sales-data?time_range=${timeRange}`;
      console.log('[SalesDashboard] Fetching from URL:', url);
      
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      console.log('[SalesDashboard] Response status:', response.status);
      console.log('[SalesDashboard] Response content-type:', response.headers.get('content-type'));
      
      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        const data = await response.json();
        console.log('[SalesDashboard] Received data:', {
          total_sales: data.total_sales,
          total_transactions: data.total_transactions,
          top_products_count: Array.isArray(data.top_products) ? data.top_products.length : 0,
          recent_sales_count: Array.isArray(data.recent_sales) ? data.recent_sales.length : 0,
          has_error: !!data.error
        });
        
        // Check if backend returned an error
        if (data.error) {
          console.error('[SalesDashboard] Backend returned error:', data.error);
          setFetchError(data.error);
          // Still use the empty data structure returned
        }
        
        setSalesData(data);
        
        // Calculate stats - ensure all values are valid
        setStats({
          totalSales: data.total_sales || data.totalSales || 0,
          totalTransactions: data.total_transactions || data.totalTransactions || data.numberOfOrders || 0,
          averageOrderValue: data.average_order_value || data.averageOrderValue || 0,
          topProducts: Array.isArray(data.top_products) ? data.top_products : 
                      Array.isArray(data.topProducts) ? data.topProducts : [],
          recentSales: Array.isArray(data.recent_sales) ? data.recent_sales : 
                      Array.isArray(data.recentSales) ? data.recentSales : []
        });
        
        console.log('[SalesDashboard] Stats updated successfully');
      } else {
        // Try to get error details
        let errorMessage = 'Unable to load sales data. Please try again later.';
        try {
          const text = await response.text();
          console.error('[SalesDashboard] Non-JSON response:', text.substring(0, 200));
          if (text.includes('<!DOCTYPE') || text.includes('<html')) {
            errorMessage = 'Server returned HTML instead of data. Please refresh the page.';
          }
        } catch (e) {
          console.error('[SalesDashboard] Could not read response text:', e);
        }
        
        setFetchError(errorMessage);
        // Set some default data to prevent errors
        setStats({
          totalSales: 0,
          totalTransactions: 0,
          averageOrderValue: 0,
          topProducts: [],
          recentSales: []
        });
      }
    } catch (error) {
      console.error('[SalesDashboard] Error fetching sales data:', error.message, error);
      setFetchError(`Failed to load sales data: ${error.message}`);
      // Set default stats to prevent render errors
      setStats({
        totalSales: 0,
        totalTransactions: 0,
        averageOrderValue: 0,
        topProducts: [],
        recentSales: []
      });
    }
  };

  // Fetch POS transactions
  const fetchPOSTransactions = async () => {
    try {
      console.log('[SalesDashboard] Fetching POS transactions...');
      
      const response = await fetch('/api/pos/transactions', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      console.log('[SalesDashboard] POS response status:', response.status);
      console.log('[SalesDashboard] POS response content-type:', response.headers.get('content-type'));
      
      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        const data = await response.json();
        console.log('[SalesDashboard] POS data structure:', {
          isArray: Array.isArray(data),
          hasResults: !!data.results,
          hasData: !!data.data,
          directLength: Array.isArray(data) ? data.length : 'N/A'
        });
        
        // Ensure we have an array
        const transactions = Array.isArray(data) ? data : 
                           Array.isArray(data.results) ? data.results : 
                           Array.isArray(data.data) ? data.data : [];
        
        console.log('[SalesDashboard] POS transactions count:', transactions.length);
        setPosTransactions(transactions);
      } else {
        console.error('[SalesDashboard] POS transactions endpoint not available or returned non-JSON');
        setPosTransactions([]);
      }
    } catch (error) {
      console.error('[SalesDashboard] Error fetching POS transactions:', error.message, error);
      setPosTransactions([]);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchSalesData(),
        fetchPOSTransactions()
      ]);
      setLoading(false);
    };
    
    loadData();
  }, [timeRange]);

  // Calculate daily average
  const dailyAverage = stats.totalSales / (timeRange * 30);
  
  // Calculate growth (mock data for now - would need previous period data)
  const growthRate = 12.5; // This should be calculated from actual data

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <StandardSpinner />
      </div>
    );
  }

  // Show error state if there's a fetch error
  if (fetchError) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-red-800 font-medium text-lg mb-2">Error Loading Sales Data</h3>
          <p className="text-red-700 mb-4">{fetchError}</p>
          <button 
            onClick={() => {
              setLoading(true);
              setFetchError(null);
              Promise.all([fetchSalesData(), fetchPOSTransactions()]).then(() => setLoading(false));
            }}
            className="bg-red-100 text-red-800 px-4 py-2 rounded-md hover:bg-red-200 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Track your sales performance and metrics</p>
        </div>
        
        {/* Time Range Selector */}
        <div className="flex items-center space-x-2">
          <CalendarIcon className="h-5 w-5 text-gray-400" />
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value={1}>Last 30 days</option>
            <option value={3}>Last 3 months</option>
            <option value={6}>Last 6 months</option>
            <option value={12}>Last 12 months</option>
          </select>
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
                {posTransactions.length || stats.totalTransactions}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {Math.round((posTransactions.length || stats.totalTransactions) / (timeRange * 30))} per day
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
                {formatCurrency(
                  stats.totalSales / (posTransactions.length || 1),
                  userCurrency
                )}
              </p>
              <p className="text-sm text-gray-500 mt-2">Per transaction</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <ChartBarIcon className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Daily Average */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Daily Average</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(dailyAverage, userCurrency)}
              </p>
              <p className="text-sm text-gray-500 mt-2">Revenue per day</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <TrendingUpIcon className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
          </div>
          <div className="p-6">
            {posTransactions.length > 0 ? (
              <div className="space-y-4">
                {posTransactions.slice(0, 5).map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {transaction.customer_name || 'Walk-in Customer'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        {formatCurrency(transaction.total_amount, userCurrency)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {transaction.payment_method}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No transactions yet</p>
            )}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Top Products</h2>
          </div>
          <div className="p-6">
            {stats.topProducts && stats.topProducts.length > 0 ? (
              <div className="space-y-4">
                {stats.topProducts.slice(0, 5).map((product, index) => {
                  if (!product) return null;
                  return (
                    <div key={product.id || index} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-500 w-6">
                          {index + 1}.
                        </span>
                        <p className="font-medium text-gray-900 ml-2">
                          {product.product__name || product.name || 'Unknown Product'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">
                          {formatCurrency(product.sales || product.revenue || 0, userCurrency)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {product.quantity || 0} sold
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No product data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Sales Trend Chart (Placeholder for now) */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Sales Trend</h2>
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
          <div className="text-center">
            <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">Sales chart visualization coming soon</p>
            <p className="text-sm text-gray-400 mt-1">
              Data is being collected for trend analysis
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesDashboard;