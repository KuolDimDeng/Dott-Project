'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { bankAccountsApi, bankTransactionsApi } from '@/services/api/banking';
import { logger } from '@/utils/logger';
import { getSecureTenantId } from '@/utils/tenantUtils';
import Link from 'next/link';
import { 
  BanknotesIcon, 
  ArrowsRightLeftIcon, 
  ArrowDownTrayIcon, 
  MagnifyingGlassIcon,
  QuestionMarkCircleIcon,
  LinkIcon,
  CreditCardIcon,
  CheckCircleIcon
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

const BankingDashboard = () => {
  const [tenantId, setTenantId] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [connectedBank, setConnectedBank] = useState(null);
  
  // Stats for summary cards
  const [stats, setStats] = useState({
    totalAccounts: 0,
    totalBalance: 0,
    monthlyIncoming: 0,
    monthlyOutgoing: 0
  });

  const fetchBankingAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await bankAccountsApi.getAll();
      if (response.data.accounts && Array.isArray(response.data.accounts)) {
        setAccounts(response.data.accounts);
        if (response.data.accounts.length > 0) {
          setConnectedBank(response.data.accounts[0].name.split(' ')[0]); // Assuming the bank name is the first word in the account name
        } else {
          setConnectedBank(null);
        }
      } else {
        setAccounts([]);
        setConnectedBank(null);
      }
    } catch (error) {
      logger.error('Error fetching banking accounts:', error);
      setError('Failed to fetch banking accounts. Please try again later.');
      setConnectedBank(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRecentTransactions = useCallback(async () => {
    if (!connectedBank) {
      setTransactions([]);
      return;
    }
    try {
      const response = await bankTransactionsApi.getRecent({ limit: 10 });
      if (response.data.transactions && Array.isArray(response.data.transactions)) {
        setTransactions(response.data.transactions);
      } else {
        setTransactions([]);
      }
    } catch (error) {
      logger.error('Error fetching recent transactions:', error);
      setError('Failed to fetch recent transactions. Please try again later.');
    }
  }, [connectedBank]);

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
      fetchBankingAccounts();
    }
  }, [fetchBankingAccounts, tenantId]);

  useEffect(() => {
    if (tenantId) {
      fetchRecentTransactions();
    }
  }, [fetchRecentTransactions, tenantId]);

  const handleDownload = async () => {
    if (!connectedBank) {
      setError('Please connect a bank account before downloading transactions.');
      return;
    }
    try {
      const response = await axiosInstance.get('/api/banking/download-transactions/', {
        params: { start_date: startDate, end_date: endDate },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transactions_${startDate}_to_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      console.error('Error downloading transactions:', error);
      setError('Failed to download transactions. Please try again.');
    }
  };

  const filteredTransactions = transactions.filter((transaction) =>
    transaction.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Wait for tenant ID to load
  if (!tenantId) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 p-4">
        {error}
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg">
      <div className="flex items-center mb-2">
        <Bank size={40} weight="duotone" className="mr-3 text-indigo-600" />
        <h1 className="text-2xl font-bold">Banking Dashboard</h1>
      </div>
      
      <p className="ml-12 mb-6 text-gray-600">
        Manage your accounts, download transactions, and view recent activity
      </p>
      
      <h2 className="text-xl font-semibold mb-4 text-indigo-600">
        Connected Bank: {connectedBank || 'None'}
        {!connectedBank && (
          <span className="ml-2 font-normal text-base text-gray-700">
            Please link a banking institution
            <Link href="/connect-bank" className="ml-1 text-blue-600 hover:underline">here</Link>.
          </span>
        )}
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="col-span-1">
          <div className="bg-white shadow rounded-lg h-full flex flex-col justify-between">
            <div className="p-6 flex-grow">
              <h3 className="text-lg font-semibold mb-4">Bank Accounts</h3>
              {accounts.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {accounts.map((account) => (
                    <li key={account.account_id} className="py-3">
                      <p className="font-medium">{account.name}</p>
                      <p className="text-sm text-gray-600">Balance: ${account.balances?.current || 'N/A'}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No accounts found. Please connect a bank account to get started.</p>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200">
              <button 
                onClick={fetchBankingAccounts}
                className="flex items-center text-indigo-600 hover:text-indigo-800 border border-indigo-600 px-4 py-2 rounded-md"
              >
                <ArrowsClockwise size={20} weight="duotone" className="mr-2" />
                Refresh Accounts
              </button>
            </div>
          </div>
        </div>
        
        <div className="col-span-1">
          <div className="bg-white shadow rounded-lg h-full flex flex-col justify-between">
            <div className="p-6 flex-grow">
              <h3 className="text-lg font-semibold mb-4">Download Transactions</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={`w-full p-2 border border-gray-300 rounded-md ${!connectedBank ? 'bg-gray-100 cursor-not-allowed' : 'focus:ring-blue-500 focus:border-blue-500'}`}
                  disabled={!connectedBank}
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={`w-full p-2 border border-gray-300 rounded-md ${!connectedBank ? 'bg-gray-100 cursor-not-allowed' : 'focus:ring-blue-500 focus:border-blue-500'}`}
                  disabled={!connectedBank}
                />
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200">
              <button
                onClick={handleDownload}
                disabled={!connectedBank || !startDate || !endDate}
                className={`w-full flex justify-center items-center px-4 py-2 rounded-md transition-colors ${
                  !connectedBank || !startDate || !endDate
                    ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                Download Transactions
              </button>
            </div>
          </div>
        </div>
        
        <div className="col-span-1 md:col-span-2">
          <div className="bg-white shadow rounded-lg h-full flex flex-col justify-between">
            <div className="p-6 flex-grow">
              <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
              
              <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlass size={20} weight="duotone" className="text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-10 p-2 border border-gray-300 rounded-md ${!connectedBank ? 'bg-gray-100 cursor-not-allowed' : 'focus:ring-indigo-500 focus:border-indigo-500'}`}
                  disabled={!connectedBank}
                />
              </div>
              
              {connectedBank ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredTransactions.length > 0 ? (
                        filteredTransactions.map((transaction) => (
                          <tr key={transaction.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {transaction.description}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                              {new Date(transaction.date).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                              ${transaction.amount.toFixed(2)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                            No transactions found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-600">Please connect a bank account to view recent transactions.</p>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200">
              <button
                onClick={fetchRecentTransactions}
                disabled={!connectedBank}
                className={`flex items-center px-4 py-2 rounded-md ${
                  !connectedBank
                    ? 'border border-gray-300 text-gray-400 cursor-not-allowed'
                    : 'text-indigo-600 hover:text-indigo-800 border border-indigo-600'
                }`}
              >
                <ArrowsClockwise size={20} weight="duotone" className="mr-2" />
                Refresh Transactions
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BankingDashboard;
