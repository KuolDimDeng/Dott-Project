import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { axiosInstance } from '@/lib/axiosConfig';

const BankingReport = () => {
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBankAccounts();
  }, []);

  useEffect(() => {
    console.log('Selected account updated:', selectedAccount);
  }, [selectedAccount]);

  const fetchBankAccounts = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axiosInstance.get('/api/banking/accounts/');
      console.log('Bank accounts response:', response.data);
      if (Array.isArray(response.data)) {
        setBankAccounts(response.data);
      } else if (response.data && Array.isArray(response.data.accounts)) {
        setBankAccounts(response.data.accounts);
      } else {
        console.error('Unexpected response format:', response.data);
        setBankAccounts([]);
        setError('Unexpected response format from server');
      }
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
      setBankAccounts([]);
      setError('Failed to fetch bank accounts');
    } finally {
      setLoading(false);
    }
  };

  const fetchReportData = async () => {
    setLoading(true);
    setError('');
    try {
      console.log('Fetching report for account:', selectedAccount);
      const response = await axiosInstance.get('/api/banking/report/', {
        params: {
          account_id: selectedAccount,
          start_date: startDate,
          end_date: endDate,
        },
      });
      console.log('Report data:', response.data);
      setReportData(response.data);
    } catch (error) {
      console.error('Error fetching report data:', error);
      setError('Failed to fetch report data');
    } finally {
      setLoading(false);
    }
  };

  const handleAccountChange = (event) => {
    const value = event.target.value;
    console.log('Account selected:', value);
    setSelectedAccount(value);
  };

  const handleGenerateReport = () => {
    console.log('Generate report clicked. Selected account:', selectedAccount);
    if (!selectedAccount) {
      setError('Please select a bank account');
      return;
    }
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }
    fetchReportData();
  };

  const handleExport = (format) => {
    // Implement export functionality (PDF or CSV)
    console.log(`Exporting report as ${format}`);
  };

  return (
    <div className="bg-gray-50 p-6 rounded-lg">
      <h1 className="text-2xl font-bold mb-4">Banking Report</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Filters and Controls */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
          <div>
            <select
              className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              value={selectedAccount}
              onChange={handleAccountChange}
            >
              <option value="" disabled>
                Select Bank Account
              </option>
              {Array.isArray(bankAccounts) && bankAccounts.length > 0 ? (
                bankAccounts.map((account) => (
                  <option key={account.account_id} value={account.account_id}>
                    {account.name} - {account.mask}
                  </option>
                ))
              ) : (
                <option disabled>No bank accounts available</option>
              )}
            </select>
          </div>
          <div>
            <input
              type="date"
              className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              value={startDate}
              onChange={(e) => {
                console.log('Start date changed:', e.target.value);
                setStartDate(e.target.value);
              }}
              placeholder="Start Date"
            />
          </div>
          <div>
            <input
              type="date"
              className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              value={endDate}
              onChange={(e) => {
                console.log('End date changed:', e.target.value);
                setEndDate(e.target.value);
              }}
              placeholder="End Date"
            />
          </div>
          <div>
            <button
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleGenerateReport}
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Generating...</span>
                </div>
              ) : (
                'Generate Report'
              )}
            </button>
          </div>
        </div>
        <div className="mt-4">
          <button
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mr-2 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => handleExport('PDF')}
            disabled={!reportData}
          >
            <svg className="mr-2 -ml-1 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export PDF
          </button>
          <button
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => handleExport('CSV')}
            disabled={!reportData}
          >
            <svg className="mr-2 -ml-1 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {reportData && (
        <>
          {/* Header Section */}
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <h2 className="text-lg font-semibold mb-3">Report Summary</h2>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-gray-800">Bank: {reportData.bank_name}</p>
              </div>
              <div>
                <p className="text-gray-800">Account: {reportData.account_number}</p>
              </div>
              <div>
                <p className="text-gray-800">
                  Beginning Balance: ${reportData.beginning_balance.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-gray-800">Ending Balance: ${reportData.ending_balance.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Transactions Section */}
          <div className="bg-white rounded-lg shadow mb-6 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Check Number
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Debit
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Credit
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Balance
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(transaction.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {transaction.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {transaction.check_number || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                        {transaction.debit ? `$${transaction.debit.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                        {transaction.credit ? `$${transaction.credit.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                        ${transaction.balance.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Reconciliation Summary */}
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <h2 className="text-lg font-semibold mb-3">Reconciliation Summary</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-gray-800">
                  Outstanding Checks: ${reportData.outstanding_checks.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-gray-800">
                  Deposits in Transit: ${reportData.deposits_in_transit.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Summary Section */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-3">Summary</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-gray-800">Total Debits: ${reportData.total_debits.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-800">Total Credits: ${reportData.total_credits.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-800">Net Change: ${reportData.net_change.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default BankingReport;