'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { bankAccountsApi, bankTransactionsApi, bankReconciliationApi } from '@/services/api/banking';
import { logger } from '@/utils/logger';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import { CenteredSpinner } from '@/components/ui/StandardSpinner';
import { 
  ScaleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  DocumentArrowDownIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

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
  const [matchedPairs, setMatchedPairs] = useState([]);
  const [bankFees, setBankFees] = useState(0);
  const [interestEarned, setInterestEarned] = useState(0);
  const [connectedBanks, setConnectedBanks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [reconciliationStatus, setReconciliationStatus] = useState('draft');
  const [selectedBankTxn, setSelectedBankTxn] = useState(null);
  const [selectedBookTxn, setSelectedBookTxn] = useState(null);
  const [accordionStates, setAccordionStates] = useState({
    adjustments: false,
    unmatched: false,
    matched: false
  });

  // Initialize dates to current month
  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    setStartDate(firstDay);
    setEndDate(lastDay);
  }, []);

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
    // Calculate book balance from transactions
    const calcBookBalance = bookTransactions.reduce((sum, txn) => {
      return sum + (txn.debit || 0) - (txn.credit || 0);
    }, beginningBalance);
    setBookBalance(calcBookBalance);
    
    // Calculate difference and adjusted balance
    const calculatedDifference = endingBalance - calcBookBalance;
    setDifference(calculatedDifference);
    setAdjustedBalance(calcBookBalance - bankFees + interestEarned);
  }, [endingBalance, bookTransactions, bankFees, interestEarned, beginningBalance]);

  const fetchConnectedBanks = async () => {
    try {
      logger.info('🎯 [Reconciliation] === FETCHING CONNECTED BANKS ===');
      const response = await bankAccountsApi.list();
      logger.info('🎯 [Reconciliation] Banks response:', response);
      
      const connectedAccounts = response.data?.filter(account => 
        account.status === 'connected' || account.is_active !== false
      ) || [];
      
      setConnectedBanks(connectedAccounts);
      
      // Auto-select first account if available
      if (connectedAccounts.length > 0 && !bankAccount) {
        setBankAccount(connectedAccounts[0].id || connectedAccounts[0].account_id);
      }
    } catch (error) {
      logger.error('🎯 [Reconciliation] Error fetching connected banks:', error);
      toast.error('Failed to fetch bank accounts');
    }
  };

  const syncBankTransactions = async () => {
    setSyncing(true);
    try {
      logger.info('🎯 [Reconciliation] === SYNCING BANK TRANSACTIONS ===');
      
      // Sync with Plaid first
      const syncResponse = await fetch('/api/banking/sync-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          account_id: bankAccount,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0]
        })
      });
      
      if (!syncResponse.ok) {
        throw new Error('Failed to sync transactions');
      }
      
      const syncData = await syncResponse.json();
      logger.info('🎯 [Reconciliation] Sync complete:', syncData);
      toast.success(`Synced ${syncData.added_count || 0} new transactions`);
      
      // Now fetch the transactions
      await fetchBankTransactions();
    } catch (error) {
      logger.error('🎯 [Reconciliation] Error syncing:', error);
      toast.error('Failed to sync with bank');
    } finally {
      setSyncing(false);
    }
  };

  const fetchBankTransactions = async () => {
    setLoading(true);
    try {
      logger.info('🎯 [Reconciliation] === FETCHING BANK TRANSACTIONS ===');
      const response = await bankTransactionsApi.getAll({
        account_id: bankAccount,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
      });
      
      logger.info('🎯 [Reconciliation] Bank transactions:', response);
      
      if (response.data?.transactions && Array.isArray(response.data.transactions)) {
        setBankTransactions(response.data.transactions);
        
        // Auto-match transactions
        autoMatchTransactions(response.data.transactions, bookTransactions);
      } else {
        setBankTransactions([]);
      }
    } catch (error) {
      logger.error('🎯 [Reconciliation] Error fetching bank transactions:', error);
      toast.error('Failed to fetch bank transactions');
    } finally {
      setLoading(false);
    }
  };

  const fetchBookTransactions = async () => {
    setLoading(true);
    try {
      logger.info('🎯 [Reconciliation] === FETCHING BOOK TRANSACTIONS ===');
      
      // For now, use a proxy endpoint or mock data
      // In production, this would fetch from your accounting system
      const response = await fetch('/api/accounting/transactions', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setBookTransactions(data.transactions || []);
        
        // Auto-match if we have bank transactions
        if (bankTransactions.length > 0) {
          autoMatchTransactions(bankTransactions, data.transactions || []);
        }
      } else {
        // For now, use sample data
        setBookTransactions([
          { id: 1, date: startDate, description: 'Opening Balance', debit: 5000, credit: 0, status: 'posted' },
          { id: 2, date: new Date(), description: 'Sales Revenue', debit: 1500, credit: 0, status: 'posted' },
          { id: 3, date: new Date(), description: 'Office Supplies', debit: 0, credit: 200, status: 'posted' },
        ]);
      }
    } catch (error) {
      logger.error('🎯 [Reconciliation] Error fetching book transactions:', error);
      // Use sample data for demo
      setBookTransactions([
        { id: 1, date: startDate, description: 'Opening Balance', debit: 5000, credit: 0, status: 'posted' },
        { id: 2, date: new Date(), description: 'Sales Revenue', debit: 1500, credit: 0, status: 'posted' },
        { id: 3, date: new Date(), description: 'Office Supplies', debit: 0, credit: 200, status: 'posted' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  };

  const autoMatchTransactions = useCallback((bankTxns, bookTxns) => {
    logger.info('🎯 [Reconciliation] === AUTO-MATCHING TRANSACTIONS ===');
    
    const matched = [];
    const unmatchedBank = [...bankTxns];
    const unmatchedBook = [...bookTxns];
    
    // First pass: exact amount and date match
    bankTxns.forEach((bankTxn, bIndex) => {
      const matchIndex = bookTxns.findIndex(bookTxn => {
        const bankAmount = Math.abs(bankTxn.amount);
        const bookAmount = Math.abs(bookTxn.debit - bookTxn.credit);
        const bankDate = new Date(bankTxn.date).toDateString();
        const bookDate = new Date(bookTxn.date).toDateString();
        
        return bankAmount === bookAmount && bankDate === bookDate;
      });
      
      if (matchIndex !== -1) {
        matched.push({
          bank: bankTxn,
          book: bookTxns[matchIndex],
          confidence: 'high'
        });
        
        // Remove from unmatched
        unmatchedBank.splice(unmatchedBank.findIndex(t => t.id === bankTxn.id), 1);
        unmatchedBook.splice(unmatchedBook.findIndex(t => t.id === bookTxns[matchIndex].id), 1);
      }
    });
    
    setMatchedPairs(matched);
    setUnmatchedTransactions([
      ...unmatchedBank.map(t => ({ ...t, source: 'bank' })),
      ...unmatchedBook.map(t => ({ ...t, source: 'book' }))
    ]);
    
    logger.info(`🎯 [Reconciliation] Matched ${matched.length} transactions`);
  }, []);

  const handleManualMatch = () => {
    if (!selectedBankTxn || !selectedBookTxn) {
      toast.error('Please select both a bank and book transaction to match');
      return;
    }
    
    const newMatch = {
      bank: selectedBankTxn,
      book: selectedBookTxn,
      confidence: 'manual'
    };
    
    setMatchedPairs([...matchedPairs, newMatch]);
    setUnmatchedTransactions(unmatched => 
      unmatched.filter(t => 
        t.id !== selectedBankTxn.id && t.id !== selectedBookTxn.id
      )
    );
    
    setSelectedBankTxn(null);
    setSelectedBookTxn(null);
    toast.success('Transactions matched successfully');
  };

  const handleAddMissingTransaction = () => {
    toast.info('Add missing transaction feature coming soon');
  };

  const handleSaveDraft = async () => {
    try {
      logger.info('🎯 [Reconciliation] === SAVING DRAFT ===');
      
      const reconciliationData = {
        account_id: bankAccount,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        ending_balance: endingBalance,
        book_balance: bookBalance,
        adjustments: {
          bank_fees: bankFees,
          interest_earned: interestEarned
        },
        matched_pairs: matchedPairs,
        status: 'draft'
      };
      
      const response = await bankReconciliationApi.create(reconciliationData);
      logger.info('🎯 [Reconciliation] Draft saved:', response);
      toast.success('Reconciliation draft saved');
    } catch (error) {
      logger.error('🎯 [Reconciliation] Error saving draft:', error);
      toast.error('Failed to save draft');
    }
  };

  const handleFinalize = async () => {
    if (Math.abs(difference) > 0.01) {
      toast.error('Cannot finalize with discrepancies. Please resolve all differences first.');
      return;
    }
    
    try {
      logger.info('🎯 [Reconciliation] === FINALIZING ===');
      
      const reconciliationData = {
        account_id: bankAccount,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        ending_balance: endingBalance,
        book_balance: bookBalance,
        adjustments: {
          bank_fees: bankFees,
          interest_earned: interestEarned
        },
        matched_pairs: matchedPairs,
        status: 'completed'
      };
      
      const response = await bankReconciliationApi.reconcile(reconciliationData);
      logger.info('🎯 [Reconciliation] Finalized:', response);
      setReconciliationStatus('completed');
      toast.success('Reconciliation completed successfully!');
    } catch (error) {
      logger.error('🎯 [Reconciliation] Error finalizing:', error);
      toast.error('Failed to finalize reconciliation');
    }
  };

  const handleGenerateReport = () => {
    logger.info('🎯 [Reconciliation] === GENERATING REPORT ===');
    
    const report = {
      account: connectedBanks.find(a => a.id === bankAccount)?.name,
      period: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
      beginning_balance: beginningBalance,
      ending_balance: endingBalance,
      book_balance: bookBalance,
      adjustments: {
        bank_fees: bankFees,
        interest_earned: interestEarned
      },
      adjusted_balance: adjustedBalance,
      difference: difference,
      matched_count: matchedPairs.length,
      unmatched_count: unmatchedTransactions.length
    };
    
    // Convert to CSV or PDF
    const csv = [
      'Bank Reconciliation Report',
      `Account: ${report.account}`,
      `Period: ${report.period}`,
      '',
      'Summary',
      `Beginning Balance: $${report.beginning_balance.toFixed(2)}`,
      `Ending Balance (Bank): $${report.ending_balance.toFixed(2)}`,
      `Book Balance: $${report.book_balance.toFixed(2)}`,
      `Bank Fees: $${report.adjustments.bank_fees.toFixed(2)}`,
      `Interest Earned: $${report.adjustments.interest_earned.toFixed(2)}`,
      `Adjusted Balance: $${report.adjusted_balance.toFixed(2)}`,
      `Difference: $${report.difference.toFixed(2)}`,
      '',
      `Matched Transactions: ${report.matched_count}`,
      `Unmatched Transactions: ${report.unmatched_count}`
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reconciliation_${bankAccount}_${startDate.toISOString().split('T')[0]}.csv`;
    a.click();
    
    toast.success('Report generated and downloaded');
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
            <ScaleIcon className="h-6 w-6 text-blue-600 mr-2" />
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
              <option key={account.id || account.account_id} value={account.id || account.account_id}>
                {account.bank_name} - {account.name || account.account_name} (****{account.account_number?.slice(-4) || account.mask})
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

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 mb-4">
        <button
          onClick={syncBankTransactions}
          disabled={syncing || !bankAccount}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed flex items-center"
        >
          <ArrowPathIcon className={`h-5 w-5 mr-2 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync Bank Data'}
        </button>
      </div>

      {/* Reconciliation Summary */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">Reconciliation Summary</h2>
          {reconciliationStatus === 'completed' && (
            <span className="flex items-center text-green-600">
              <CheckCircleIcon className="h-5 w-5 mr-1" />
              Reconciled
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <p className="text-gray-600">Book Balance:</p>
            <p className="text-lg font-medium">${bookBalance.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-gray-600">Bank Statement:</p>
            <p className="text-lg font-medium">${endingBalance.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-gray-600">Difference:</p>
            <p className={`text-lg font-medium ${Math.abs(difference) > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
              ${difference.toFixed(2)}
              {Math.abs(difference) <= 0.01 && ' ✓'}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Adjusted Balance:</p>
            <p className="text-lg font-medium">${adjustedBalance.toFixed(2)}</p>
          </div>
        </div>
        
        {/* Progress Indicators */}
        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="font-medium">{matchedPairs.length}</div>
            <div className="text-gray-600">Matched</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-yellow-600">{unmatchedTransactions.length}</div>
            <div className="text-gray-600">Unmatched</div>
          </div>
          <div className="text-center">
            <div className="font-medium">{bankTransactions.length}</div>
            <div className="text-gray-600">Total Transactions</div>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h2 className="text-lg font-semibold mb-3">Bank Transactions</h2>
          {loading ? (
            <CenteredSpinner size="medium" />
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
                    <tr 
                      key={transaction.transaction_id || transaction.id || index}
                      className={`cursor-pointer hover:bg-blue-50 ${
                        selectedBankTxn?.id === transaction.id ? 'bg-blue-100' : ''
                      }`}
                      onClick={() => setSelectedBankTxn(transaction)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(transaction.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {transaction.name || transaction.merchant_name || transaction.description}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                        transaction.amount > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        ${Math.abs(transaction.amount || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {matchedPairs.find(m => m.bank.id === transaction.id) ? (
                          <span className="text-green-600">Matched</span>
                        ) : (
                          <span className="text-yellow-600">Pending</span>
                        )}
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
            <CenteredSpinner size="medium" />
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
                    <tr 
                      key={transaction.id || index}
                      className={`cursor-pointer hover:bg-blue-50 ${
                        selectedBookTxn?.id === transaction.id ? 'bg-blue-100' : ''
                      }`}
                      onClick={() => setSelectedBookTxn(transaction)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(transaction.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {transaction.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex justify-between">
                          <span className="text-green-600">
                            {transaction.debit > 0 ? `+$${transaction.debit.toFixed(2)}` : ''}
                          </span>
                          <span className="text-red-600">
                            {transaction.credit > 0 ? `-$${transaction.credit.toFixed(2)}` : ''}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {matchedPairs.find(m => m.book.id === transaction.id) ? (
                          <span className="text-green-600">Matched</span>
                        ) : (
                          <span className="text-gray-600">Posted</span>
                        )}
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

      {/* Manual Match Section */}
      {(selectedBankTxn || selectedBookTxn) && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-lg font-medium mb-2">Manual Transaction Matching</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm font-medium text-gray-700">Selected Bank Transaction:</p>
              {selectedBankTxn ? (
                <p className="text-sm">
                  {selectedBankTxn.name} - ${Math.abs(selectedBankTxn.amount).toFixed(2)}
                </p>
              ) : (
                <p className="text-sm text-gray-500">None selected</p>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Selected Book Transaction:</p>
              {selectedBookTxn ? (
                <p className="text-sm">
                  {selectedBookTxn.description} - ${Math.abs(selectedBookTxn.debit - selectedBookTxn.credit).toFixed(2)}
                </p>
              ) : (
                <p className="text-sm text-gray-500">None selected</p>
              )}
            </div>
          </div>
          <button
            onClick={handleManualMatch}
            disabled={!selectedBankTxn || !selectedBookTxn}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Match Selected Transactions
          </button>
        </div>
      )}

      {/* Finalize Section */}
      <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
        <button
          type="button"
          onClick={handleSaveDraft}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center"
        >
          <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
          Save Draft
        </button>
        <button
          type="button"
          onClick={handleFinalize}
          disabled={Math.abs(difference) > 0.01}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center"
        >
          <CheckCircleIcon className="h-5 w-5 mr-2" />
          Finalize & Reconcile
        </button>
        <button
          type="button"
          onClick={handleGenerateReport}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center"
        >
          <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
          Generate Report
        </button>
      </div>

      {/* Discrepancy Alerts */}
      {Math.abs(difference) > 0.01 && (
        <div className="p-4 mb-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-yellow-800">
                Reconciliation Discrepancy Detected
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                There is a difference of ${Math.abs(difference).toFixed(2)} between your book balance and bank statement.
              </p>
              <ul className="text-sm text-yellow-700 mt-2 list-disc list-inside">
                <li>Check for unmatched transactions</li>
                <li>Verify bank fees and interest earned</li>
                <li>Ensure all transactions are recorded</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankReconciliation;