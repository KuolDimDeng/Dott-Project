'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { 
  orderApi, 
  invoiceApi, 
  customerApi, 
  productApi, 
  serviceApi,
  estimateApi,
  paymentApi,
  expenseApi
} from '@/utils/apiClient';
import { getSecureTenantId } from '@/utils/tenantUtils';
import { logger } from '@/utils/logger';
import { format } from 'date-fns';
import { 
  ChartBarIcon,
  CurrencyDollarIcon,
  ShoppingCartIcon,
  UserGroupIcon,
  BanknotesIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CubeIcon,
  BuildingStorefrontIcon
} from '@heroicons/react/24/outline';

import StandardSpinner from '@/components/ui/StandardSpinner';

const BusinessOverview = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  
  // Comprehensive business metrics state
  const [metrics, setMetrics] = useState({
    // Financial overview
    revenue: { total: 0, thisMonth: 0, lastMonth: 0, growth: 0 },
    expenses: { total: 0, thisMonth: 0, lastMonth: 0, growth: 0 },
    profit: { total: 0, thisMonth: 0, lastMonth: 0, margin: 0 },
    cashFlow: { inflow: 0, outflow: 0, net: 0, bankBalance: 0, cashBalance: 0 },
    
    // Sales metrics
    sales: { orders: 0, invoices: 0, estimates: 0, totalValue: 0 },
    customers: { total: 0, active: 0, new: 0, conversion: 0 },
    
    // Operational metrics
    inventory: { products: 0, services: 0, totalValue: 0, lowStock: 0 },
    payments: { received: 0, pending: 0, overdue: 0, overdueAmount: 0 },
    
    // POS metrics
    pos: { transactions: 0, totalValue: 0, avgTransaction: 0 },
    
    // Payroll metrics
    payroll: { employees: 0, totalCost: 0, thisMonth: 0 }
  });

  // Quick stats for summary cards
  const [quickStats, setQuickStats] = useState({
    todayRevenue: 0,
    thisWeekRevenue: 0,
    outstandingInvoices: 0,
    cashOnHand: 0,
    activeCustomers: 0,
    pendingOrders: 0
  });

  // Recent activity data
  const [recentActivity, setRecentActivity] = useState([]);

  // Utility function to format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  // Utility function to format number
  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num || 0);
  };

  // Calculate growth percentage
  const calculateGrowth = (current, previous) => {
    if (!previous) return 0;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  // Fetch comprehensive business data
  const fetchBusinessData = useCallback(async () => {
    try {
      setIsLoading(true);
      const tenantId = await getSecureTenantId();
      
      logger.info('[BusinessOverview] Fetching comprehensive business data...');
      
      // Fetch all data in parallel
      const [
        productsRes,
        servicesRes,
        ordersRes,
        invoicesRes,
        estimatesRes,
        customersRes,
        paymentsRes,
        expensesRes
      ] = await Promise.allSettled([
        productApi.getAll(),
        serviceApi.getAll(),
        orderApi.getAll(),
        invoiceApi.getAll(),
        estimateApi.getAll(),
        customerApi.getAll(),
        paymentApi.getAll(),
        expenseApi.getAll()
      ]);

      // Process all data and calculate metrics
      await processBusinessMetrics({
        productsRes,
        servicesRes,
        ordersRes,
        invoicesRes,
        estimatesRes,
        customersRes,
        paymentsRes,
        expensesRes
      });

    } catch (error) {
      logger.error('[BusinessOverview] Error fetching business data:', error);
      toast.error('Failed to load business overview data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Process and calculate business metrics
  const processBusinessMetrics = async (responses) => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    // Process products
    let products = [];
    if (responses.productsRes.status === 'fulfilled') {
      const productsData = responses.productsRes.value || [];
      products = Array.isArray(productsData) ? productsData : (productsData.results || []);
    }

    // Process services
    let services = [];
    if (responses.servicesRes.status === 'fulfilled') {
      const servicesData = responses.servicesRes.value || [];
      services = Array.isArray(servicesData) ? servicesData : (servicesData.results || []);
    }

    // Process orders
    let orders = [];
    if (responses.ordersRes.status === 'fulfilled') {
      const ordersData = responses.ordersRes.value || [];
      orders = Array.isArray(ordersData) ? ordersData : (ordersData.results || []);
    }

    // Process invoices
    let invoices = [];
    if (responses.invoicesRes.status === 'fulfilled') {
      const invoicesData = responses.invoicesRes.value || [];
      invoices = Array.isArray(invoicesData) ? invoicesData : (invoicesData.results || []);
    }

    // Process customers
    let customers = [];
    if (responses.customersRes.status === 'fulfilled') {
      const customersData = responses.customersRes.value || [];
      customers = Array.isArray(customersData) ? customersData : (customersData.results || []);
    }

    // Process payments
    let payments = [];
    if (responses.paymentsRes.status === 'fulfilled') {
      const paymentsData = responses.paymentsRes.value || [];
      payments = Array.isArray(paymentsData) ? paymentsData : (paymentsData.results || []);
    }

    // Process expenses
    let expenses = [];
    if (responses.expensesRes.status === 'fulfilled') {
      const expensesData = responses.expensesRes.value || [];
      expenses = Array.isArray(expensesData) ? expensesData : (expensesData.results || []);
    }

    // Calculate revenue metrics
    const totalRevenue = invoices.reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0);
    const thisMonthRevenue = invoices
      .filter(inv => {
        const invDate = new Date(inv.created_at);
        return invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear;
      })
      .reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0);
    
    const lastMonthRevenue = invoices
      .filter(inv => {
        const invDate = new Date(inv.created_at);
        return invDate.getMonth() === lastMonth && invDate.getFullYear() === lastMonthYear;
      })
      .reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0);

    // Calculate expense metrics
    const totalExpenses = expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
    const thisMonthExpenses = expenses
      .filter(exp => {
        const expDate = new Date(exp.created_at);
        return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
      })
      .reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);

    // Calculate inventory metrics
    const totalProductValue = products.reduce((sum, p) => sum + (parseFloat(p.price) * parseInt(p.stock_quantity || 0)), 0);
    const totalServiceValue = services.reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0);
    const lowStockProducts = products.filter(p => parseInt(p.stock_quantity || 0) < (parseInt(p.reorder_level) || 10));

    // Calculate payment metrics
    const paidInvoices = invoices.filter(inv => inv.status === 'paid');
    const pendingInvoices = invoices.filter(inv => inv.status === 'pending' || inv.status === 'sent');
    const overdueInvoices = invoices.filter(inv => {
      const dueDate = new Date(inv.due_date);
      return inv.status !== 'paid' && dueDate < currentDate;
    });
    const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0);

    // Set comprehensive metrics
    setMetrics({
      revenue: {
        total: totalRevenue,
        thisMonth: thisMonthRevenue,
        lastMonth: lastMonthRevenue,
        growth: calculateGrowth(thisMonthRevenue, lastMonthRevenue)
      },
      expenses: {
        total: totalExpenses,
        thisMonth: thisMonthExpenses,
        lastMonth: 0, // Would need historical data
        growth: 0
      },
      profit: {
        total: totalRevenue - totalExpenses,
        thisMonth: thisMonthRevenue - thisMonthExpenses,
        lastMonth: lastMonthRevenue,
        margin: totalRevenue ? ((totalRevenue - totalExpenses) / totalRevenue * 100).toFixed(1) : 0
      },
      cashFlow: {
        inflow: payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0),
        outflow: totalExpenses,
        net: totalRevenue - totalExpenses,
        bankBalance: 0, // Would need bank integration
        cashBalance: 0 // Would need cash tracking
      },
      sales: {
        orders: orders.length,
        invoices: invoices.length,
        estimates: 0, // Would need estimates data
        totalValue: totalRevenue
      },
      customers: {
        total: customers.length,
        active: customers.filter(c => c.is_active !== false).length,
        new: customers.filter(c => {
          const custDate = new Date(c.created_at);
          return custDate.getMonth() === currentMonth && custDate.getFullYear() === currentYear;
        }).length,
        conversion: 0 // Would need conversion tracking
      },
      inventory: {
        products: products.length,
        services: services.length,
        totalValue: totalProductValue + totalServiceValue,
        lowStock: lowStockProducts.length
      },
      payments: {
        received: paidInvoices.length,
        pending: pendingInvoices.length,
        overdue: overdueInvoices.length,
        overdueAmount: overdueAmount
      },
      pos: {
        transactions: 0, // Would need POS data
        totalValue: 0,
        avgTransaction: 0
      },
      payroll: {
        employees: 0, // Would need employee data
        totalCost: 0,
        thisMonth: 0
      }
    });

    // Set quick stats
    setQuickStats({
      todayRevenue: invoices
        .filter(inv => {
          const invDate = new Date(inv.created_at);
          const today = new Date();
          return invDate.toDateString() === today.toDateString();
        })
        .reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0),
      thisWeekRevenue: thisMonthRevenue, // Simplified for now
      outstandingInvoices: pendingInvoices.length + overdueInvoices.length,
      cashOnHand: 0, // Would need cash tracking
      activeCustomers: customers.filter(c => c.is_active !== false).length,
      pendingOrders: orders.filter(o => o.status === 'pending').length
    });
  };

  // Period selector options
  const periodOptions = [
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'quarter', label: 'This Quarter' },
    { value: 'year', label: 'This Year' }
  ];

  // Load data on component mount
  useEffect(() => {
    fetchBusinessData();
  }, [fetchBusinessData]);

  // Metric card component
  const MetricCard = ({ title, value, subValue, icon: Icon, color, trend, onClick }) => (
    <div 
      className={`bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-full bg-${color}-100`}>
          <Icon className={`w-6 h-6 text-${color}-600`} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center text-sm ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend >= 0 ? (
              <TrendingUpIcon className="w-4 h-4 mr-1" />
            ) : (
              <TrendingDownIcon className="w-4 h-4 mr-1" />
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

  if (isLoading) {
    return (
      <div className="p-6 bg-gray-50">
        <StandardSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-black mb-2 flex items-center">
              <ChartBarIcon className="h-6 w-6 text-blue-600 mr-2" />
              Business Overview
            </h1>
            <p className="text-gray-600">Complete snapshot of your business performance</p>
          </div>
          
          {/* Period Selector */}
          <div className="flex items-center space-x-4">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {periodOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              onClick={fetchBusinessData}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Key Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(metrics.revenue.total)}
          subValue={`${formatCurrency(metrics.revenue.thisMonth)} this month`}
          icon={CurrencyDollarIcon}
          color="blue"
          trend={parseFloat(metrics.revenue.growth)}
        />
        <MetricCard
          title="Total Expenses"
          value={formatCurrency(metrics.expenses.total)}
          subValue={`${formatCurrency(metrics.expenses.thisMonth)} this month`}
          icon={TrendingDownIcon}
          color="red"
        />
        <MetricCard
          title="Net Profit"
          value={formatCurrency(metrics.profit.total)}
          subValue={`${metrics.profit.margin}% margin`}
          icon={TrendingUpIcon}
          color="green"
        />
        <MetricCard
          title="Cash Flow"
          value={formatCurrency(metrics.cashFlow.net)}
          subValue={`${formatCurrency(metrics.cashFlow.inflow)} in, ${formatCurrency(metrics.cashFlow.outflow)} out`}
          icon={BanknotesIcon}
          color="purple"
        />
      </div>

      {/* Sales & Customer Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <MetricCard
          title="Total Sales"
          value={formatNumber(metrics.sales.orders)}
          subValue={`${formatCurrency(metrics.sales.totalValue)} value`}
          icon={ShoppingCartIcon}
          color="indigo"
        />
        <MetricCard
          title="Active Customers"
          value={formatNumber(metrics.customers.active)}
          subValue={`${metrics.customers.new} new this month`}
          icon={UserGroupIcon}
          color="green"
        />
        <MetricCard
          title="Outstanding Payments"
          value={formatNumber(metrics.payments.pending + metrics.payments.overdue)}
          subValue={`${formatCurrency(metrics.payments.overdueAmount)} overdue`}
          icon={ExclamationTriangleIcon}
          color="yellow"
        />
      </div>

      {/* Operational Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Products"
          value={formatNumber(metrics.inventory.products)}
          subValue={`${metrics.inventory.lowStock} low stock`}
          icon={CubeIcon}
          color="orange"
        />
        <MetricCard
          title="Services"
          value={formatNumber(metrics.inventory.services)}
          subValue="Active offerings"
          icon={BuildingStorefrontIcon}
          color="teal"
        />
        <MetricCard
          title="Invoices"
          value={formatNumber(metrics.sales.invoices)}
          subValue={`${metrics.payments.received} paid`}
          icon={CheckCircleIcon}
          color="green"
        />
        <MetricCard
          title="Pending Actions"
          value={formatNumber(quickStats.pendingOrders + metrics.payments.pending)}
          subValue="Items requiring attention"
          icon={ClockIcon}
          color="red"
        />
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