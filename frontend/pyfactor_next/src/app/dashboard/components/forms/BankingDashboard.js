'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { bankAccountsApi, bankTransactionsApi, bankingReportsApi } from '@/services/api/banking';
import { logger } from '@/utils/logger';
import { getSecureTenantId } from '@/utils/tenantUtils';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import Link from 'next/link';
import { 
  BanknotesIcon, 
  ArrowsRightLeftIcon, 
  ArrowDownTrayIcon, 
  MagnifyingGlassIcon,
  QuestionMarkCircleIcon,
  LinkIcon,
  CreditCardIcon,
  CheckCircleIcon,
  BuildingLibraryIcon,
  ScaleIcon,
  ChartBarIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

import StandardSpinner, { CenteredSpinner } from '@/components/ui/StandardSpinner';
// Tooltip component for field help
const FieldTooltip = ({ text }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  return (
    <div className="relative inline-block ml-1">
      <QuestionMarkCircleIcon 
        className="h-4 w-4 text-gray-400 cursor-help hover:text-gray-600"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      />
      {isVisible && (
        <div className="absolute z-10 w-64 p-2 text-xs text-white bg-gray-900 rounded-md shadow-lg -top-2 left-6">
          <div className="relative">
            {text}
            <div className="absolute w-2 h-2 bg-gray-900 rotate-45 -left-1 top-2"></div>
          </div>
        </div>
      )}
    </div>
  );
};

const BankingDashboard = () => {
  const [tenantId, setTenantId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  
  // Dashboard metrics state
  const [metrics, setMetrics] = useState({
    accounts: { total: 0, connected: 0, totalBalance: 0, avgBalance: 0 },
    transactions: { total: 0, thisMonth: 0, totalValue: 0, avgAmount: 0 },
    reconciliation: { pending: 0, completed: 0, discrepancies: 0, lastDate: null },
    cashFlow: { incoming: 0, outgoing: 0, netFlow: 0, projection: 0 }
  });

  // Recent items for quick access
  const [recentItems, setRecentItems] = useState({
    accounts: [],
    transactions: [],
    reconciliations: [],
    reports: []
  });

  // Chart data
  const [chartData, setChartData] = useState({
    balanceTrend: [],
    transactionTrend: [],
    categoryBreakdown: [],
    cashFlowTrend: []
  });

  // Fetch all dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      logger.info('[BankingDashboard] Fetching dashboard data...');
      
      // Fetch all data in parallel
      const [
        accountsRes,
        transactionsRes,
        reportsRes
      ] = await Promise.allSettled([
        bankAccountsApi.getAll(),
        bankTransactionsApi.getAll(),
        bankingReportsApi.getAccountBalances()
      ]);

      // Process bank accounts
      if (accountsRes.status === 'fulfilled') {
        const accountsData = accountsRes.value?.data || {};
        const accounts = Array.isArray(accountsData) ? accountsData : (accountsData.accounts || []);
        const connectedAccounts = accounts.filter(a => a.status === 'connected' || a.is_active !== false);
        const totalBalance = accounts.reduce((sum, a) => sum + (parseFloat(a.balances?.current || a.balance || 0)), 0);
        const avgBalance = accounts.length > 0 ? totalBalance / accounts.length : 0;
        
        setMetrics(prev => ({
          ...prev,
          accounts: {
            total: accounts.length,
            connected: connectedAccounts.length,
            totalBalance: totalBalance,
            avgBalance: avgBalance
          }
        }));

        // Get recent accounts
        setRecentItems(prev => ({
          ...prev,
          accounts: accounts.slice(0, 5).map(account => ({
            id: account.account_id || account.id,
            name: account.name,
            balance: account.balances?.current || account.balance || 0,
            type: account.type || 'checking',
            status: account.status || 'active',
            lastSync: account.last_sync || account.updated_at
          }))
        }));
      }

      // Process transactions
      if (transactionsRes.status === 'fulfilled') {
        const transactionsData = transactionsRes.value?.data || {};
        const transactions = Array.isArray(transactionsData) ? transactionsData : (transactionsData.transactions || []);
        const thisMonth = new Date();
        thisMonth.setDate(1);
        const monthlyTransactions = transactions.filter(t => new Date(t.date) >= thisMonth);
        const totalValue = transactions.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount || 0)), 0);
        const avgAmount = transactions.length > 0 ? totalValue / transactions.length : 0;
        
        // Calculate cash flow
        const incoming = transactions.filter(t => parseFloat(t.amount || 0) > 0).reduce((sum, t) => sum + parseFloat(t.amount), 0);
        const outgoing = transactions.filter(t => parseFloat(t.amount || 0) < 0).reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);
        
        setMetrics(prev => ({
          ...prev,
          transactions: {
            total: transactions.length,
            thisMonth: monthlyTransactions.length,
            totalValue: totalValue,
            avgAmount: avgAmount
          },
          cashFlow: {
            incoming: incoming,
            outgoing: outgoing,
            netFlow: incoming - outgoing,
            projection: (incoming - outgoing) * 12 // Annual projection
          }
        }));

        // Get recent transactions
        setRecentItems(prev => ({
          ...prev,
          transactions: transactions.slice(0, 10).map(transaction => ({
            id: transaction.id,
            description: transaction.description || transaction.name,
            amount: transaction.amount,
            date: transaction.date,
            type: transaction.type || 'transaction',
            category: transaction.category || 'general',
            status: transaction.status || 'posted'
          }))
        }));
      }

      // Mock reconciliation data (would come from actual API)
      setMetrics(prev => ({
        ...prev,
        reconciliation: {
          pending: 3,
          completed: 12,
          discrepancies: 1,
          lastDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
        }
      }));

      // Mock recent reconciliations
      setRecentItems(prev => ({
        ...prev,
        reconciliations: [
          { id: 1, account: 'Business Checking', date: new Date(), status: 'completed', difference: 0 },
          { id: 2, account: 'Savings Account', date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), status: 'pending', difference: 25.50 },
          { id: 3, account: 'Credit Card', date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), status: 'discrepancy', difference: -15.00 }
        ]
      }));

      logger.info('[BankingDashboard] Dashboard data loaded successfully');
    } catch (error) {
      logger.error('[BankingDashboard] Error fetching dashboard data:', error);
      toast.error('Failed to load banking dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, [selectedPeriod]);

  // Fetch tenant ID on mount
  useEffect(() => {
    const fetchTenantId = async () => {
      const id = await getSecureTenantId();
      setTenantId(id);
    };
    fetchTenantId();
  }, []);

  useEffect(() => {
    if (tenantId) {
      fetchDashboardData();
    }
  }, [fetchDashboardData, tenantId]);

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
                  {item.name || item.description || item.account}
                </p>
                <p className="text-xs text-gray-500">
                  {item.type || item.category || item.status}
                </p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-medium ${
                  item.amount ? (item.amount > 0 ? 'text-green-600' : 'text-red-600') : 'text-gray-900'
                }`}>
                  {item.amount ? formatCurrency(item.amount) : item.balance ? formatCurrency(item.balance) : ''}
                </p>
                <p className="text-xs text-gray-500">
                  {item.date ? format(new Date(item.date), 'MMM dd') : 
                   item.lastSync ? format(new Date(item.lastSync), 'MMM dd') : ''}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  // Wait for tenant ID to load
  if (!tenantId) {
    return (
      <div className="flex justify-center items-center h-64">
        <CenteredSpinner size="medium" />
      </div>
    );
  }

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
          <BanknotesIcon className="h-6 w-6 text-blue-600 mr-2" />
          Banking Dashboard
        </h1>
        <p className="text-gray-600">Comprehensive overview of your banking accounts, transactions, and cash flow</p>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Bank Accounts"
          value={metrics.accounts.total}
          subValue={`${metrics.accounts.connected} connected`}
          icon={<BuildingLibraryIcon className="h-7 w-7" />}
          color="blue"
        />
        <MetricCard
          title="Total Balance"
          value={formatCurrency(metrics.accounts.totalBalance)}
          subValue={`Avg: ${formatCurrency(metrics.accounts.avgBalance)}`}
          icon={<BanknotesIcon className="h-7 w-7" />}
          color="green"
        />
        <MetricCard
          title="Transactions"
          value={metrics.transactions.total}
          subValue={`${metrics.transactions.thisMonth} this month`}
          icon={<ArrowsRightLeftIcon className="h-7 w-7" />}
          color="purple"
        />
        <MetricCard
          title="Reconciliations"
          value={metrics.reconciliation.completed}
          subValue={`${metrics.reconciliation.pending} pending`}
          icon={<ScaleIcon className="h-7 w-7" />}
          color="yellow"
        />
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <ArrowsRightLeftIcon className="h-5 w-5 mr-2 text-green-600" />
            Cash Flow Overview
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Money In</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(metrics.cashFlow.incoming)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Money Out</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(metrics.cashFlow.outgoing)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Net Flow</p>
              <p className={`text-xl font-semibold ${metrics.cashFlow.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(metrics.cashFlow.netFlow)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <ChartBarIcon className="h-5 w-5 mr-2 text-blue-600" />
            Account Summary
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Connected Accounts</span>
              <span className="text-sm font-semibold text-blue-600">{metrics.accounts.connected}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Balance</span>
              <span className="text-sm font-semibold text-green-600">{formatCurrency(metrics.accounts.totalBalance)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Recent Transactions</span>
              <span className="text-sm font-semibold text-purple-600">{metrics.transactions.thisMonth}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Pending Reconciliations</span>
              <span className="text-sm font-semibold text-yellow-600">{metrics.reconciliation.pending}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <ScaleIcon className="h-5 w-5 mr-2 text-purple-600" />
            Reconciliation Status
          </h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-600">Completion Rate</span>
                <span className="text-sm font-semibold">
                  {metrics.reconciliation.completed + metrics.reconciliation.pending > 0 
                    ? `${Math.round((metrics.reconciliation.completed / (metrics.reconciliation.completed + metrics.reconciliation.pending)) * 100)}%`
                    : '0%'}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full"
                  style={{ 
                    width: `${metrics.reconciliation.completed + metrics.reconciliation.pending > 0 
                      ? (metrics.reconciliation.completed / (metrics.reconciliation.completed + metrics.reconciliation.pending)) * 100 
                      : 0}%` 
                  }}
                ></div>
              </div>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Last Reconciliation</p>
              <p className="text-sm font-medium">
                {metrics.reconciliation.lastDate 
                  ? format(metrics.reconciliation.lastDate, 'MMM dd, yyyy') 
                  : 'Not available'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <RecentItemsList 
          title={<span className="flex items-center"><BuildingLibraryIcon className="h-5 w-5 mr-2 text-blue-600" />Bank Accounts</span>} 
          items={recentItems.accounts} 
          type="accounts"
        />
        <RecentItemsList 
          title={<span className="flex items-center"><ArrowsRightLeftIcon className="h-5 w-5 mr-2 text-purple-600" />Recent Transactions</span>} 
          items={recentItems.transactions} 
          type="transactions"
        />
        <RecentItemsList 
          title={<span className="flex items-center"><ScaleIcon className="h-5 w-5 mr-2 text-yellow-600" />Reconciliations</span>} 
          items={recentItems.reconciliations} 
          type="reconciliations"
        />
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <LinkIcon className="h-5 w-5 mr-2 text-indigo-600" />
            Connection Status
          </h3>
          <div className="space-y-3">
            {metrics.accounts.connected > 0 ? (
              <div className="flex items-center text-green-600">
                <CheckCircleIcon className="h-5 w-5 mr-2" />
                <span className="text-sm font-medium">Banks Connected</span>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm mb-2">No banks connected</p>
                <Link 
                  href="/connect-bank" 
                  className="inline-flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <LinkIcon className="h-4 w-4 mr-1" />
                  Connect Bank
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <PlusIcon className="h-5 w-5 mr-2 text-blue-600" />
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <button className="p-4 text-center border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors group">
            <LinkIcon className="h-8 w-8 mb-2 mx-auto text-gray-400 group-hover:text-blue-600 transition-colors" />
            <span className="text-sm text-gray-700">Connect Bank</span>
          </button>
          <button className="p-4 text-center border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors group">
            <ArrowsRightLeftIcon className="h-8 w-8 mb-2 mx-auto text-gray-400 group-hover:text-purple-600 transition-colors" />
            <span className="text-sm text-gray-700">View Transactions</span>
          </button>
          <button className="p-4 text-center border-2 border-dashed border-gray-300 rounded-lg hover:border-yellow-500 hover:bg-yellow-50 transition-colors group">
            <ScaleIcon className="h-8 w-8 mb-2 mx-auto text-gray-400 group-hover:text-yellow-600 transition-colors" />
            <span className="text-sm text-gray-700">Reconcile</span>
          </button>
          <button className="p-4 text-center border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors group">
            <ArrowDownTrayIcon className="h-8 w-8 mb-2 mx-auto text-gray-400 group-hover:text-green-600 transition-colors" />
            <span className="text-sm text-gray-700">Download</span>
          </button>
          <button className="p-4 text-center border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors group">
            <ChartBarIcon className="h-8 w-8 mb-2 mx-auto text-gray-400 group-hover:text-indigo-600 transition-colors" />
            <span className="text-sm text-gray-700">Reports</span>
          </button>
          <button className="p-4 text-center border-2 border-dashed border-gray-300 rounded-lg hover:border-pink-500 hover:bg-pink-50 transition-colors group">
            <CreditCardIcon className="h-8 w-8 mb-2 mx-auto text-gray-400 group-hover:text-pink-600 transition-colors" />
            <span className="text-sm text-gray-700">Payment Gateway</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BankingDashboard;
