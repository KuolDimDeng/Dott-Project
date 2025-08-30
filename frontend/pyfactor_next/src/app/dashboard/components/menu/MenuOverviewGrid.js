'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ShoppingCart,
  Receipt,
  FileText,
  Package,
  TrendingUp,
  DollarSign,
  CreditCard,
  BarChart3,
  ShoppingBag,
  FileBarChart,
  Calculator,
  Truck,
  Box,
  Layers,
  Tags,
  Archive,
  Users,
  ClipboardList,
  Settings,
  Warehouse,
  ArrowRightLeft,
  Briefcase,
  List,
  PlusCircle,
  DollarSign as Dollar,
  PackageSearch,
  Clock,
  TrendingDown,
  Car,
  Calendar,
  Wallet,
  Send,
  ArrowDownCircle,
  CreditCard as Card,
  RefreshCw,
  Undo2,
  GitMerge,
  Globe,
  FileSpreadsheet,
  UserCheck,
  ShoppingCart as Cart,
  FileInvoice,
  RotateCcw,
  Search,
  BookOpen,
  PenTool,
  Book,
  CheckSquare,
  FileCheck,
  Building,
  ArrowUpDown,
  CheckCircle,
  Heart,
  Play,
  History
} from 'lucide-react';

const MenuOverviewGrid = ({ 
  menuSection, 
  onItemClick,
  userData 
}) => {
  const { t } = useTranslation();
  const [itemStats, setItemStats] = useState({});
  const [usageFrequency, setUsageFrequency] = useState({});
  const [loadingStats, setLoadingStats] = useState(true);

  const menuConfigurations = {
    sales: {
      title: 'Sales Management',
      description: 'Manage your sales operations, transactions, and customer orders',
      items: [
        {
          id: 'dashboard',
          title: 'Dashboard',
          description: 'View sales metrics, revenue trends, and performance analytics',
          icon: TrendingUp,
          color: 'bg-blue-500',
          stats: { label: 'Today\'s Sales', key: 'todaySales' },
          value: 'dashboard'
        },
        {
          id: 'pos',
          title: 'Point of Sale',
          description: 'Process in-store transactions and manage cash register',
          icon: ShoppingCart,
          color: 'bg-green-500',
          stats: { label: 'Open Orders', key: 'openOrders' },
          value: 'pos'
        },
        {
          id: 'transactions',
          title: 'Transactions',
          description: 'View and manage all sales transactions and payment history',
          icon: CreditCard,
          color: 'bg-purple-500',
          stats: { label: 'Pending', key: 'pendingTransactions' },
          value: 'transactions'
        },
        {
          id: 'products',
          title: 'Product Catalog',
          description: 'Manage your product inventory, pricing, and categories',
          icon: Package,
          color: 'bg-orange-500',
          stats: { label: 'Active Products', key: 'activeProducts' },
          value: 'products'
        },
        {
          id: 'services',
          title: 'Services',
          description: 'Manage service offerings, pricing, and service categories',
          icon: Briefcase,
          color: 'bg-cyan-500',
          stats: { label: 'Active Services', key: 'activeServices' },
          value: 'services'
        },
        {
          id: 'customers',
          title: 'Customers',
          description: 'Manage customer profiles, contact information, and purchase history',
          icon: ShoppingBag,
          color: 'bg-pink-500',
          stats: { label: 'Total Customers', key: 'totalCustomers' },
          value: 'customers'
        },
        {
          id: 'estimates',
          title: 'Estimates',
          description: 'Create and manage price quotes and proposals for customers',
          icon: FileText,
          color: 'bg-indigo-500',
          stats: { label: 'Draft Estimates', key: 'draftEstimates' },
          value: 'estimates'
        },
        {
          id: 'orders',
          title: 'Orders',
          description: 'Track and fulfill customer orders from placement to delivery',
          icon: Truck,
          color: 'bg-teal-500',
          stats: { label: 'Pending Orders', key: 'pendingOrders' },
          value: 'orders'
        },
        {
          id: 'invoices',
          title: 'Invoices',
          description: 'Create, send, and track customer invoices and payments',
          icon: Receipt,
          color: 'bg-yellow-500',
          stats: { label: 'Unpaid Invoices', key: 'unpaidInvoices' },
          value: 'invoices'
        },
        {
          id: 'reports',
          title: 'Reports',
          description: 'Generate sales reports, analytics, and business insights',
          icon: BarChart3,
          color: 'bg-red-500',
          stats: { label: 'Reports Available', key: 'reportsAvailable' },
          value: 'reports'
        }
      ]
    },
    inventory: {
      title: 'Inventory Management',
      description: 'Track and manage your products, stock levels, and supply chain',
      items: [
        {
          id: 'dashboard',
          title: 'Dashboard',
          description: 'View inventory metrics, stock levels, and reorder alerts',
          icon: TrendingUp,
          color: 'bg-blue-500',
          stats: { label: 'Total Items', key: 'totalItems' },
          value: 'dashboard'
        },
        {
          id: 'products',
          title: 'Products',
          description: 'Manage product catalog, SKUs, and specifications',
          icon: Package,
          color: 'bg-green-500',
          stats: { label: 'Active Products', key: 'activeProducts' },
          value: 'products'
        },
        {
          id: 'materials',
          title: 'Materials/Supplies',
          description: 'Track raw materials, consumables, and office supplies',
          icon: Box,
          color: 'bg-purple-500',
          stats: { label: 'Material Types', key: 'materialTypes' },
          value: 'materials'
        },
        {
          id: 'suppliers',
          title: 'Product Suppliers',
          description: 'Manage supplier information, contacts, and lead times',
          icon: Users,
          color: 'bg-pink-500',
          stats: { label: 'Active Suppliers', key: 'activeSuppliers' },
          value: 'suppliers'
        },
        {
          id: 'stock-adjustments',
          title: 'Adjustments',
          description: 'Record stock adjustments, write-offs, and corrections',
          icon: Settings,
          color: 'bg-teal-500',
          stats: { label: 'Recent Adjustments', key: 'recentAdjustments' },
          value: 'stock-adjustments'
        },
        {
          id: 'warehouses',
          title: 'Locations',
          description: 'Manage warehouse locations and stock distribution',
          icon: Warehouse,
          color: 'bg-yellow-500',
          stats: { label: 'Locations', key: 'warehouseCount' },
          value: 'warehouses'
        },
        {
          id: 'reports',
          title: 'Reports',
          description: 'Inventory valuation, movement reports, and analytics',
          icon: BarChart3,
          color: 'bg-gray-500',
          stats: { label: 'Reports Available', key: 'inventoryReports' },
          value: 'reports'
        }
      ]
    },
    jobs: {
      title: 'Jobs & Projects',
      description: 'Manage projects, track costs, schedule resources, and monitor profitability',
      items: [
        {
          id: 'dashboard',
          title: 'Dashboard',
          description: 'Overview of active jobs, timelines, and performance metrics',
          icon: TrendingUp,
          color: 'bg-blue-500',
          stats: { label: 'Active Jobs', key: 'activeJobs' },
          value: 'dashboard'
        },
        {
          id: 'jobs-list',
          title: 'All Jobs',
          description: 'View and manage all jobs, projects, and work orders',
          icon: Briefcase,
          color: 'bg-green-500',
          stats: { label: 'Total Jobs', key: 'totalJobs' },
          value: 'jobs-list'
        },
        {
          id: 'job-costing',
          title: 'Job Costing',
          description: 'Track costs, budgets, and expenses for each job',
          icon: Dollar,
          color: 'bg-orange-500',
          stats: { label: 'Over Budget', key: 'overBudgetJobs' },
          value: 'job-costing'
        },
        {
          id: 'job-materials',
          title: 'Materials',
          description: 'Manage materials, supplies, and inventory usage per job',
          icon: PackageSearch,
          color: 'bg-pink-500',
          stats: { label: 'Material Requests', key: 'materialRequests' },
          value: 'job-materials'
        },
        {
          id: 'job-labor',
          title: 'Labor Tracking',
          description: 'Track employee time, labor costs, and productivity',
          icon: Clock,
          color: 'bg-indigo-500',
          stats: { label: 'Hours Today', key: 'hoursToday' },
          value: 'job-labor'
        },
        {
          id: 'job-profitability',
          title: 'Profitability',
          description: 'Analyze job margins, profitability, and performance',
          icon: TrendingDown,
          color: 'bg-teal-500',
          stats: { label: 'Avg Margin', key: 'avgMargin' },
          value: 'job-profitability'
        },
        {
          id: 'vehicles',
          title: 'Vehicles',
          description: 'Manage fleet vehicles, maintenance, and assignments',
          icon: Car,
          color: 'bg-yellow-500',
          stats: { label: 'Active Vehicles', key: 'activeVehicles' },
          value: 'vehicles'
        },
        {
          id: 'reports',
          title: 'Reports',
          description: 'Job reports, profitability analysis, and insights',
          icon: BarChart3,
          color: 'bg-gray-500',
          stats: { label: 'Reports Available', key: 'jobReports' },
          value: 'reports'
        }
      ]
    },
    payments: {
      title: 'Payments Management',
      description: 'Process payments, manage transactions, and track payment methods',
      items: [
        {
          id: 'dashboard',
          title: 'Dashboard',
          description: 'Overview of payment activity, pending payments, and cash flow',
          icon: TrendingUp,
          color: 'bg-blue-500',
          stats: { label: 'Pending Payments', key: 'pendingPayments' },
          value: 'dashboard'
        },
        {
          id: 'receive-payment',
          title: 'Receive Payment',
          description: 'Record customer payments and apply to invoices',
          icon: ArrowDownCircle,
          color: 'bg-green-500',
          stats: { label: 'Due Today', key: 'dueToday' },
          value: 'receive-payment'
        },
        {
          id: 'make-payment',
          title: 'Make Payment',
          description: 'Process vendor payments and pay bills',
          icon: Send,
          color: 'bg-purple-500',
          stats: { label: 'Bills Due', key: 'billsDue' },
          value: 'make-payment'
        },
        {
          id: 'payment-methods',
          title: 'Payment Methods',
          description: 'Manage accepted payment methods and settings',
          icon: Card,
          color: 'bg-orange-500',
          stats: { label: 'Active Methods', key: 'activeMethods' },
          value: 'payment-methods'
        },
        {
          id: 'recurring-payments',
          title: 'Recurring Payments',
          description: 'Set up and manage subscription payments',
          icon: RefreshCw,
          color: 'bg-pink-500',
          stats: { label: 'Active Subscriptions', key: 'activeSubscriptions' },
          value: 'recurring-payments'
        },
        {
          id: 'refunds',
          title: 'Refunds',
          description: 'Process refunds and payment reversals',
          icon: Undo2,
          color: 'bg-red-500',
          stats: { label: 'Pending Refunds', key: 'pendingRefunds' },
          value: 'refunds'
        },
        {
          id: 'reconciliation',
          title: 'Reconciliation',
          description: 'Match payments with bank transactions',
          icon: GitMerge,
          color: 'bg-indigo-500',
          stats: { label: 'Unreconciled', key: 'unreconciled' },
          value: 'reconciliation'
        },
        {
          id: 'payment-gateways',
          title: 'Payment Gateways',
          description: 'Configure online payment processors',
          icon: Globe,
          color: 'bg-teal-500',
          stats: { label: 'Active Gateways', key: 'activeGateways' },
          value: 'payment-gateways'
        },
        {
          id: 'reports',
          title: 'Reports',
          description: 'Payment analytics and transaction reports',
          icon: BarChart3,
          color: 'bg-gray-500',
          stats: { label: 'Reports Available', key: 'paymentReports' },
          value: 'reports'
        }
      ]
    },
    purchases: {
      title: 'Purchases Management',
      description: 'Manage vendors, purchase orders, bills, and expenses',
      items: [
        {
          id: 'dashboard',
          title: 'Dashboard',
          description: 'Overview of purchasing activity and spending',
          icon: TrendingUp,
          color: 'bg-blue-500',
          stats: { label: 'Total Spending', key: 'totalSpending' },
          value: 'dashboard'
        },
        {
          id: 'suppliers',
          title: 'Suppliers/Materials',
          description: 'Manage product suppliers and materials',
          icon: UserCheck,
          color: 'bg-green-500',
          stats: { label: 'Active Suppliers', key: 'activeSuppliers' },
          value: 'suppliers'
        },
        {
          id: 'vendors',
          title: 'Vendor Management',
          description: 'Manage vendor information and relationships',
          icon: UserCheck,
          color: 'bg-indigo-500',
          stats: { label: 'Active Vendors', key: 'activeVendors' },
          value: 'vendors'
        },
        {
          id: 'purchase-orders',
          title: 'Purchase Orders',
          description: 'Create and track purchase orders',
          icon: Cart,
          color: 'bg-purple-500',
          stats: { label: 'Open POs', key: 'openPurchaseOrders' },
          value: 'purchase-orders'
        },
        {
          id: 'bills',
          title: 'Bill Management',
          description: 'Manage vendor bills and payment schedules',
          icon: FileInvoice,
          color: 'bg-orange-500',
          stats: { label: 'Unpaid Bills', key: 'unpaidBills' },
          value: 'bills'
        },
        {
          id: 'reports',
          title: 'Reports',
          description: 'Purchasing analytics and vendor reports',
          icon: BarChart3,
          color: 'bg-gray-500',
          stats: { label: 'Reports Available', key: 'purchaseReports' },
          value: 'reports'
        }
      ]
    },
    accounting: {
      title: 'Accounting Management',
      description: 'Complete accounting system with journals, ledgers, and financial reporting',
      items: [
        {
          id: 'dashboard',
          title: 'Dashboard',
          description: 'Financial overview and key accounting metrics',
          icon: TrendingUp,
          color: 'bg-blue-500',
          stats: { label: 'Net Income', key: 'netIncome' },
          value: 'dashboard'
        },
        {
          id: 'chart-of-accounts',
          title: 'Chart of Accounts',
          description: 'Manage account structure and categories',
          icon: BookOpen,
          color: 'bg-green-500',
          stats: { label: 'Total Accounts', key: 'totalAccounts' },
          value: 'chart-of-accounts'
        },
        {
          id: 'journal-entries',
          title: 'Journal Entries',
          description: 'Record and manage journal entries',
          icon: PenTool,
          color: 'bg-purple-500',
          stats: { label: 'This Month', key: 'monthlyEntries' },
          value: 'journal-entries'
        },
        {
          id: 'general-ledger',
          title: 'General Ledger',
          description: 'View and analyze general ledger transactions',
          icon: Book,
          color: 'bg-orange-500',
          stats: { label: 'Transactions', key: 'ledgerTransactions' },
          value: 'general-ledger'
        },
        {
          id: 'reconciliation',
          title: 'Reconciliation',
          description: 'Reconcile accounts and bank statements',
          icon: CheckSquare,
          color: 'bg-pink-500',
          stats: { label: 'To Reconcile', key: 'toReconcile' },
          value: 'reconciliation'
        },
        {
          id: 'financial-statements',
          title: 'Financial Statements',
          description: 'Generate income statements, balance sheets, and cash flow',
          icon: FileCheck,
          color: 'bg-indigo-500',
          stats: { label: 'Reports Ready', key: 'reportsReady' },
          value: 'financial-statements'
        },
        {
          id: 'fixed-assets',
          title: 'Fixed Assets',
          description: 'Track depreciation and manage fixed assets',
          icon: Building,
          color: 'bg-teal-500',
          stats: { label: 'Total Assets', key: 'totalAssets' },
          value: 'fixed-assets'
        },
        {
          id: 'reports',
          title: 'Reports',
          description: 'Comprehensive accounting and financial reports',
          icon: BarChart3,
          color: 'bg-gray-500',
          stats: { label: 'Reports Available', key: 'accountingReports' },
          value: 'reports'
        }
      ]
    },
    banking: {
      title: 'Banking',
      items: [
        {
          id: 'dashboard',
          title: 'Dashboard',
          description: 'Banking overview, account balances, and cash flow',
          icon: BarChart3,
          color: 'bg-blue-500',
          stats: { label: 'Active Accounts', key: 'activeAccounts' },
          value: 'dashboard'
        },
        {
          id: 'transactions',
          title: 'Transactions',
          description: 'View and manage bank transactions',
          icon: ArrowUpDown,
          color: 'bg-green-500',
          stats: { label: 'Recent Transactions', key: 'recentTransactions' },
          value: 'transactions'
        },
        {
          id: 'reconciliation',
          title: 'Reconciliation',
          description: 'Reconcile bank statements with your records',
          icon: CheckCircle,
          color: 'bg-purple-500',
          stats: { label: 'Unreconciled', key: 'unreconciledItems' },
          value: 'reconciliation'
        },
        {
          id: 'reports',
          title: 'Reports',
          description: 'Banking reports and cash flow analysis',
          icon: FileText,
          color: 'bg-gray-500',
          stats: { label: 'Reports Available', key: 'bankingReports' },
          value: 'reports'
        }
      ]
    },
    hr: {
      title: 'Human Resources',
      items: [
        {
          id: 'dashboard',
          title: 'Dashboard',
          description: 'HR overview, team metrics, and insights',
          icon: BarChart3,
          color: 'bg-blue-500',
          stats: { label: 'Active Employees', key: 'activeEmployees' },
          value: 'dashboard'
        },
        {
          id: 'teams',
          title: 'Employees',
          description: 'Manage employees and team structure',
          icon: Users,
          color: 'bg-green-500',
          stats: { label: 'Total Employees', key: 'totalEmployees' },
          value: 'teams'
        },
        {
          id: 'timesheets',
          title: 'Timesheets',
          description: 'Track and approve employee work hours',
          icon: Clock,
          color: 'bg-orange-500',
          stats: { label: 'Pending Approval', key: 'pendingTimesheets' },
          value: 'timesheets'
        },
        {
          id: 'manage-pay',
          title: 'Manage Pay',
          description: 'Set up pay rates, deductions, and benefits',
          icon: DollarSign,
          color: 'bg-purple-500',
          stats: { label: 'Pay Schedules', key: 'paySchedules' },
          value: 'manage-pay'
        },
        {
          id: 'benefits',
          title: 'Benefits',
          description: 'Manage employee benefits and enrollments',
          icon: Heart,
          color: 'bg-pink-500',
          stats: { label: 'Active Benefits', key: 'activeBenefits' },
          value: 'benefits'
        },
        {
          id: 'performance',
          title: 'Performance',
          description: 'Track employee performance and reviews',
          icon: TrendingUp,
          color: 'bg-indigo-500',
          stats: { label: 'Reviews Due', key: 'reviewsDue' },
          value: 'performance'
        },
        {
          id: 'reports',
          title: 'Reports',
          description: 'HR analytics and compliance reports',
          icon: FileText,
          color: 'bg-gray-500',
          stats: { label: 'Reports Available', key: 'hrReports' },
          value: 'reports'
        }
      ]
    },
    payroll: {
      title: 'Payroll',
      items: [
        {
          id: 'dashboard',
          title: 'Dashboard',
          description: 'Payroll overview and upcoming runs',
          icon: BarChart3,
          color: 'bg-blue-500',
          stats: { label: 'Next Payroll', key: 'nextPayrollDate' },
          value: 'dashboard'
        },
        {
          id: 'process-payroll',
          title: 'Process Payroll',
          description: 'Run payroll wizard and process payments',
          icon: Play,
          color: 'bg-green-500',
          stats: { label: 'Employees to Pay', key: 'employeesToPay' },
          value: 'process-payroll'
        },
        {
          id: 'transactions',
          title: 'Transactions',
          description: 'View payroll history and transactions',
          icon: List,
          color: 'bg-purple-500',
          stats: { label: 'Last Payroll', key: 'lastPayrollAmount' },
          value: 'transactions'
        },
        {
          id: 'reports',
          title: 'Reports',
          description: 'Payroll reports, tax forms, and analytics',
          icon: FileText,
          color: 'bg-gray-500',
          stats: { label: 'Reports Available', key: 'payrollReports' },
          value: 'reports'
        }
      ]
    },
    taxes: {
      title: 'Taxes',
      items: [
        {
          id: 'dashboard',
          title: 'Dashboard',
          description: 'Tax overview and compliance status',
          icon: BarChart3,
          color: 'bg-blue-500',
          stats: { label: 'Tax Liabilities', key: 'taxLiabilities' },
          value: 'dashboard'
        },
        {
          id: 'sales-tax',
          title: 'Sales Tax Filing',
          description: 'Manage and file sales tax returns',
          icon: Receipt,
          color: 'bg-green-500',
          stats: { label: 'Returns Due', key: 'returnsDue' },
          value: 'sales-tax'
        },
        {
          id: 'file-return',
          title: 'File Tax Return',
          description: 'Prepare and submit tax returns',
          icon: Send,
          color: 'bg-purple-500',
          stats: { label: 'Pending Filings', key: 'pendingFilings' },
          value: 'file-return'
        },
        {
          id: 'filing-history',
          title: 'Filing History',
          description: 'View past tax filings and documents',
          icon: History,
          color: 'bg-orange-500',
          stats: { label: 'Filed This Year', key: 'filedThisYear' },
          value: 'filing-history'
        }
      ]
    }
  };

  useEffect(() => {
    fetchItemStats();
    loadUsageFrequency();
  }, [menuSection]);

  const fetchItemStats = async () => {
    try {
      setLoadingStats(true);
      console.log(`[MenuOverviewGrid] Fetching stats for section: ${menuSection}`);
      const response = await fetch(`/api/menu/stats?section=${menuSection}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`[MenuOverviewGrid] Stats fetched for ${menuSection}:`, data);
        setItemStats(data);
      } else {
        console.warn(`[MenuOverviewGrid] Failed to fetch stats, status: ${response.status}`);
        // Set empty stats instead of mock data - shows real state
        setItemStats({});
      }
    } catch (error) {
      console.error('[MenuOverviewGrid] Error fetching menu item stats:', error);
      // Set empty stats on error - shows real state
      setItemStats({});
    } finally {
      setLoadingStats(false);
    }
  };

  const loadUsageFrequency = () => {
    const stored = localStorage.getItem('menuUsageFrequency');
    if (stored) {
      setUsageFrequency(JSON.parse(stored));
    }
  };

  const trackUsage = (itemId) => {
    const current = { ...usageFrequency };
    current[itemId] = (current[itemId] || 0) + 1;
    setUsageFrequency(current);
    localStorage.setItem('menuUsageFrequency', JSON.stringify(current));
  };

  const handleItemClick = (item) => {
    trackUsage(item.id);
    if (onItemClick) {
      onItemClick(item.value);
    }
  };

  const getUsageBadge = (itemId) => {
    const frequency = usageFrequency[itemId] || 0;
    const maxFrequency = Math.max(...Object.values(usageFrequency), 1);
    
    if (frequency === maxFrequency && frequency > 5) {
      return { text: 'Most Used', color: 'bg-green-100 text-green-800' };
    }
    if (frequency > 10) {
      return { text: 'Frequently Used', color: 'bg-blue-100 text-blue-800' };
    }
    if (frequency === 0) {
      return { text: 'New', color: 'bg-purple-100 text-purple-800' };
    }
    return null;
  };

  const config = menuConfigurations[menuSection];
  
  if (!config) {
    return null;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {config.title}
        </h1>
        <p className="text-gray-600 mt-2">
          {config.description}
        </p>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        {config.items.map((item) => {
          const Icon = item.icon;
          const badge = getUsageBadge(item.id);
          const statValue = itemStats[item.stats?.key];

          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              className="relative group bg-white rounded-lg shadow-sm hover:shadow-lg transition-all duration-200 p-2 sm:p-3 md:p-4 lg:p-6 text-left border border-gray-200 hover:border-blue-500 flex flex-col h-[140px] sm:h-[160px] md:h-[180px] lg:h-[220px] overflow-hidden"
            >
              {badge && (
                <span className={`absolute top-1 right-1 px-1 py-0.5 text-[8px] sm:text-[10px] md:text-xs font-medium rounded-full ${badge.color} z-10 max-w-[60px] truncate`}>
                  {badge.text}
                </span>
              )}

              <div className="flex flex-col h-full">
                <div className={`inline-flex p-1.5 sm:p-2 md:p-2.5 lg:p-3 rounded-lg ${item.color} bg-opacity-10 mb-1.5 sm:mb-2 md:mb-3 self-start flex-shrink-0`}>
                  <Icon className={`w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 ${item.color.replace('bg-', 'text-')}`} />
                </div>

                <h3 className="text-xs sm:text-sm md:text-base lg:text-lg font-semibold text-gray-900 mb-0.5 sm:mb-1 md:mb-2 line-clamp-1 flex-shrink-0">
                  {item.title}
                </h3>

                <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 mb-1 sm:mb-2 md:mb-3 line-clamp-2 flex-grow min-h-0">
                  {item.description}
                </p>

                {item.stats && (
                  <div className="pt-1 sm:pt-1.5 md:pt-2 lg:pt-3 border-t border-gray-200 mt-auto flex-shrink-0">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-0.5">
                      <span className="text-[8px] sm:text-[10px] md:text-xs text-gray-500 line-clamp-1">
                        {item.stats.label}
                      </span>
                      <span className="text-[10px] sm:text-xs md:text-sm font-semibold text-gray-900">
                        {loadingStats ? (
                          <span className="inline-block w-6 sm:w-8 md:w-12 h-2 sm:h-3 md:h-4 bg-gray-200 rounded animate-pulse"></span>
                        ) : (
                          statValue !== undefined ? statValue : '0'
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="absolute inset-0 rounded-lg ring-2 ring-blue-500 ring-opacity-0 group-hover:ring-opacity-100 transition-all duration-200 pointer-events-none" />
            </button>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-700">
          💡 <strong>Tip:</strong> Click on any card to access that feature. Your most frequently used features will be marked for quick access.
        </p>
      </div>
    </div>
  );
};

export default MenuOverviewGrid;