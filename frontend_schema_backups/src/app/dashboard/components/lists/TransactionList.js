import React, { useState, useEffect } from 'react';
import { logger } from '@/utils/logger';
import { getCacheValue } from '@/utils/appCache';
import { fetchAuthSession } from '@/config/amplifyUnified';

const TransactionList = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        
        // Get auth token using Cognito (preferred method)
        let token;
        try {
          const { tokens } = await fetchAuthSession();
          token = tokens?.accessToken?.toString();
        } catch (authError) {
          logger.warn('Error getting token from Cognito:', authError);
          // Fallback to AppCache
          token = getCacheValue('accessToken');
        }
        
        if (!token) {
          logger.error('No authentication token available');
          return;
        }
        
        const response = await fetch('http://localhost:8000/api/transactions/', {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setTransactions(data);
          logger.debug('Fetched transactions:', data);
        } else {
          logger.error('Error fetching transactions:', response.statusText);
        }
      } catch (error) {
        logger.error('Error fetching transactions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  if (loading) {
    return (
      <div className="w-full flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-main"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex justify-end mb-4 space-x-2">
        <button className="px-3 py-1.5 bg-primary-main hover:bg-primary-dark text-white font-medium rounded transition-colors focus:outline-none focus:ring-2 focus:ring-primary-main focus:ring-opacity-50">
          Filter
        </button>
        <button className="px-3 py-1.5 bg-primary-main hover:bg-primary-dark text-white font-medium rounded transition-colors focus:outline-none focus:ring-2 focus:ring-primary-main focus:ring-opacity-50">
          Sort
        </button>
        <button className="px-3 py-1.5 bg-primary-main hover:bg-primary-dark text-white font-medium rounded transition-colors focus:outline-none focus:ring-2 focus:ring-primary-main focus:ring-opacity-50">
          Search
        </button>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Account</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Notes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-300">
                    No transactions found
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{transaction.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{transaction.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{transaction.account ? transaction.account.name : ''}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{transaction.type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{transaction.amount}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{transaction.notes}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 space-x-2">
                      <button className="inline-flex items-center px-2.5 py-1.5 bg-primary-main hover:bg-primary-dark text-white text-xs font-medium rounded transition-colors focus:outline-none focus:ring-2 focus:ring-primary-main focus:ring-opacity-50">
                        Edit
                      </button>
                      <button className="inline-flex items-center px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded transition-colors focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-opacity-50">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TransactionList;
