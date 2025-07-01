'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  ChartBarIcon,
  CurrencyDollarIcon,
  BanknotesIcon,
  BuildingLibraryIcon,
  ScaleIcon,
  ChartPieIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CreditCardIcon,
  UserGroupIcon,
  ShoppingCartIcon,
  CubeIcon,
  DocumentTextIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  BellAlertIcon,
  FireIcon,
  UserPlusIcon,
  TruckIcon,
  ReceiptPercentIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { 
  orderApi, 
  invoiceApi, 
  customerApi, 
  productApi, 
  serviceApi,
  dashboardApi,
  bankingApi 
} from '@/utils/apiClient';
import { getSecureTenantId } from '@/utils/tenantUtils';
import StandardSpinner from '@/components/ui/StandardSpinner';
import { toast } from 'react-hot-toast';

const BusinessOverview = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    // Financial metrics
    totalAssets: 0,
    totalLiabilities: 0,
    equity: 0,
    bankBalance: 0,
    cashOnHand: 0,
    accountsReceivable: 0,
    accountsPayable: 0,
    
    // Revenue metrics
    totalRevenue: 0,
    monthlyRevenue: 0,
    weeklyRevenue: 0,
    todayRevenue: 0,
    expenses: 0,
    profitMargin: 0,
    
    // Operations metrics
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalCustomers: 0,
    newCustomers: 0,
    activeCustomers: 0,
    totalProducts: 0,
    lowStockProducts: 0,
    totalInvoices: 0,
    overdueInvoices: 0,
    paidInvoices: 0,
    
    // Trends
    revenueTrend: 0,
    customerTrend: 0,
    orderTrend: 0,
    
    // Top items
    topProducts: [],
    recentOrders: [],
    pendingTasks: []
  });

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

  // Calculate trend percentage
  const calculateTrend = (current, previous) => {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  // Fetch all business data
  const fetchBusinessData = useCallback(async () => {
    try {
      setIsLoading(true);
      const tenantId = await getSecureTenantId();
      
      // Fetch all data in parallel
      const [
        dashboardData,
        productsRes,
        ordersRes,
        invoicesRes,
        customersRes,
        bankAccountsRes
      ] = await Promise.allSettled([
        dashboardApi.getMetricsSummary(),
        productApi.getAll(),
        orderApi.getAll(),
        invoiceApi.getAll(),
        customerApi.getAll(),
        bankingApi.getAccounts()
      ]);

      // Process dashboard metrics
      let dashboardMetrics = {};
      if (dashboardData.status === 'fulfilled' && dashboardData.value) {
        dashboardMetrics = dashboardData.value;
      }

      // Process products
      let products = [];
      let totalProductValue = 0;
      let lowStockCount = 0;
      if (productsRes.status === 'fulfilled') {
        const productsData = productsRes.value || [];
        products = Array.isArray(productsData) ? productsData : (productsData.results || []);
        products.forEach(p => {
          const stockQty = parseInt(p.stock_quantity || 0);
          const price = parseFloat(p.price || 0);
          totalProductValue += stockQty * price;
          if (stockQty < (parseInt(p.reorder_level) || 10)) {
            lowStockCount++;
          }
        });
      }

      // Process orders
      let orders = [];
      let pendingOrderCount = 0;
      let completedOrderCount = 0;
      let todayRevenue = 0;
      let weekRevenue = 0;
      let monthRevenue = 0;
      
      if (ordersRes.status === 'fulfilled') {
        const ordersData = ordersRes.value || [];
        orders = Array.isArray(ordersData) ? ordersData : (ordersData.results || []);
        
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        orders.forEach(order => {
          const orderDate = new Date(order.created_at || order.order_date);
          const amount = parseFloat(order.total_amount || 0);
          
          if (order.status === 'pending') pendingOrderCount++;
          if (order.status === 'completed') completedOrderCount++;
          
          if (orderDate >= today) todayRevenue += amount;
          if (orderDate >= weekAgo) weekRevenue += amount;
          if (orderDate >= monthAgo) monthRevenue += amount;
        });
      }

      // Process invoices
      let invoices = [];
      let totalRevenue = 0;
      let overdueCount = 0;
      let paidCount = 0;
      let receivables = 0;
      
      if (invoicesRes.status === 'fulfilled') {
        const invoicesData = invoicesRes.value || [];
        invoices = Array.isArray(invoicesData) ? invoicesData : (invoicesData.results || []);
        
        const now = new Date();
        invoices.forEach(inv => {
          const amount = parseFloat(inv.total_amount || 0);
          totalRevenue += amount;
          
          if (inv.status === 'paid') {
            paidCount++;
          } else {
            receivables += amount;
            const dueDate = new Date(inv.due_date);
            if (dueDate < now && inv.status !== 'paid') {
              overdueCount++;
            }
          }
        });
      }

      // Process customers
      let customers = [];
      let activeCustomerCount = 0;
      let newCustomerCount = 0;
      
      if (customersRes.status === 'fulfilled') {
        const customersData = customersRes.value || [];
        customers = Array.isArray(customersData) ? customersData : (customersData.results || []);
        
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        customers.forEach(customer => {
          const createdDate = new Date(customer.created_at);
          if (createdDate >= sevenDaysAgo) newCustomerCount++;
          if (customer.last_order_date) {
            const lastOrderDate = new Date(customer.last_order_date);
            if (lastOrderDate >= thirtyDaysAgo) activeCustomerCount++;
          }
        });
      }

      // Process bank accounts
      let bankBalance = 0;
      if (bankAccountsRes.status === 'fulfilled') {
        const accountsData = bankAccountsRes.value || [];
        const accounts = Array.isArray(accountsData) ? accountsData : (accountsData.results || []);
        accounts.forEach(acc => {
          bankBalance += parseFloat(acc.current_balance || 0);
        });
      }

      // Calculate financial position
      const cashOnHand = bankBalance; // Simplified
      const totalAssets = cashOnHand + totalProductValue + receivables;
      const accountsPayable = 0; // Would need supplier invoice data
      const totalLiabilities = accountsPayable; // Simplified
      const equity = totalAssets - totalLiabilities;
      
      // Calculate profit margin
      const expenses = totalRevenue * 0.7; // Placeholder - would need expense data
      const profit = totalRevenue - expenses;
      const profitMargin = totalRevenue > 0 ? (profit / totalRevenue * 100) : 0;

      // Get trends from dashboard metrics
      const revenueTrend = dashboardMetrics.revenue_trend || 0;
      const customerTrend = dashboardMetrics.customer_trend || 0;
      const orderTrend = dashboardMetrics.order_trend || 0;

      // Get top products
      const topProducts = products
        .sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0))
        .slice(0, 5)
        .map(p => ({
          name: p.name,
          sales: p.sales_count || 0,
          revenue: (p.sales_count || 0) * parseFloat(p.price || 0)
        }));

      // Get recent orders
      const recentOrders = orders
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5)
        .map(o => ({
          id: o.order_number || o.id,
          customer: o.customer_name || 'Unknown',
          amount: parseFloat(o.total_amount || 0),
          status: o.status,
          date: new Date(o.created_at).toLocaleDateString()
        }));

      // Create pending tasks
      const pendingTasks = [];
      if (overdueCount > 0) {
        pendingTasks.push({
          title: `${overdueCount} overdue invoices`,
          type: 'warning',
          action: 'Review now'
        });
      }
      if (lowStockCount > 0) {
        pendingTasks.push({
          title: `${lowStockCount} products low on stock`,
          type: 'alert',
          action: 'Reorder'
        });
      }
      if (pendingOrderCount > 0) {
        pendingTasks.push({
          title: `${pendingOrderCount} pending orders`,
          type: 'info',
          action: 'Process'
        });
      }

      // Update state with all metrics
      setMetrics({
        // Financial
        totalAssets,
        totalLiabilities,
        equity,
        bankBalance,
        cashOnHand,
        accountsReceivable: receivables,
        accountsPayable,
        
        // Revenue
        totalRevenue,
        monthlyRevenue: monthRevenue,
        weeklyRevenue: weekRevenue,
        todayRevenue,
        expenses,
        profitMargin: profitMargin.toFixed(1),
        
        // Operations
        totalOrders: orders.length,
        pendingOrders: pendingOrderCount,
        completedOrders: completedOrderCount,
        totalCustomers: customers.length,
        newCustomers: newCustomerCount,
        activeCustomers: activeCustomerCount,
        totalProducts: products.length,
        lowStockProducts: lowStockCount,
        totalInvoices: invoices.length,
        overdueInvoices: overdueCount,
        paidInvoices: paidCount,
        
        // Trends
        revenueTrend,
        customerTrend,
        orderTrend,
        
        // Lists
        topProducts,
        recentOrders,
        pendingTasks
      });

    } catch (error) {
      console.error('[BusinessOverview] Error fetching data:', error);
      toast.error('Failed to load business data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBusinessData();
  }, [fetchBusinessData]);

  // Metric Card Component
  const MetricCard = ({ title, value, subValue, icon: Icon, color, trend, size = 'normal' }) => {
    const colorClasses = {
      blue: 'bg-blue-100 text-blue-600',
      green: 'bg-green-100 text-green-600',
      red: 'bg-red-100 text-red-600',
      purple: 'bg-purple-100 text-purple-600',
      orange: 'bg-orange-100 text-orange-600',
      teal: 'bg-teal-100 text-teal-600',
      yellow: 'bg-yellow-100 text-yellow-600',
      indigo: 'bg-indigo-100 text-indigo-600'
    };

    return (
      <div className={`bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow ${size === 'large' ? 'col-span-2' : ''}`}>
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-full ${colorClasses[color] || 'bg-gray-100 text-gray-600'}`}>
            <Icon className="w-6 h-6" />
          </div>
          {trend !== undefined && trend !== 0 && (
            <div className={`flex items-center text-sm ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend > 0 ? (
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
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <StandardSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-black mb-2 flex items-center">
            <ChartBarIcon className="h-6 w-6 text-blue-600 mr-2" />
            Business Overview
          </h1>
          <p className="text-gray-600">Complete snapshot of your business performance</p>
        </div>
        <button
          onClick={fetchBusinessData}
          className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <ArrowPathIcon className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Alert Section */}
      {metrics.pendingTasks.length > 0 && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <BellAlertIcon className="w-5 h-5 text-yellow-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Requires Attention</h3>
          </div>
          <div className="space-y-2">
            {metrics.pendingTasks.map((task, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-gray-700">{task.title}</span>
                <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                  {task.action} →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Metrics - Today\'s Performance */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FireIcon className="w-5 h-5 text-gray-600 mr-2" />
          Today\'s Performance
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Today\'s Revenue"
            value={formatCurrency(metrics.todayRevenue)}
            subValue="So far today"
            icon={CurrencyDollarIcon}
            color="green"
          />
          <MetricCard
            title="New Orders"
            value={formatNumber(metrics.pendingOrders)}
            subValue="Pending processing"
            icon={ShoppingCartIcon}
            color="blue"
          />
          <MetricCard
            title="New Customers"
            value={formatNumber(metrics.newCustomers)}
            subValue="Last 7 days"
            icon={UserPlusIcon}
            color="purple"
          />
          <MetricCard
            title="Low Stock Alert"
            value={formatNumber(metrics.lowStockProducts)}
            subValue="Products need reorder"
            icon={ExclamationTriangleIcon}
            color={metrics.lowStockProducts > 0 ? 'yellow' : 'green'}
          />
        </div>
      </div>

      {/* Financial Position */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <ScaleIcon className="w-5 h-5 text-gray-600 mr-2" />
          Financial Position
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Assets"
            value={formatCurrency(metrics.totalAssets)}
            subValue="Cash + Inventory + Receivables"
            icon={ChartPieIcon}
            color="blue"
          />
          <MetricCard
            title="Total Liabilities"
            value={formatCurrency(metrics.totalLiabilities)}
            subValue="Payables + Loans"
            icon={CreditCardIcon}
            color="red"
          />
          <MetricCard
            title="Equity"
            value={formatCurrency(metrics.equity)}
            subValue="Assets - Liabilities"
            icon={ScaleIcon}
            color="green"
          />
          <MetricCard
            title="Bank Balance"
            value={formatCurrency(metrics.bankBalance)}
            subValue="All accounts"
            icon={BuildingLibraryIcon}
            color="purple"
          />
        </div>
      </div>

      {/* Cash Flow */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <BanknotesIcon className="w-5 h-5 text-gray-600 mr-2" />
          Cash Flow & Revenue
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Monthly Revenue"
            value={formatCurrency(metrics.monthlyRevenue)}
            subValue="Last 30 days"
            icon={CalendarIcon}
            color="blue"
            trend={metrics.revenueTrend}
          />
          <MetricCard
            title="Accounts Receivable"
            value={formatCurrency(metrics.accountsReceivable)}
            subValue={`${metrics.overdueInvoices} overdue`}
            icon={DocumentTextIcon}
            color={metrics.overdueInvoices > 0 ? 'orange' : 'green'}
          />
          <MetricCard
            title="Profit Margin"
            value={`${metrics.profitMargin}%`}
            subValue="Revenue - Expenses"
            icon={ChartBarIcon}
            color="purple"
          />
          <MetricCard
            title="Weekly Revenue"
            value={formatCurrency(metrics.weeklyRevenue)}
            subValue="Last 7 days"
            icon={ArrowTrendingUpIcon}
            color="teal"
          />
        </div>
      </div>

      {/* Operations Overview */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <TruckIcon className="w-5 h-5 text-gray-600 mr-2" />
          Operations Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Orders"
            value={formatNumber(metrics.totalOrders)}
            subValue={`${metrics.completedOrders} completed`}
            icon={ShoppingCartIcon}
            color="indigo"
            trend={metrics.orderTrend}
          />
          <MetricCard
            title="Active Customers"
            value={formatNumber(metrics.activeCustomers)}
            subValue={`of ${metrics.totalCustomers} total`}
            icon={UserGroupIcon}
            color="green"
            trend={metrics.customerTrend}
          />
          <MetricCard
            title="Product Catalog"
            value={formatNumber(metrics.totalProducts)}
            subValue={`${metrics.lowStockProducts} low stock`}
            icon={CubeIcon}
            color="orange"
          />
          <MetricCard
            title="Invoice Status"
            value={`${metrics.paidInvoices}/${metrics.totalInvoices}`}
            subValue="Paid invoices"
            icon={ReceiptPercentIcon}
            color="blue"
          />
        </div>
      </div>

      {/* Top Products & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top Products */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FireIcon className="w-5 h-5 text-orange-500 mr-2" />
            Top Selling Products
          </h3>
          {metrics.topProducts.length > 0 ? (
            <div className="space-y-3">
              {metrics.topProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-500">{product.sales} sold</p>
                  </div>
                  <p className="font-semibold text-gray-900">{formatCurrency(product.revenue)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No sales data available</p>
          )}
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <ClockIcon className="w-5 h-5 text-blue-500 mr-2" />
            Recent Orders
          </h3>
          {metrics.recentOrders.length > 0 ? (
            <div className="space-y-3">
              {metrics.recentOrders.map((order, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">#{order.id}</p>
                    <p className="text-sm text-gray-500">{order.customer} • {order.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(order.amount)}</p>
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                      order.status === 'completed' ? 'bg-green-100 text-green-800' :
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No recent orders</p>
          )}
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