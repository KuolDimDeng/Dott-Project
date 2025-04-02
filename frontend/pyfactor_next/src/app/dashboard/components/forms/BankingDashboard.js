// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/components/forms/BankingDashboard.js

import React, { useState, useEffect, useCallback } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';
import Link from 'next/link';

const BankingDashboard = () => {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [connectedBank, setConnectedBank] = useState(null);

  const fetchBankingAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/api/banking/accounts/');
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
      console.error('Error fetching banking accounts:', error);
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
      const response = await axiosInstance.get('/api/banking/recent-transactions/', {
        params: { limit: 10 },
      });
      if (response.data.transactions && Array.isArray(response.data.transactions)) {
        setTransactions(response.data.transactions);
      } else {
        setTransactions([]);
      }
    } catch (error) {
      console.error('Error fetching recent transactions:', error);
      setError('Failed to fetch recent transactions. Please try again later.');
    }
  }, [connectedBank]);

  useEffect(() => {
    fetchBankingAccounts();
  }, [fetchBankingAccounts]);

  useEffect(() => {
    fetchRecentTransactions();
  }, [fetchRecentTransactions]);

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
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mr-3 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
        </svg>
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
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
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
                  className={`w-full p-2 border border-gray-300 rounded-md ${!connectedBank ? 'bg-gray-100 cursor-not-allowed' : 'focus:ring-indigo-500 focus:border-indigo-500'}`}
                  disabled={!connectedBank}
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={`w-full p-2 border border-gray-300 rounded-md ${!connectedBank ? 'bg-gray-100 cursor-not-allowed' : 'focus:ring-indigo-500 focus:border-indigo-500'}`}
                  disabled={!connectedBank}
                />
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200">
              <button
                onClick={handleDownload}
                disabled={!connectedBank || !startDate || !endDate}
                className={`w-full flex justify-center items-center px-4 py-2 rounded-md ${
                  !connectedBank || !startDate || !endDate
                    ? 'bg-indigo-300 cursor-not-allowed text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
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
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
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
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
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
