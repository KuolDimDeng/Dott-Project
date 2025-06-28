'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { 
  orderApi, 
  invoiceApi, 
  customerApi, 
  productApi, 
  serviceApi,
  estimateApi 
} from '@/utils/apiClient';
import { getSecureTenantId } from '@/utils/tenantUtils';
import { logger } from '@/utils/logger';
import { format } from 'date-fns';
import { 
  ChartBar,
  Package,
  Wrench,
  ShoppingCart,
  FileText,
  Files,
  Users,
  CurrencyDollar,
  ChartLine,
  Target,
  Lightning,
  Plus
} from '@phosphor-icons/react';

import StandardSpinner from '@/components/ui/StandardSpinner';
const SalesDashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  
  // Dashboard metrics state
  const [metrics, setMetrics] = useState({
    products: { total: 0, active: 0, lowStock: 0, value: 0 },
    services: { total: 0, active: 0, recurring: 0, value: 0 },
    orders: { total: 0, pending: 0, completed: 0, totalValue: 0 },
    invoices: { total: 0, paid: 0, unpaid: 0, overdue: 0, totalValue: 0 },
    estimates: { total: 0, draft: 0, sent: 0, accepted: 0, totalValue: 0 },
    customers: { total: 0, active: 0, new: 0, totalRevenue: 0 }
  });

  // Recent items for quick access
  const [recentItems, setRecentItems] = useState({
    orders: [],
    invoices: [],
    estimates: [],
    customers: []
  });

  // Chart data
  const [chartData, setChartData] = useState({
    salesTrend: [],
    topProducts: [],
    topServices: [],
    customerGrowth: []
  });

  // Fetch all dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      const tenantId = await getSecureTenantId();
      
      logger.info('[SalesDashboard] Fetching dashboard data...');
      
      // Fetch all data in parallel
      const [
        productsRes,
        servicesRes,
        ordersRes,
        invoicesRes,
        estimatesRes,
        customersRes
      ] = await Promise.allSettled([
        productApi.getAll(),
        serviceApi.getAll(),
        orderApi.getAll(),
        invoiceApi.getAll(),
        estimateApi.getAll(),
        customerApi.getAll()
      ]);

      // Process products
      if (productsRes.status === 'fulfilled') {
        const products = productsRes.value || [];
        const activeProducts = products.filter(p => p.is_active !== false);
        const lowStockProducts = products.filter(p => p.stock_quantity < (p.reorder_level || 10));
        const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock_quantity || 0), 0);
        
        setMetrics(prev => ({
          ...prev,
          products: {
            total: products.length,
            active: activeProducts.length,
            lowStock: lowStockProducts.length,
            value: totalValue
          }
        }));
      }

      // Process services
      if (servicesRes.status === 'fulfilled') {
        const services = servicesRes.value || [];
        const activeServices = services.filter(s => s.is_active !== false);
        const recurringServices = services.filter(s => s.is_recurring);
        const totalValue = services.reduce((sum, s) => sum + (s.price || 0), 0);
        
        setMetrics(prev => ({
          ...prev,
          services: {
            total: services.length,
            active: activeServices.length,
            recurring: recurringServices.length,
            value: totalValue
          }
        }));
      }

      // Process orders
      if (ordersRes.status === 'fulfilled') {
        const orders = ordersRes.value || [];
        const pendingOrders = orders.filter(o => o.status === 'pending');
        const completedOrders = orders.filter(o => o.status === 'completed');
        const totalValue = orders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
        
        setMetrics(prev => ({
          ...prev,
          orders: {
            total: orders.length,
            pending: pendingOrders.length,
            completed: completedOrders.length,
            totalValue: totalValue
          }
        }));

        // Get recent orders
        setRecentItems(prev => ({
          ...prev,
          orders: orders.slice(0, 5).map(order => ({
            id: order.id,
            number: order.order_number,
            customer: order.customer_name,
            amount: order.total_amount,
            status: order.status,
            date: order.order_date || order.created_at
          }))
        }));
      }

      // Process invoices
      if (invoicesRes.status === 'fulfilled') {
        const invoices = invoicesRes.value || [];
        const paidInvoices = invoices.filter(i => i.is_paid || i.status === 'paid');
        const unpaidInvoices = invoices.filter(i => !i.is_paid && i.status !== 'paid');
        const overdueInvoices = unpaidInvoices.filter(i => new Date(i.due_date) < new Date());
        const totalValue = invoices.reduce((sum, i) => sum + (parseFloat(i.total_amount || i.totalAmount) || 0), 0);
        
        setMetrics(prev => ({
          ...prev,
          invoices: {
            total: invoices.length,
            paid: paidInvoices.length,
            unpaid: unpaidInvoices.length,
            overdue: overdueInvoices.length,
            totalValue: totalValue
          }
        }));

        // Get recent invoices
        setRecentItems(prev => ({
          ...prev,
          invoices: invoices.slice(0, 5).map(invoice => ({
            id: invoice.id,
            number: invoice.invoice_num,
            customer: invoice.customer_name,
            amount: invoice.total_amount || invoice.totalAmount,
            status: invoice.is_paid ? 'paid' : 'unpaid',
            dueDate: invoice.due_date
          }))
        }));
      }

      // Process estimates
      if (estimatesRes.status === 'fulfilled') {
        const estimates = estimatesRes.value || [];
        const draftEstimates = estimates.filter(e => e.status === 'draft');
        const sentEstimates = estimates.filter(e => e.status === 'sent');
        const acceptedEstimates = estimates.filter(e => e.status === 'accepted');
        const totalValue = estimates.reduce((sum, e) => sum + (parseFloat(e.total_amount || e.totalAmount) || 0), 0);
        
        setMetrics(prev => ({
          ...prev,
          estimates: {
            total: estimates.length,
            draft: draftEstimates.length,
            sent: sentEstimates.length,
            accepted: acceptedEstimates.length,
            totalValue: totalValue
          }
        }));

        // Get recent estimates
        setRecentItems(prev => ({
          ...prev,
          estimates: estimates.slice(0, 5).map(estimate => ({
            id: estimate.id,
            number: estimate.estimate_num,
            customer: estimate.customer_name,
            amount: estimate.total_amount || estimate.totalAmount,
            status: estimate.status,
            date: estimate.estimate_date || estimate.created_at
          }))
        }));
      }

      // Process customers
      if (customersRes.status === 'fulfilled') {
        const customers = customersRes.value || [];
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const newCustomers = customers.filter(c => new Date(c.created_at) > thirtyDaysAgo);
        
        setMetrics(prev => ({
          ...prev,
          customers: {
            total: customers.length,
            active: customers.length, // You might want to define what makes a customer "active"
            new: newCustomers.length,
            totalRevenue: 0 // This would need to be calculated from orders/invoices
          }
        }));

        // Get recent customers
        setRecentItems(prev => ({
          ...prev,
          customers: customers.slice(0, 5).map(customer => ({
            id: customer.id,
            name: customer.name || customer.customerName || `${customer.first_name} ${customer.last_name}`,
            email: customer.email,
            phone: customer.phone,
            createdAt: customer.created_at
          }))
        }));
      }

      logger.info('[SalesDashboard] Dashboard data loaded successfully');
    } catch (error) {
      logger.error('[SalesDashboard] Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, [selectedPeriod]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  // Metric Card Component
  const MetricCard = ({ title, value, subValue, icon, color, trend }) => (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-full bg-${color}-100 text-${color}-600`}>
          {icon}
        </div>
        {trend !== undefined && (
          <div className={`flex items-center text-sm ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            <span>{trend >= 0 ? '↑' : '↓'}</span>
            <span className="ml-1">{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">{title}</h3>
      <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
      {subValue && <p className="text-sm text-gray-600 mt-1">{subValue}</p>}
    </div>
  );

  // Recent Items Component
  const RecentItemsList = ({ title, items, type }) => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="text-gray-500 text-sm">No {type} yet</p>
        ) : (
          items.map((item, index) => (
            <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {item.number || item.name}
                </p>
                <p className="text-xs text-gray-500">
                  {item.customer || item.email}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {item.amount ? formatCurrency(item.amount) : ''}
                </p>
                <p className="text-xs text-gray-500">
                  {item.status || (item.date ? format(new Date(item.date), 'MMM dd') : '')}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <StandardSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-black mb-4 flex items-center">
          <ChartBar className="h-6 w-6 text-blue-600 mr-2" />
          Sales Dashboard
        </h1>
        <p className="text-gray-600">Overview of your sales performance and metrics</p>
      </div>

      {/* Period Selector */}
      <div className="mb-6 flex justify-end">
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="quarter">This Quarter</option>
          <option value="year">This Year</option>
        </select>
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
        <MetricCard
          title="Products"
          value={metrics.products.total}
          subValue={`${metrics.products.active} active`}
          icon={<Package size={28} weight="duotone" />}
          color="blue"
        />
        <MetricCard
          title="Services"
          value={metrics.services.total}
          subValue={`${metrics.services.recurring} recurring`}
          icon={<Wrench size={28} weight="duotone" />}
          color="purple"
        />
        <MetricCard
          title="Orders"
          value={metrics.orders.total}
          subValue={formatCurrency(metrics.orders.totalValue)}
          icon={<ShoppingCart size={28} weight="duotone" />}
          color="green"
        />
        <MetricCard
          title="Invoices"
          value={metrics.invoices.total}
          subValue={`${metrics.invoices.unpaid} unpaid`}
          icon={<FileText size={28} weight="duotone" />}
          color="yellow"
        />
        <MetricCard
          title="Estimates"
          value={metrics.estimates.total}
          subValue={`${metrics.estimates.sent} sent`}
          icon={<Files size={28} weight="duotone" />}
          color="indigo"
        />
        <MetricCard
          title="Customers"
          value={metrics.customers.total}
          subValue={`${metrics.customers.new} new`}
          icon={<Users size={28} weight="duotone" />}
          color="pink"
        />
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <CurrencyDollar size={24} weight="duotone" className="mr-2 text-green-600" />
            Revenue Overview
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Total Orders Value</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(metrics.orders.totalValue)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Outstanding Invoices</p>
              <p className="text-xl font-semibold text-yellow-600">
                {formatCurrency(metrics.invoices.totalValue * (metrics.invoices.unpaid / metrics.invoices.total || 0))}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Pending Estimates</p>
              <p className="text-xl font-semibold text-blue-600">{formatCurrency(metrics.estimates.totalValue)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <ChartLine size={24} weight="duotone" className="mr-2 text-blue-600" />
            Quick Stats
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Pending Orders</span>
              <span className="text-sm font-semibold text-orange-600">{metrics.orders.pending}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Overdue Invoices</span>
              <span className="text-sm font-semibold text-red-600">{metrics.invoices.overdue}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Low Stock Products</span>
              <span className="text-sm font-semibold text-yellow-600">{metrics.products.lowStock}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Draft Estimates</span>
              <span className="text-sm font-semibold text-gray-600">{metrics.estimates.draft}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Target size={24} weight="duotone" className="mr-2 text-purple-600" />
            Conversion Rates
          </h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-600">Estimate → Order</span>
                <span className="text-sm font-semibold">
                  {metrics.estimates.total > 0 
                    ? `${Math.round((metrics.estimates.accepted / metrics.estimates.total) * 100)}%`
                    : '0%'}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${metrics.estimates.total > 0 ? (metrics.estimates.accepted / metrics.estimates.total) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-600">Invoice Payment</span>
                <span className="text-sm font-semibold">
                  {metrics.invoices.total > 0 
                    ? `${Math.round((metrics.invoices.paid / metrics.invoices.total) * 100)}%`
                    : '0%'}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${metrics.invoices.total > 0 ? (metrics.invoices.paid / metrics.invoices.total) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
        <RecentItemsList 
          title={<span className="flex items-center"><ShoppingCart size={20} weight="duotone" className="mr-2 text-green-600" />Recent Orders</span>} 
          items={recentItems.orders} 
          type="orders"
        />
        <RecentItemsList 
          title={<span className="flex items-center"><FileText size={20} weight="duotone" className="mr-2 text-yellow-600" />Recent Invoices</span>} 
          items={recentItems.invoices} 
          type="invoices"
        />
        <RecentItemsList 
          title={<span className="flex items-center"><Files size={20} weight="duotone" className="mr-2 text-indigo-600" />Recent Estimates</span>} 
          items={recentItems.estimates} 
          type="estimates"
        />
        <RecentItemsList 
          title={<span className="flex items-center"><Users size={20} weight="duotone" className="mr-2 text-pink-600" />New Customers</span>} 
          items={recentItems.customers} 
          type="customers"
        />
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Lightning size={24} weight="duotone" className="mr-2 text-yellow-600" />
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <button className="p-4 text-center border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors group">
            <Package size={32} weight="duotone" className="mb-2 mx-auto text-gray-400 group-hover:text-blue-600 transition-colors" />
            <span className="text-sm text-gray-700">Add Product</span>
          </button>
          <button className="p-4 text-center border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors group">
            <Wrench size={32} weight="duotone" className="mb-2 mx-auto text-gray-400 group-hover:text-purple-600 transition-colors" />
            <span className="text-sm text-gray-700">Add Service</span>
          </button>
          <button className="p-4 text-center border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors group">
            <ShoppingCart size={32} weight="duotone" className="mb-2 mx-auto text-gray-400 group-hover:text-green-600 transition-colors" />
            <span className="text-sm text-gray-700">New Order</span>
          </button>
          <button className="p-4 text-center border-2 border-dashed border-gray-300 rounded-lg hover:border-yellow-500 hover:bg-yellow-50 transition-colors group">
            <FileText size={32} weight="duotone" className="mb-2 mx-auto text-gray-400 group-hover:text-yellow-600 transition-colors" />
            <span className="text-sm text-gray-700">Create Invoice</span>
          </button>
          <button className="p-4 text-center border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors group">
            <Files size={32} weight="duotone" className="mb-2 mx-auto text-gray-400 group-hover:text-indigo-600 transition-colors" />
            <span className="text-sm text-gray-700">New Estimate</span>
          </button>
          <button className="p-4 text-center border-2 border-dashed border-gray-300 rounded-lg hover:border-pink-500 hover:bg-pink-50 transition-colors group">
            <Users size={32} weight="duotone" className="mb-2 mx-auto text-gray-400 group-hover:text-pink-600 transition-colors" />
            <span className="text-sm text-gray-700">Add Customer</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SalesDashboard;