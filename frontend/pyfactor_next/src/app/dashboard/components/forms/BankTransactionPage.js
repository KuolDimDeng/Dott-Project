import React, { useState, useEffect, useCallback } from 'react';
import { bankAccountsApi, bankTransactionsApi, plaidApi } from '@/services/api/banking';
import { logger } from '@/utils/logger';
import { getSecureTenantId } from '@/utils/tenantUtils';
import { CenteredSpinner } from '@/components/ui/StandardSpinner';
import { toast } from 'react-hot-toast';
import { 
  ArrowsRightLeftIcon,
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  QuestionMarkCircleIcon,
  CurrencyDollarIcon,
  ClockIcon,
  BuildingLibraryIcon,
  ArrowPathIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  TagIcon
} from '@heroicons/react/24/outline';

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

const BankTransactionPage = () => {
  const [tenantId, setTenantId] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc');
  
  // Filter and sort transactions
  const processedTransactions = React.useMemo(() => {
    let filtered = [...transactions];
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.merchant_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category?.join(' ').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(t => 
        t.category?.includes(categoryFilter) || 
        t.personal_finance_category?.primary === categoryFilter
      );
    }
    
    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date_desc':
          return new Date(b.date) - new Date(a.date);
        case 'date_asc':
          return new Date(a.date) - new Date(b.date);
        case 'amount_desc':
          return Math.abs(b.amount) - Math.abs(a.amount);
        case 'amount_asc':
          return Math.abs(a.amount) - Math.abs(b.amount);
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [transactions, searchTerm, categoryFilter, sortBy]);

  // Stats for summary cards
  const stats = {
    totalTransactions: processedTransactions.length,
    totalAmount: processedTransactions.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0),
    positiveTransactions: processedTransactions.filter(t => (t.amount || 0) > 0).length,
    negativeTransactions: processedTransactions.filter(t => (t.amount || 0) < 0).length,
    incoming: processedTransactions.filter(t => (t.amount || 0) > 0).reduce((sum, t) => sum + t.amount, 0),
    outgoing: processedTransactions.filter(t => (t.amount || 0) < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0)
  };

  // Get unique categories
  const categories = React.useMemo(() => {
    const catSet = new Set();
    transactions.forEach(t => {
      if (t.category) {
        t.category.forEach(cat => catSet.add(cat));
      }
      if (t.personal_finance_category?.primary) {
        catSet.add(t.personal_finance_category.primary);
      }
    });
    return Array.from(catSet).sort();
  }, [transactions]);

  const fetchBankAccounts = useCallback(async () => {
    try {
      setLoading(true);
      logger.info('🎯 [BankTransactions] === FETCHING BANK ACCOUNTS ===');
      
      const response = await bankAccountsApi.list();
      logger.info('🎯 [BankTransactions] Bank accounts response:', response);
      
      // Filter only connected accounts
      const connectedAccounts = response.data?.filter(account => 
        account.status === 'connected' || account.is_active !== false
      ) || [];
      
      logger.info('🎯 [BankTransactions] Connected accounts:', connectedAccounts);
      setAccounts(connectedAccounts);
      
      // Auto-select first account if available
      if (connectedAccounts.length > 0 && !selectedAccount) {
        setSelectedAccount(connectedAccounts[0].id || connectedAccounts[0].account_id);
      }
    } catch (error) {
      logger.error('🎯 [BankTransactions] Error fetching bank accounts:', error);
      toast.error('Failed to fetch bank accounts');
      setError('Failed to fetch bank accounts. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [selectedAccount]);

  // Initialize dates to last 30 days
  useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
  }, []);

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
      fetchBankAccounts();
    }
  }, [fetchBankAccounts, tenantId]);

  const handleAccountChange = (event) => {
    setSelectedAccount(event.target.value);
  };

  const handleStartDateChange = (event) => {
    setStartDate(event.target.value);
  };

  const handleEndDateChange = (event) => {
    setEndDate(event.target.value);
  };

  const syncTransactions = async () => {
    if (!selectedAccount) {
      toast.error('Please select a bank account first');
      return;
    }

    try {
      setSyncing(true);
      logger.info('🎯 [BankTransactions] === SYNCING TRANSACTIONS FROM PLAID ===');
      
      // First sync with Plaid to get latest transactions
      const syncResponse = await fetch('/api/banking/sync-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          account_id: selectedAccount,
          start_date: startDate,
          end_date: endDate
        })
      });
      
      if (!syncResponse.ok) {
        throw new Error('Failed to sync transactions');
      }
      
      const syncData = await syncResponse.json();
      logger.info('🎯 [BankTransactions] Sync complete:', syncData);
      
      toast.success(`Synced ${syncData.added_count || 0} new transactions`);
      
      // Now fetch the transactions
      await fetchTransactions();
    } catch (error) {
      logger.error('🎯 [BankTransactions] Error syncing transactions:', error);
      toast.error('Failed to sync transactions with bank');
    } finally {
      setSyncing(false);
    }
  };

  const fetchTransactions = async () => {
    if (!selectedAccount || !startDate || !endDate) {
      setError('Please select an account and date range.');
      return;
    }

    try {
      setLoading(true);
      logger.info('🎯 [BankTransactions] === FETCHING TRANSACTIONS ===');
      logger.info('🎯 [BankTransactions] Params:', {
        account_id: selectedAccount,
        start_date: startDate,
        end_date: endDate
      });
      
      const response = await plaidApi.getTransactions({
        account_id: selectedAccount,
        start_date: startDate,
        end_date: endDate,
      });
      
      logger.info('🎯 [BankTransactions] Transactions response:', response);
      
      if (response.data?.transactions && Array.isArray(response.data.transactions)) {
        setTransactions(response.data.transactions);
        logger.info(`🎯 [BankTransactions] Loaded ${response.data.transactions.length} transactions`);
      } else {
        setTransactions([]);
        logger.warn('🎯 [BankTransactions] No transactions found');
      }
      setError(null);
    } catch (error) {
      logger.error('🎯 [BankTransactions] Error fetching transactions:', error);
      toast.error('Failed to fetch transactions');
      setError('Failed to fetch transactions. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Wait for tenant ID to load
  if (!tenantId) {
    return (
      <div className="flex justify-center items-center h-64">
        <CenteredSpinner size="medium" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-black mb-2 flex items-center">
            <ArrowsRightLeftIcon className="h-6 w-6 text-blue-600 mr-2" />
            Bank Transactions
          </h1>
          <p className="text-gray-600 text-sm">
            View and search through your bank account transactions by date range
            <FieldTooltip text="Select a connected bank account and date range to fetch transaction history. Use this to reconcile accounts and track cash flow." />
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-500 text-sm font-medium uppercase tracking-wide">Total Transactions</div>
          <div className="mt-1 text-3xl font-bold text-blue-600">{stats.totalTransactions}</div>
          <div className="text-xs text-gray-500 mt-1">{transactions.length} total</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-500 text-sm font-medium uppercase tracking-wide">Net Cash Flow</div>
          <div className={`mt-1 text-3xl font-bold ${stats.incoming - stats.outgoing >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${Math.abs(stats.incoming - stats.outgoing).toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {stats.incoming - stats.outgoing >= 0 ? 'Positive' : 'Negative'}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-500 text-sm font-medium uppercase tracking-wide">Money In</div>
          <div className="mt-1 text-2xl font-bold text-green-600">${stats.incoming.toFixed(2)}</div>
          <div className="text-xs text-gray-500 mt-1">{stats.positiveTransactions} transactions</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-500 text-sm font-medium uppercase tracking-wide">Money Out</div>
          <div className="mt-1 text-2xl font-bold text-red-600">${stats.outgoing.toFixed(2)}</div>
          <div className="text-xs text-gray-500 mt-1">{stats.negativeTransactions} transactions</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white p-6 rounded-lg shadow">

        <div className="w-full">
          <label htmlFor="bank-account-select" className="block text-sm font-medium text-gray-700 mb-1">
            Bank Account
            <FieldTooltip text="Select the bank account you want to view transactions for. Only connected accounts will appear in this list." />
          </label>
        <select
          id="bank-account-select"
          value={selectedAccount}
          onChange={handleAccountChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select a bank account</option>
          {accounts.map((account) => (
            <option key={account.id || account.account_id} value={account.id || account.account_id}>
              {account.bank_name} - {account.name || account.account_name} (****{account.account_number?.slice(-4) || account.mask})
            </option>
          ))}
        </select>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-4">
          <div className="w-full sm:w-auto">
            <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1">
              <CalendarDaysIcon className="h-4 w-4 inline mr-1" />
              Start Date
              <FieldTooltip text="Select the beginning date for your transaction search. Transactions from this date onwards will be included." />
            </label>
          <input
            id="start-date"
            type="date"
            value={startDate}
            onChange={handleStartDateChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
          <div className="w-full sm:w-auto">
            <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-1">
              <CalendarDaysIcon className="h-4 w-4 inline mr-1" />
              End Date
              <FieldTooltip text="Select the ending date for your transaction search. Transactions up to and including this date will be included." />
            </label>
          <input
            id="end-date"
            type="date"
            value={endDate}
            onChange={handleEndDateChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
          <div className="flex items-end gap-2">
            <button
              onClick={fetchTransactions}
              disabled={loading || !selectedAccount}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center"
            >
              <MagnifyingGlassIcon className="h-5 w-5 mr-2" />
              {loading ? 'Loading...' : 'Fetch Transactions'}
            </button>
            <button
              onClick={syncTransactions}
              disabled={syncing || !selectedAccount}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-green-400 disabled:cursor-not-allowed flex items-center"
              title="Sync latest transactions from your bank"
            >
              <ArrowPathIcon className={`h-5 w-5 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync with Bank'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
            {error}
          </div>
        )}

        {/* Search and Filter Bar */}
        {transactions.length > 0 && (
          <div className="mt-4 flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="date_desc">Date (Newest)</option>
              <option value="date_asc">Date (Oldest)</option>
              <option value="amount_desc">Amount (Highest)</option>
              <option value="amount_asc">Amount (Lowest)</option>
            </select>
            <button
              onClick={() => {
                const csv = [
                  ['Date', 'Description', 'Amount', 'Category'].join(','),
                  ...processedTransactions.map(t => [
                    new Date(t.date).toLocaleDateString(),
                    `"${t.name || t.merchant_name || ''}"`,
                    Math.abs(t.amount).toFixed(2),
                    `"${t.category?.join(', ') || 'Uncategorized'}"`
                  ].join(','))
                ].join('\n');
                
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `transactions_${startDate}_${endDate}.csv`;
                a.click();
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 flex items-center"
            >
              <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
              Export CSV
            </button>
          </div>
        )}

        {loading ? (
          <div className="mt-6 flex justify-center">
            <CenteredSpinner size="medium" />
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto shadow-md rounded-lg max-h-[440px]">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <ClockIcon className="h-4 w-4 inline mr-1" />
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <CurrencyDollarIcon className="h-4 w-4 inline mr-1" />
                    Amount
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {processedTransactions.map((transaction) => (
                  <tr key={transaction.transaction_id || transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(transaction.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="font-medium">{transaction.name || transaction.merchant_name || 'Unknown'}</div>
                      {transaction.merchant_name && transaction.merchant_name !== transaction.name && (
                        <div className="text-xs text-gray-500">{transaction.merchant_name}</div>
                      )}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium ${
                      (transaction.amount || 0) > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      ${Math.abs(transaction.amount || 0).toFixed(2)}
                      {transaction.amount > 0 && <span className="text-xs ml-1">↑</span>}
                      {transaction.amount < 0 && <span className="text-xs ml-1">↓</span>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <TagIcon className="h-4 w-4 mr-1" />
                        {transaction.personal_finance_category?.primary || 
                         transaction.category?.[0] || 
                         'Uncategorized'}
                      </div>
                    </td>
                  </tr>
                ))}
                {processedTransactions.length === 0 && transactions.length > 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                      No transactions match your search criteria.
                    </td>
                  </tr>
                )}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                      {selectedAccount ? 
                        'No transactions found. Click "Sync with Bank" to fetch latest transactions.' :
                        'Select a bank account to view transactions.'
                      }
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default BankTransactionPage;