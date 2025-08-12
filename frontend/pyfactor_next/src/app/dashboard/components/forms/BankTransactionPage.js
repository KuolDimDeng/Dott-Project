'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { CenteredSpinner } from '@/components/ui/StandardSpinner';
import { 
  BanknotesIcon,
  CalendarIcon,
  ChevronDownIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  CreditCardIcon,
  BuildingLibraryIcon
} from '@heroicons/react/24/outline';
import { format, parseISO, subDays, startOfMonth, endOfMonth } from 'date-fns';

/**
 * Bank Transactions Page
 * Displays transactions from connected bank accounts
 */
export default function BankTransactionPage() {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connectedAccounts, setConnectedAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [dateRange, setDateRange] = useState({
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date())
  });
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');

  // Fetch connected bank accounts
  const fetchConnectedAccounts = useCallback(async () => {
    try {
      const response = await fetch('/api/banking/connections', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        const accounts = data.connections || [];
        setConnectedAccounts(accounts);
        
        // Auto-select first account if available
        if (accounts.length > 0 && !selectedAccount) {
          setSelectedAccount(accounts[0]);
        }
      } else {
        console.error('Failed to fetch connected accounts');
      }
    } catch (error) {
      console.error('Error fetching connected accounts:', error);
      toast.error('Failed to load bank accounts');
    }
  }, [selectedAccount]);

  // Fetch transactions for selected account
  const fetchTransactions = useCallback(async () => {
    if (!selectedAccount) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        account_id: selectedAccount.id,
        start_date: format(dateRange.startDate, 'yyyy-MM-dd'),
        end_date: format(dateRange.endDate, 'yyyy-MM-dd')
      });

      const response = await fetch(`/api/banking/transactions?${params}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions || []);
      } else {
        toast.error('Failed to fetch transactions');
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [selectedAccount, dateRange]);

  // Sync transactions from bank
  const syncTransactions = async () => {
    if (!selectedAccount) {
      toast.error('Please select a bank account first');
      return;
    }

    setSyncing(true);
    try {
      const response = await fetch('/api/banking/sync-transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          account_id: selectedAccount.id
        })
      });

      if (response.ok) {
        toast.success('Transactions synced successfully');
        await fetchTransactions();
      } else {
        toast.error('Failed to sync transactions');
      }
    } catch (error) {
      console.error('Error syncing transactions:', error);
      toast.error('Failed to sync transactions');
    } finally {
      setSyncing(false);
    }
  };

  // Download transactions
  const downloadTransactions = async () => {
    if (!selectedAccount) {
      toast.error('Please select a bank account first');
      return;
    }

    try {
      const params = new URLSearchParams({
        account_id: selectedAccount.id,
        start_date: format(dateRange.startDate, 'yyyy-MM-dd'),
        end_date: format(dateRange.endDate, 'yyyy-MM-dd'),
        format: 'csv'
      });

      const response = await fetch(`/api/banking/download-transactions?${params}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transactions_${selectedAccount.bank_name}_${format(new Date(), 'yyyyMMdd')}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Transactions downloaded');
      } else {
        toast.error('Failed to download transactions');
      }
    } catch (error) {
      console.error('Error downloading transactions:', error);
      toast.error('Failed to download transactions');
    }
  };

  // Initial load
  useEffect(() => {
    fetchConnectedAccounts();
  }, []);

  // Load transactions when account changes
  useEffect(() => {
    if (selectedAccount) {
      fetchTransactions();
    }
  }, [selectedAccount, fetchTransactions]);

  // Filter and sort transactions
  const filteredTransactions = transactions
    .filter(transaction => {
      // Filter by type
      if (filter === 'income' && transaction.amount <= 0) return false;
      if (filter === 'expense' && transaction.amount >= 0) return false;
      
      // Filter by search term
      if (searchTerm && !transaction.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !transaction.merchant_name?.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.date) - new Date(a.date);
        case 'date-asc':
          return new Date(a.date) - new Date(b.date);
        case 'amount-desc':
          return Math.abs(b.amount) - Math.abs(a.amount);
        case 'amount-asc':
          return Math.abs(a.amount) - Math.abs(b.amount);
        default:
          return 0;
      }
    });

  // Calculate totals
  const totals = filteredTransactions.reduce((acc, transaction) => {
    if (transaction.amount > 0) {
      acc.income += transaction.amount;
    } else {
      acc.expense += Math.abs(transaction.amount);
    }
    return acc;
  }, { income: 0, expense: 0 });

  if (loading && !connectedAccounts.length) {
    return <CenteredSpinner />;
  }

  if (!connectedAccounts.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <BuildingLibraryIcon className="h-16 w-16 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Bank Accounts Connected</h3>
        <p className="text-gray-500 text-center mb-4">
          Connect your bank account to view and manage transactions
        </p>
        <button
          onClick={() => window.location.href = '/Settings/banking'}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Connect Bank Account
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <BanknotesIcon className="h-6 w-6 text-gray-600" />
            <h1 className="text-xl font-semibold text-gray-900">Bank Transactions</h1>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={syncTransactions}
              disabled={syncing || !selectedAccount}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowPathIcon className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync'}
            </button>
            <button
              onClick={downloadTransactions}
              disabled={!selectedAccount || !filteredTransactions.length}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              Download
            </button>
          </div>
        </div>
      </div>

      {/* Account Selector and Filters */}
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Account Selector */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Bank Account</label>
            <select
              value={selectedAccount?.id || ''}
              onChange={(e) => {
                const account = connectedAccounts.find(acc => acc.id === e.target.value);
                setSelectedAccount(account);
              }}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              {connectedAccounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.bank_name} - ****{account.last4}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="flex items-center space-x-2">
            <CalendarIcon className="h-5 w-5 text-gray-400" />
            <input
              type="date"
              value={format(dateRange.startDate, 'yyyy-MM-dd')}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: parseISO(e.target.value) }))}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={format(dateRange.endDate, 'yyyy-MM-dd')}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: parseISO(e.target.value) }))}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          {/* Filter */}
          <div className="flex items-center space-x-2">
            <FunnelIcon className="h-5 w-5 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="all">All Transactions</option>
              <option value="income">Income Only</option>
              <option value="expense">Expenses Only</option>
            </select>
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="date-desc">Date (Newest)</option>
            <option value="date-asc">Date (Oldest)</option>
            <option value="amount-desc">Amount (Highest)</option>
            <option value="amount-asc">Amount (Lowest)</option>
          </select>

          {/* Search */}
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[200px] rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        {/* Totals */}
        <div className="flex items-center space-x-6 mt-4">
          <div className="flex items-center">
            <span className="text-sm font-medium text-gray-500 mr-2">Income:</span>
            <span className="text-sm font-semibold text-green-600">
              ${totals.income.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center">
            <span className="text-sm font-medium text-gray-500 mr-2">Expenses:</span>
            <span className="text-sm font-semibold text-red-600">
              ${totals.expense.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center">
            <span className="text-sm font-medium text-gray-500 mr-2">Net:</span>
            <span className={`text-sm font-semibold ${totals.income - totals.expense >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${(totals.income - totals.expense).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <CenteredSpinner />
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <DocumentTextIcon className="h-12 w-12 text-gray-400 mb-3" />
            <p className="text-gray-500">No transactions found</p>
            <p className="text-sm text-gray-400 mt-1">Try adjusting your filters or date range</p>
          </div>
        ) : (
          <div className="bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(parseISO(transaction.date), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{transaction.name}</div>
                        {transaction.merchant_name && (
                          <div className="text-gray-500">{transaction.merchant_name}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {transaction.category?.join(', ') || 'Uncategorized'}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                      transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.amount > 0 ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        transaction.pending 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {transaction.pending ? 'Pending' : 'Posted'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}