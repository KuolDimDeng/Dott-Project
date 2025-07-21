'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
  serviceApi
} from '@/utils/apiClient';
import { getSecureTenantId } from '@/utils/tenantUtils';
import StandardSpinner from '@/components/ui/StandardSpinner';
import { toast } from 'react-hot-toast';

const BusinessOverview = () => {
  const { t } = useTranslation('navigation');
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

  // Helper function to fetch dashboard metrics
  const fetchDashboardMetrics = async () => {
    try {
      const response = await fetch('/api/dashboard/metrics/summary', {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        return response.json();
      }
      return {};
    } catch (error) {
      console.error('Dashboard metrics fetch failed:', error);
      return {};
    }
  };

  // Helper function to fetch bank accounts
  const fetchBankAccounts = async () => {
    try {
      const response = await fetch('/api/banking/accounts', {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        return response.json();
      }
      return [];
    } catch (error) {
      console.error('Bank accounts fetch failed:', error);
      return [];
    }
  };

  // Fetch all business data
  const fetchBusinessData = useCallback(async () => {
    try {
      setIsLoading(true);
      const tenantId = await getSecureTenantId();
      
      // Fetch all data in parallel with error handling
      const [
        dashboardData,
        productsRes,
        ordersRes,
        invoicesRes,
        customersRes,
        bankAccountsRes
      ] = await Promise.allSettled([
        fetchDashboardMetrics(),
        productApi.getAll().catch(err => {
          console.error('Products API failed:', err);
          return [];
        }),
        orderApi.getAll().catch(err => {
          console.error('Orders API failed:', err);
          return [];
        }),
        invoiceApi.getAll().catch(err => {
          console.error('Invoices API failed:', err);
          return [];
        }),
        customerApi.getAll().catch(err => {
          console.error('Customers API failed:', err);
          return [];
        }),
        fetchBankAccounts()
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
          bankBalance += parseFloat(acc.current_balance || acc.balance || 0);
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
          customer: o.customer_name || t('dashboard.businessOverview.common.unknown', 'Unknown'),
          amount: parseFloat(o.total_amount || 0),
          status: o.status,
          date: new Date(o.created_at).toLocaleDateString()
        }));

      // Create pending tasks
      const pendingTasks = [];
      if (overdueCount > 0) {
        pendingTasks.push({
          title: t('dashboard.businessOverview.alerts.overdueInvoices', `${overdueCount} overdue invoices`, { count: overdueCount }),
          type: 'warning',
          action: t('dashboard.businessOverview.actions.reviewNow', 'Review now')
        });
      }
      if (lowStockCount > 0) {
        pendingTasks.push({
          title: t('dashboard.businessOverview.alerts.lowStock', `${lowStockCount} products low on stock`, { count: lowStockCount }),
          type: 'alert',
          action: t('dashboard.businessOverview.actions.reorder', 'Reorder')
        });
      }
      if (pendingOrderCount > 0) {
        pendingTasks.push({
          title: t('dashboard.businessOverview.alerts.pendingOrders', `${pendingOrderCount} pending orders`, { count: pendingOrderCount }),
          type: 'info',
          action: t('dashboard.businessOverview.actions.process', 'Process')
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
      
      // Set default values on error
      setMetrics({
        // Financial
        totalAssets: 0,
        totalLiabilities: 0,
        equity: 0,
        bankBalance: 0,
        cashOnHand: 0,
        accountsReceivable: 0,
        accountsPayable: 0,
        
        // Revenue
        totalRevenue: 0,
        monthlyRevenue: 0,
        weeklyRevenue: 0,
        todayRevenue: 0,
        expenses: 0,
        profitMargin: 0,
        
        // Operations
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
        
        // Lists
        topProducts: [],
        recentOrders: [],
        pendingTasks: []
      });
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
            {t('dashboard.businessOverview.title', 'Business Overview')}
          </h1>
          <p className="text-gray-600">{t('dashboard.businessOverview.subtitle', 'Complete snapshot of your business performance')}</p>
        </div>
        <button
          onClick={fetchBusinessData}
          className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <ArrowPathIcon className="w-4 h-4 mr-2" />
          {t('dashboard.businessOverview.actions.refresh', 'Refresh')}
        </button>
      </div>

      {/* Alert Section */}
      {metrics.pendingTasks.length > 0 && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <BellAlertIcon className="w-5 h-5 text-yellow-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">{t('dashboard.businessOverview.alerts.requiresAttention', 'Requires Attention')}</h3>
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
          {t('dashboard.businessOverview.sections.todaysPerformance', "Today's Performance")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title={t('dashboard.businessOverview.metrics.todaysRevenue', "Today's Revenue")}
            value={formatCurrency(metrics.todayRevenue)}
            subValue={t('dashboard.businessOverview.timeframes.soFarToday', 'So far today')}
            icon={CurrencyDollarIcon}
            color="green"
          />
          <MetricCard
            title={t('dashboard.businessOverview.metrics.newOrders', 'New Orders')}
            value={formatNumber(metrics.pendingOrders)}
            subValue={t('dashboard.businessOverview.statuses.pendingProcessing', 'Pending processing')}
            icon={ShoppingCartIcon}
            color="blue"
          />
          <MetricCard
            title={t('dashboard.businessOverview.metrics.newCustomers', 'New Customers')}
            value={formatNumber(metrics.newCustomers)}
            subValue={t('dashboard.businessOverview.timeframes.last7Days', 'Last 7 days')}
            icon={UserPlusIcon}
            color="purple"
          />
          <MetricCard
            title={t('dashboard.businessOverview.metrics.lowStockAlert', 'Low Stock Alert')}
            value={formatNumber(metrics.lowStockProducts)}
            subValue={t('dashboard.businessOverview.statuses.productsNeedReorder', 'Products need reorder')}
            icon={ExclamationTriangleIcon}
            color={metrics.lowStockProducts > 0 ? 'yellow' : 'green'}
          />
        </div>
      </div>

      {/* Financial Position */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <ScaleIcon className="w-5 h-5 text-gray-600 mr-2" />
          {t('dashboard.businessOverview.sections.financialPosition', 'Financial Position')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title={t('dashboard.businessOverview.metrics.totalAssets', 'Total Assets')}
            value={formatCurrency(metrics.totalAssets)}
            subValue={t('dashboard.businessOverview.descriptions.cashInventoryReceivables', 'Cash + Inventory + Receivables')}
            icon={ChartPieIcon}
            color="blue"
          />
          <MetricCard
            title={t('dashboard.businessOverview.metrics.totalLiabilities', 'Total Liabilities')}
            value={formatCurrency(metrics.totalLiabilities)}
            subValue={t('dashboard.businessOverview.descriptions.payablesLoans', 'Payables + Loans')}
            icon={CreditCardIcon}
            color="red"
          />
          <MetricCard
            title={t('dashboard.businessOverview.metrics.equity', 'Equity')}
            value={formatCurrency(metrics.equity)}
            subValue={t('dashboard.businessOverview.descriptions.assetsMinusLiabilities', 'Assets - Liabilities')}
            icon={ScaleIcon}
            color="green"
          />
          <MetricCard
            title={t('dashboard.businessOverview.metrics.bankBalance', 'Bank Balance')}
            value={formatCurrency(metrics.bankBalance)}
            subValue={t('dashboard.businessOverview.descriptions.allAccounts', 'All accounts')}
            icon={BuildingLibraryIcon}
            color="purple"
          />
        </div>
      </div>

      {/* Cash Flow */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <BanknotesIcon className="w-5 h-5 text-gray-600 mr-2" />
          {t('dashboard.businessOverview.sections.cashFlowRevenue', 'Cash Flow & Revenue')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title={t('dashboard.businessOverview.metrics.monthlyRevenue', 'Monthly Revenue')}
            value={formatCurrency(metrics.monthlyRevenue)}
            subValue={t('dashboard.businessOverview.timeframes.last30Days', 'Last 30 days')}
            icon={CalendarIcon}
            color="blue"
            trend={metrics.revenueTrend}
          />
          <MetricCard
            title={t('dashboard.businessOverview.metrics.accountsReceivable', 'Accounts Receivable')}
            value={formatCurrency(metrics.accountsReceivable)}
            subValue={t('dashboard.businessOverview.statuses.overdueCount', `${metrics.overdueInvoices} overdue`, { count: metrics.overdueInvoices })}
            icon={DocumentTextIcon}
            color={metrics.overdueInvoices > 0 ? 'orange' : 'green'}
          />
          <MetricCard
            title={t('dashboard.businessOverview.metrics.profitMargin', 'Profit Margin')}
            value={`${metrics.profitMargin}%`}
            subValue={t('dashboard.businessOverview.descriptions.revenueMinusExpenses', 'Revenue - Expenses')}
            icon={ChartBarIcon}
            color="purple"
          />
          <MetricCard
            title={t('dashboard.businessOverview.metrics.weeklyRevenue', 'Weekly Revenue')}
            value={formatCurrency(metrics.weeklyRevenue)}
            subValue={t('dashboard.businessOverview.timeframes.last7Days', 'Last 7 days')}
            icon={ArrowTrendingUpIcon}
            color="teal"
          />
        </div>
      </div>

      {/* Operations Overview */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <TruckIcon className="w-5 h-5 text-gray-600 mr-2" />
          {t('dashboard.businessOverview.sections.operationsOverview', 'Operations Overview')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title={t('dashboard.businessOverview.metrics.totalOrders', 'Total Orders')}
            value={formatNumber(metrics.totalOrders)}
            subValue={t('dashboard.businessOverview.statuses.completedCount', `${metrics.completedOrders} completed`, { count: metrics.completedOrders })}
            icon={ShoppingCartIcon}
            color="indigo"
            trend={metrics.orderTrend}
          />
          <MetricCard
            title={t('dashboard.businessOverview.metrics.activeCustomers', 'Active Customers')}
            value={formatNumber(metrics.activeCustomers)}
            subValue={t('dashboard.businessOverview.statuses.ofTotalCount', `of ${metrics.totalCustomers} total`, { count: metrics.totalCustomers })}
            icon={UserGroupIcon}
            color="green"
            trend={metrics.customerTrend}
          />
          <MetricCard
            title={t('dashboard.businessOverview.metrics.productCatalog', 'Product Catalog')}
            value={formatNumber(metrics.totalProducts)}
            subValue={t('dashboard.businessOverview.statuses.lowStockCount', `${metrics.lowStockProducts} low stock`, { count: metrics.lowStockProducts })}
            icon={CubeIcon}
            color="orange"
          />
          <MetricCard
            title={t('dashboard.businessOverview.metrics.invoiceStatus', 'Invoice Status')}
            value={`${metrics.paidInvoices}/${metrics.totalInvoices}`}
            subValue={t('dashboard.businessOverview.statuses.paidInvoices', 'Paid invoices')}
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
            {t('dashboard.businessOverview.sections.topSellingProducts', 'Top Selling Products')}
          </h3>
          {metrics.topProducts.length > 0 ? (
            <div className="space-y-3">
              {metrics.topProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-500">{t('dashboard.businessOverview.statuses.productsSold', `${product.sales} sold`, { count: product.sales })}</p>
                  </div>
                  <p className="font-semibold text-gray-900">{formatCurrency(product.revenue)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">{t('dashboard.businessOverview.messages.noSalesData', 'No sales data available')}</p>
          )}
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <ClockIcon className="w-5 h-5 text-blue-500 mr-2" />
            {t('dashboard.businessOverview.sections.recentOrders', 'Recent Orders')}
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
                      {t(`dashboard.businessOverview.orderStatus.${order.status}`, order.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">{t('dashboard.businessOverview.messages.noRecentOrders', 'No recent orders')}</p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.businessOverview.sections.quickActions', 'Quick Actions')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <ShoppingCartIcon className="w-6 h-6 text-blue-600 mb-2" />
            <span className="text-sm text-gray-700">{t('dashboard.businessOverview.quickActions.newOrder', 'New Order')}</span>
          </button>
          <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <CurrencyDollarIcon className="w-6 h-6 text-green-600 mb-2" />
            <span className="text-sm text-gray-700">{t('dashboard.businessOverview.quickActions.createInvoice', 'Create Invoice')}</span>
          </button>
          <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <UserGroupIcon className="w-6 h-6 text-purple-600 mb-2" />
            <span className="text-sm text-gray-700">{t('dashboard.businessOverview.quickActions.addCustomer', 'Add Customer')}</span>
          </button>
          <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <CubeIcon className="w-6 h-6 text-orange-600 mb-2" />
            <span className="text-sm text-gray-700">{t('dashboard.businessOverview.quickActions.addProduct', 'Add Product')}</span>
          </button>
          <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <ChartBarIcon className="w-6 h-6 text-indigo-600 mb-2" />
            <span className="text-sm text-gray-700">{t('dashboard.businessOverview.quickActions.viewReports', 'View Reports')}</span>
          </button>
          <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <BanknotesIcon className="w-6 h-6 text-teal-600 mb-2" />
            <span className="text-sm text-gray-700">{t('dashboard.businessOverview.quickActions.recordPayment', 'Record Payment')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BusinessOverview;