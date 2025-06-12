'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { getCacheValue } from '@/utils/appCache';
import axiosInstance from '@/utils/apiClient';

const SalesDashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalCustomers: 0,
    topProducts: [],
    recentOrders: [],
    monthlySales: [],
    customerGrowth: [],
    productPerformance: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('month'); // week, month, quarter, year

  useEffect(() => {
    console.log('[SalesDashboard] Component mounted, fetching dashboard data...');
    fetchDashboardData();
  }, [selectedPeriod]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      console.log('[SalesDashboard] Fetching dashboard data for period:', selectedPeriod);
      
      const tenantId = getCacheValue('tenantId');
      const schema = `tenant_${tenantId?.replace(/-/g, '_')}`;
      
      // Fetch dashboard metrics
      const [ordersRes, customersRes, productsRes, revenueRes] = await Promise.all([
        axiosInstance.get('/sales/orders/', {
          params: { tenantId, schema, limit: 10 }
        }),
        axiosInstance.get('/customers/', {
          params: { tenantId, schema }
        }),
        axiosInstance.get('/inventory/products/', {
          params: { tenantId, schema }
        }),
        axiosInstance.get('/sales/revenue/', {
          params: { tenantId, schema, period: selectedPeriod }
        })
      ]);

      console.log('[SalesDashboard] Received data:', {
        orders: ordersRes.data?.length || 0,
        customers: customersRes.data?.length || 0,
        products: productsRes.data?.length || 0,
        revenue: revenueRes.data
      });

      // Process the data
      const processedData = {
        totalRevenue: revenueRes.data?.total || 0,
        totalOrders: ordersRes.data?.length || 0,
        totalCustomers: customersRes.data?.length || 0,
        topProducts: productsRes.data?.slice(0, 5) || [],
        recentOrders: ordersRes.data?.slice(0, 10) || [],
        monthlySales: revenueRes.data?.monthly || [],
        customerGrowth: customersRes.data?.growth || [],
        productPerformance: productsRes.data?.performance || []
      };

      setDashboardData(processedData);
      console.log('[SalesDashboard] Dashboard data updated successfully');
    } catch (error) {
      console.error('[SalesDashboard] Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const MetricCard = ({ title, value, icon, color = 'blue', trend = null }) => {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className={`text-2xl font-bold text-${color}-600 mt-2`}>{value}</p>
            {trend && (
              <div className="flex items-center mt-2">
                <span className={`text-sm ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
                </span>
                <span className="text-xs text-gray-500 ml-2">vs last period</span>
              </div>
            )}
          </div>
          <div className={`p-3 bg-${color}-100 rounded-full`}>
            {icon}
          </div>
        </div>
      </div>
    );
  };

  const RecentOrdersTable = ({ orders }) => {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">Recent Orders</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.length > 0 ? (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {order.order_number || `ORD-${order.id}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.customer_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.order_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        order.status === 'completed' ? 'bg-green-100 text-green-800' :
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status || 'draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(order.total_amount)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                    No recent orders
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const TopProductsList = ({ products }) => {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">Top Products</h3>
        </div>
        <div className="p-6">
          {products.length > 0 ? (
            <div className="space-y-4">
              {products.map((product, index) => (
                <div key={product.id} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-900 mr-4">
                      {index + 1}.
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {product.name || product.product_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {product.sales_count || 0} sales
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {formatCurrency(product.total_revenue || 0)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500">No product data available</p>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Sales Dashboard</h1>
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="week">Last Week</option>
          <option value="month">Last Month</option>
          <option value="quarter">Last Quarter</option>
          <option value="year">Last Year</option>
        </select>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(dashboardData.totalRevenue)}
          color="blue"
          icon={
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          trend={5.2}
        />
        <MetricCard
          title="Total Orders"
          value={dashboardData.totalOrders}
          color="green"
          icon={
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          }
          trend={2.1}
        />
        <MetricCard
          title="Total Customers"
          value={dashboardData.totalCustomers}
          color="purple"
          icon={
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
          trend={8.3}
        />
        <MetricCard
          title="Products Sold"
          value={dashboardData.topProducts.length}
          color="orange"
          icon={
            <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
          trend={-1.5}
        />
      </div>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentOrdersTable orders={dashboardData.recentOrders} />
        <TopProductsList products={dashboardData.topProducts} />
      </div>

      {/* Additional Analytics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Sales Trends</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          {/* Placeholder for chart */}
          <p>Sales chart will be implemented here</p>
        </div>
      </div>
    </div>
  );
};

export default SalesDashboard;