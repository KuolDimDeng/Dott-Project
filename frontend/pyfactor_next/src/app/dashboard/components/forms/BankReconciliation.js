'use client';

import React, { useState, useEffect } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';
import Image from 'next/image';

// Tooltip component for field help
const FieldTooltip = ({ text, position = 'top' }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  return (
    <div className="relative inline-flex items-center ml-1">
      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        className="cursor-help"
      >
        <svg className="w-4 h-4 text-gray-400 hover:text-gray-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      </div>
      
      {showTooltip && (
        <div className={`absolute z-50 ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 w-72`}>
          <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-lg">
            <div className="relative">
              {text}
              <div className={`absolute ${position === 'top' ? 'top-full' : 'bottom-full'} left-4`}>
                <div className={`${position === 'top' ? '' : 'rotate-180'}`}>
                  <svg className="w-2 h-2 text-gray-900" fill="currentColor" viewBox="0 0 8 4">
                    <path d="M0 0l4 4 4-4z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const BankReconciliation = () => {
  const [bankAccount, setBankAccount] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [beginningBalance, setBeginningBalance] = useState(0);
  const [endingBalance, setEndingBalance] = useState(0);
  const [bookBalance, setBookBalance] = useState(0);
  const [difference, setDifference] = useState(0);
  const [adjustedBalance, setAdjustedBalance] = useState(0);
  const [bankTransactions, setBankTransactions] = useState([]);
  const [bookTransactions, setBookTransactions] = useState([]);
  const [unmatchedTransactions, setUnmatchedTransactions] = useState([]);
  const [bankFees, setBankFees] = useState(0);
  const [interestEarned, setInterestEarned] = useState(0);
  const [connectedBanks, setConnectedBanks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [accordionStates, setAccordionStates] = useState({
    adjustments: false,
    unmatched: false
  });

  useEffect(() => {
    fetchConnectedBanks();
  }, []);

  useEffect(() => {
    if (bankAccount && startDate && endDate) {
      fetchBankTransactions();
      fetchBookTransactions();
    }
  }, [bankAccount, startDate, endDate]);

  useEffect(() => {
    // Calculate difference and adjusted balance
    const calculatedDifference = endingBalance - bookBalance;
    setDifference(calculatedDifference);
    setAdjustedBalance(bookBalance + bankFees + interestEarned);
  }, [endingBalance, bookBalance, bankFees, interestEarned]);

  const fetchConnectedBanks = async () => {
    try {
      const response = await axiosInstance.get('/api/banking/accounts/');
      if (response.data.accounts && Array.isArray(response.data.accounts)) {
        setConnectedBanks(response.data.accounts);
      } else {
        setConnectedBanks([]);
      }
    } catch (error) {
      console.error('Error fetching connected banks:', error);
    }
  };

  const fetchBankTransactions = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('/api/banking/transactions/', {
        params: {
          account_id: bankAccount,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
        },
      });
      if (response.data.transactions && Array.isArray(response.data.transactions)) {
        setBankTransactions(response.data.transactions);
      } else {
        setBankTransactions([]);
      }
    } catch (error) {
      console.error('Error fetching bank transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookTransactions = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('/api/general-ledger/', {
        params: {
          account_id: bankAccount,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
        },
      });
      if (response.data && Array.isArray(response.data)) {
        setBookTransactions(response.data);
      } else {
        setBookTransactions([]);
      }
    } catch (error) {
      console.error('Error fetching book transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  };

  const handleMatch = (bankIndex, bookIndex) => {
    // Logic to match transactions
  };

  const handleAddMissingTransaction = () => {
    // Logic to add missing transaction
  };

  const handleSaveDraft = () => {
    // Logic to save draft
  };

  const handleFinalize = () => {
    // Logic to finalize reconciliation
  };

  const handleGenerateReport = () => {
    // Logic to generate report
  };

  const toggleAccordion = (section) => {
    setAccordionStates(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2 flex items-center">
            <svg className="h-6 w-6 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
            </svg>
            Bank Reconciliation
          </h1>
          <p className="text-gray-600 text-sm">Match bank statements with book records to ensure accurate financial reporting and identify discrepancies.</p>
        </div>
        <div className="mt-4 md:mt-0">
          <Image
            src="/static/images/Recon.png"
            alt="Reconciliation"
            width={130}
            height={130}
            style={{ objectFit: 'contain' }}
          />
        </div>
      </div>

      {/* Header/Overview Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bank Account
            <FieldTooltip text="Select the bank account you want to reconcile. This should match the account on your bank statement." />
          </label>
          <select
            className="w-full p-2 border border-gray-300 rounded-md bg-white"
            value={bankAccount}
            onChange={(e) => setBankAccount(e.target.value)}
          >
            <option value="" disabled>Select Bank Account</option>
            {connectedBanks.map((account) => (
              <option key={account.account_id} value={account.account_id}>
                {account.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Date
            <FieldTooltip text="Enter the beginning date of your bank statement period. This should match the start date shown on your statement." />
          </label>
          <input
            type="date"
            className="w-full p-2 border border-gray-300 rounded-md"
            value={formatDate(startDate)}
            onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : null)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Date
            <FieldTooltip text="Enter the ending date of your bank statement period. This should match the end date shown on your statement." />
          </label>
          <input
            type="date"
            className="w-full p-2 border border-gray-300 rounded-md"
            value={formatDate(endDate)}
            onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : null)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ending Balance
            <FieldTooltip text="Enter the ending balance shown on your bank statement. This is the target balance you're reconciling to." />
          </label>
          <input
            type="number"
            className="w-full p-2 border border-gray-300 rounded-md"
            value={endingBalance}
            onChange={(e) => setEndingBalance(Number(e.target.value))}
          />
        </div>
      </div>

      {/* Reconciliation Summary */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-3">Reconciliation Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-gray-600">Book Balance:</p>
            <p className="text-lg font-medium">${bookBalance.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-gray-600">Difference:</p>
            <p className={`text-lg font-medium ${difference !== 0 ? 'text-red-600' : 'text-green-600'}`}>
              ${difference.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Adjusted Balance:</p>
            <p className="text-lg font-medium">${adjustedBalance.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h2 className="text-lg font-semibold mb-3">Bank Transactions</h2>
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {bankTransactions.map((transaction, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(transaction.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${transaction.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.status || 'Pending'}
                      </td>
                    </tr>
                  ))}
                  {bankTransactions.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                        No bank transactions found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-3">Book Transactions</h2>
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {bookTransactions.map((transaction, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(transaction.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${transaction.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.status || 'Posted'}
                      </td>
                    </tr>
                  ))}
                  {bookTransactions.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                        No book transactions found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Adjustment Section */}
      <div className="mb-6 border border-gray-200 rounded-lg">
        <div
          className="flex justify-between items-center p-4 cursor-pointer"
          onClick={() => toggleAccordion('adjustments')}
        >
          <h3 className="text-lg font-medium">Adjustments</h3>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-5 w-5 transform ${accordionStates.adjustments ? 'rotate-180' : ''} transition-transform`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
        {accordionStates.adjustments && (
          <div className="p-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank Fees
                  <FieldTooltip text="Enter any bank fees charged during this period that appear on your statement but not in your books." />
                </label>
                <input
                  type="number"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={bankFees}
                  onChange={(e) => setBankFees(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Interest Earned
                  <FieldTooltip text="Enter any interest earned during this period that appears on your statement but not in your books." />
                </label>
                <input
                  type="number"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={interestEarned}
                  onChange={(e) => setInterestEarned(Number(e.target.value))}
                />
              </div>
            </div>
            <button 
              type="button"
              onClick={handleAddMissingTransaction}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Missing Transaction
            </button>
          </div>
        )}
      </div>

      {/* Unmatched Transactions */}
      <div className="mb-6 border border-gray-200 rounded-lg">
        <div
          className="flex justify-between items-center p-4 cursor-pointer"
          onClick={() => toggleAccordion('unmatched')}
        >
          <h3 className="text-lg font-medium">Unmatched Transactions</h3>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-5 w-5 transform ${accordionStates.unmatched ? 'rotate-180' : ''} transition-transform`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
        {accordionStates.unmatched && (
          <div className="p-4 border-t border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {unmatchedTransactions.map((transaction, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transaction.date}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transaction.description}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transaction.amount}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transaction.source}</td>
                    </tr>
                  ))}
                  {unmatchedTransactions.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                        No unmatched transactions found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Finalize Section */}
      <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
        <button
          type="button"
          onClick={handleSaveDraft}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          Save Draft
        </button>
        <button
          type="button"
          onClick={handleFinalize}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Finalize & Reconcile
        </button>
        <button
          type="button"
          onClick={handleGenerateReport}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          Generate Report
        </button>
      </div>

      {/* Discrepancy Alerts */}
      {difference !== 0 && (
        <div className="p-4 mb-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                There is a discrepancy of ${Math.abs(difference).toFixed(2)} in your reconciliation.
                Please review your transactions.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankReconciliation;