'use client';

import React, { useState, useEffect } from 'react';
import { logger } from '@/utils/logger';
import { useBankAccounts } from '@/hooks/useBankAccounts';
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
  PlusIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

import { CenteredSpinner } from '@/components/ui/StandardSpinner';

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
  const {
    accounts,
    loading,
    error,
    hasConnectedAccounts,
    totalBalance,
    activeAccountsCount,
    getActiveAccounts,
    formatBalance,
    refreshAccounts,
    syncAccount
  } = useBankAccounts();

  const [dashboardData, setDashboardData] = useState({
    totalCashFlow: 0,
    monthlyInflow: 0,
    monthlyOutflow: 0,
    recentTransactions: [],
    accountSummary: []
  });
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (!loading && hasConnectedAccounts) {
      loadDashboardData();
    } else if (!loading) {
      setIsLoadingDashboard(false);
    }
  }, [loading, hasConnectedAccounts]);

  const loadDashboardData = async () => {
    logger.info('🎯 [BankingDashboard] === LOADING DASHBOARD DATA ===');
    setIsLoadingDashboard(true);

    try {
      // In a real app, this would fetch from your banking API
      // For now, we'll use the connected accounts data
      const activeAccounts = getActiveAccounts();
      
      const mockDashboardData = {
        totalCashFlow: totalBalance,
        monthlyInflow: totalBalance * 0.3, // Mock calculation
        monthlyOutflow: totalBalance * 0.2, // Mock calculation
        recentTransactions: [
          {
            id: 1,
            description: 'Customer Payment - ABC Corp',
            amount: 2500,
            type: 'credit',
            date: new Date().toISOString(),
            account: activeAccounts[0]?.displayName || 'Primary Account'
          },
          {
            id: 2,
            description: 'Vendor Payment - Office Supplies',
            amount: -850,
            type: 'debit',
            date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            account: activeAccounts[0]?.displayName || 'Primary Account'
          },
          {
            id: 3,
            description: 'Payroll Processing',
            amount: -15000,
            type: 'debit',
            date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            account: activeAccounts[0]?.displayName || 'Primary Account'
          }
        ],
        accountSummary: activeAccounts.map(account => ({
          ...account,
          transactionCount: Math.floor(Math.random() * 50) + 10,
          lastTransaction: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
        }))
      };

      setDashboardData(mockDashboardData);
      logger.info('🎯 [BankingDashboard] Dashboard data loaded successfully');
    } catch (err) {
      logger.error('🎯 [BankingDashboard] Error loading dashboard data:', err);
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  const handleSyncAllAccounts = async () => {
    logger.info('🎯 [BankingDashboard] === SYNCING ALL ACCOUNTS ===');
    setIsSyncing(true);

    try {
      const activeAccounts = getActiveAccounts();
      const syncPromises = activeAccounts.map(account => syncAccount(account.id));
      
      await Promise.all(syncPromises);
      await loadDashboardData(); // Refresh dashboard data
      
      logger.info('🎯 [BankingDashboard] All accounts synced successfully');
    } catch (err) {
      logger.error('🎯 [BankingDashboard] Error syncing accounts:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  if (loading || isLoadingDashboard) {
    return <CenteredSpinner size="large" />;
  }

  if (!hasConnectedAccounts) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
            <BuildingLibraryIcon className="h-6 w-6 text-blue-600 mr-2" />
            Banking Dashboard
          </h1>
          <p className="text-gray-600 text-sm">Monitor your business banking activities and cash flow in real-time.</p>
        </div>

        {/* No Accounts Connected State */}
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <BuildingLibraryIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No bank accounts connected</h3>
          <p className="mt-1 text-sm text-gray-500">
            Connect your bank accounts to view your cash flow, transactions, and financial overview.
          </p>
          <div className="mt-6">
            <Link
              href="/Settings?tab=banking"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Connect Bank Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
            <BuildingLibraryIcon className="h-6 w-6 text-blue-600 mr-2" />
            Banking Dashboard
          </h1>
          <p className="text-gray-600 text-sm">
            Real-time overview of your connected bank accounts and cash flow activities.
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleSyncAllAccounts}
            disabled={isSyncing}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <ArrowsRightLeftIcon className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync All'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BanknotesIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Cash Balance</dt>
                  <dd className="text-lg font-semibold text-gray-900">{formatBalance(dashboardData.totalCashFlow)}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ArrowDownTrayIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Monthly Inflow</dt>
                  <dd className="text-lg font-semibold text-gray-900">{formatBalance(dashboardData.monthlyInflow)}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ArrowsRightLeftIcon className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Monthly Outflow</dt>
                  <dd className="text-lg font-semibold text-gray-900">{formatBalance(dashboardData.monthlyOutflow)}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BuildingLibraryIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Connected Accounts</dt>
                  <dd className="text-lg font-semibold text-gray-900">{activeAccountsCount}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Connected Accounts Overview */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Connected Bank Accounts</h3>
          <div className="space-y-4">
            {dashboardData.accountSummary.map((account) => (
              <div key={account.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{account.bankName}</p>
                    <p className="text-sm text-gray-500">{account.maskedAccountNumber} • {account.accountType}</p>
                    <p className="text-xs text-gray-400">
                      {account.transactionCount} transactions • Last sync: {new Date(account.lastSync).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{formatBalance(account.balance)}</p>
                  <p className="text-xs text-gray-500">{account.provider}</p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4">
            <Link
              href="/Settings?tab=banking"
              className="text-sm text-blue-600 hover:text-blue-500 font-medium"
            >
              Manage bank connections →
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Transactions</h3>
            <Link
              href="/dashboard/components/forms/BankTransactionPage"
              className="text-sm text-blue-600 hover:text-blue-500 font-medium"
            >
              View all →
            </Link>
          </div>
          
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dashboardData.recentTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {transaction.account}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(transaction.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-medium ${
                        transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'credit' ? '+' : ''}{formatBalance(transaction.amount)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href="/dashboard/components/forms/BankTransactionPage"
              className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
              View Transactions
            </Link>
            
            <Link
              href="/dashboard/components/forms/BankReconciliation"
              className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <ScaleIcon className="h-4 w-4 mr-2" />
              Reconciliation
            </Link>
            
            <Link
              href="/dashboard/components/forms/BankReport"
              className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <ChartBarIcon className="h-4 w-4 mr-2" />
              Reports
            </Link>
            
            <Link
              href="/Settings?tab=banking"
              className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <LinkIcon className="h-4 w-4 mr-2" />
              Manage Accounts
            </Link>
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-500 text-center">
        Debug: Connected Accounts: {activeAccountsCount} | Total Balance: {formatBalance(totalBalance)} | Component: BankingDashboard Enhanced
      </div>
    </div>
  );
};

export default BankingDashboard;