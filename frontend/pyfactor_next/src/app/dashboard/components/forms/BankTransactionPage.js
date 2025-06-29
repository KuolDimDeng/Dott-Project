import React, { useState, useEffect, useCallback } from 'react';
import { bankAccountsApi, bankTransactionsApi } from '@/services/api/banking';
import { logger } from '@/utils/logger';
import { getSecureTenantId } from '@/utils/tenantUtils';
import { CenteredSpinner } from '@/components/ui/StandardSpinner';
import { 
  ArrowsRightLeftIcon,
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  QuestionMarkCircleIcon,
  CurrencyDollarIcon,
  ClockIcon,
  BuildingLibraryIcon
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
  const [error, setError] = useState(null);
  
  // Stats for summary cards
  const stats = {
    totalTransactions: transactions.length,
    totalAmount: transactions.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0),
    positiveTransactions: transactions.filter(t => (t.amount || 0) > 0).length,
    negativeTransactions: transactions.filter(t => (t.amount || 0) < 0).length
  };

  const fetchBankAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await bankAccountsApi.getAll();
      if (response.data.accounts && Array.isArray(response.data.accounts)) {
        setAccounts(response.data.accounts);
      } else {
        setAccounts([]);
      }
    } catch (error) {
      logger.error('Error fetching bank accounts:', error);
      setError('Failed to fetch bank accounts. Please try again later.');
    } finally {
      setLoading(false);
    }
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

  const fetchTransactions = async () => {
    if (!selectedAccount || !startDate || !endDate) {
      setError('Please select an account and date range.');
      return;
    }

    try {
      setLoading(true);
      const response = await bankTransactionsApi.getAll({
        account_id: selectedAccount,
        start_date: startDate,
        end_date: endDate,
      });
      if (response.data.transactions && Array.isArray(response.data.transactions)) {
        setTransactions(response.data.transactions);
      } else {
        setTransactions([]);
      }
      setError(null);
    } catch (error) {
      logger.error('Error fetching transactions:', error);
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-500 text-sm font-medium uppercase tracking-wide">Total Transactions</div>
          <div className="mt-1 text-3xl font-bold text-blue-600">{stats.totalTransactions}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-500 text-sm font-medium uppercase tracking-wide">Total Amount</div>
          <div className="mt-1 text-3xl font-bold text-green-600">${stats.totalAmount.toFixed(2)}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-500 text-sm font-medium uppercase tracking-wide">Incoming</div>
          <div className="mt-1 text-2xl font-bold text-green-600">{stats.positiveTransactions}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-500 text-sm font-medium uppercase tracking-wide">Outgoing</div>
          <div className="mt-1 text-2xl font-bold text-red-600">{stats.negativeTransactions}</div>
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
            <option key={account.account_id} value={account.account_id}>
              {account.name}
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
          <div className="flex items-end">
            <button
              onClick={fetchTransactions}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center"
            >
              <MagnifyingGlassIcon className="h-5 w-5 mr-2" />
              Fetch Transactions
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
            {error}
          </div>
        )}

        {loading ? (
        <CenteredSpinner size="medium" /> : (
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
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(transaction.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.description}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium ${
                      (transaction.amount || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      ${Math.abs(transaction.amount || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {transaction.category || 'Uncategorized'}
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                      No transactions found. Select an account and date range to fetch transactions.
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