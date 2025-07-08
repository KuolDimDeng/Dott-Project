'use client';

import React, { useState, useEffect } from 'react';
import { BanknotesIcon, CreditCardIcon, WalletIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import StandardSpinner from '@/components/ui/StandardSpinner';
import { logger } from '@/utils/logger';

export default function Step5_FundAccount({ 
  payrollData, 
  updatePayrollData, 
  onNext, 
  onPrevious 
}) {
  const [fundingMethod, setFundingMethod] = useState(payrollData.fundingMethod || 'bank');
  const [fundingStatus, setFundingStatus] = useState('pending');
  const [selectedBankAccount, setSelectedBankAccount] = useState('');
  const [bankAccounts, setBankAccounts] = useState([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const totalDue = payrollData.deductions 
    ? payrollData.deductions.totalNet + (payrollData.deductions.totalNet * 0.024) + (payrollData.deductions.employees.length * 0.50)
    : 0;

  useEffect(() => {
    loadBankingInfo();
  }, []);

  const loadBankingInfo = async () => {
    try {
      setLoading(true);
      const [accountsRes, balanceRes] = await Promise.all([
        fetch('/api/banking/accounts', { credentials: 'include' }),
        fetch('/api/banking/balance', { credentials: 'include' })
      ]);
      
      if (accountsRes.ok) {
        const accountsData = await accountsRes.json();
        setBankAccounts(accountsData.accounts || []);
        if (accountsData.accounts?.length > 0) {
          setSelectedBankAccount(accountsData.accounts[0].id);
        }
      }
      
      if (balanceRes.ok) {
        const balanceData = await balanceRes.json();
        setBalance(balanceData.balance || 0);
      }
    } catch (error) {
      logger.error('Error loading banking info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFundingMethodChange = (method) => {
    setFundingMethod(method);
    updatePayrollData('fundingMethod', method);
  };

  const authorizeBankTransfer = async () => {
    try {
      setProcessing(true);
      const response = await fetch('/api/payroll/fund-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          payrollId: payrollData.id,
          fundingMethod: 'bank',
          bankAccountId: selectedBankAccount,
          amount: totalDue
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setFundingStatus('processing');
        updatePayrollData('fundingStatus', 'processing');
        updatePayrollData('fundingDetails', data.fundingDetails);
        
        setTimeout(() => {
          onNext();
        }, 2000);
      }
    } catch (error) {
      logger.error('Error authorizing bank transfer:', error);
    } finally {
      setProcessing(false);
    }
  };

  const processCardPayment = async () => {
    try {
      setProcessing(true);
      const response = await fetch('/api/payroll/fund-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          payrollId: payrollData.id,
          amount: totalDue
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        }
      }
    } catch (error) {
      logger.error('Error processing card payment:', error);
    } finally {
      setProcessing(false);
    }
  };

  const useExistingBalance = async () => {
    try {
      setProcessing(true);
      const response = await fetch('/api/payroll/fund-balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          payrollId: payrollData.id,
          amount: totalDue
        })
      });
      
      if (response.ok) {
        setFundingStatus('complete');
        updatePayrollData('fundingStatus', 'complete');
        setTimeout(() => {
          onNext();
        }, 1000);
      }
    } catch (error) {
      logger.error('Error using balance:', error);
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <StandardSpinner size="large" />
      </div>
    );
  }

  const hasEnoughBalance = balance >= totalDue;

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <BanknotesIcon className="h-6 w-6 text-blue-600 mr-2" />
          Fund Your Payroll
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Transfer funds to process payments
        </p>
      </div>

      {/* Amount Required */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start">
          <ExclamationTriangleIcon className="h-6 w-6 text-blue-600 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-lg font-medium text-blue-900">Funding Required</h3>
            <p className="text-3xl font-bold text-blue-900 mt-2">
              {formatCurrency(totalDue)}
            </p>
            <p className="text-sm text-blue-700 mt-1">
              Payroll: {formatCurrency(payrollData.deductions.totalNet)} + 
              Fees: {formatCurrency(totalDue - payrollData.deductions.totalNet)}
            </p>
          </div>
        </div>
      </div>

      {/* Funding Options */}
      <div className="space-y-4">
        {/* Bank Transfer Option */}
        <div 
          className={`
            border rounded-lg p-4 cursor-pointer transition-all
            ${fundingMethod === 'bank' 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-200 hover:border-gray-300'
            }
          `}
          onClick={() => handleFundingMethodChange('bank')}
        >
          <div className="flex items-start">
            <input
              type="radio"
              checked={fundingMethod === 'bank'}
              onChange={() => handleFundingMethodChange('bank')}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <div className="ml-3 flex-1">
              <div className="flex items-center">
                <BanknotesIcon className="h-5 w-5 text-gray-600 mr-2" />
                <span className="text-base font-medium text-gray-900">Bank Transfer (ACH)</span>
              </div>
              <div className="mt-1 text-sm text-gray-600">
                <p>• 3-5 business days</p>
                <p>• Lowest fees (0.8%)</p>
                <p>• Best for regular payroll</p>
              </div>
            </div>
          </div>
        </div>

        {/* Card Option */}
        <div 
          className={`
            border rounded-lg p-4 cursor-pointer transition-all
            ${fundingMethod === 'card' 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-200 hover:border-gray-300'
            }
          `}
          onClick={() => handleFundingMethodChange('card')}
        >
          <div className="flex items-start">
            <input
              type="radio"
              checked={fundingMethod === 'card'}
              onChange={() => handleFundingMethodChange('card')}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <div className="ml-3 flex-1">
              <div className="flex items-center">
                <CreditCardIcon className="h-5 w-5 text-gray-600 mr-2" />
                <span className="text-base font-medium text-gray-900">Debit Card</span>
              </div>
              <div className="mt-1 text-sm text-gray-600">
                <p>• Instant funding</p>
                <p>• Higher fees (2.9%)</p>
                <p>• Good for urgent payroll</p>
              </div>
            </div>
          </div>
        </div>

        {/* Balance Option */}
        <div 
          className={`
            border rounded-lg p-4 cursor-pointer transition-all
            ${fundingMethod === 'balance' 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-200 hover:border-gray-300'
            }
            ${!hasEnoughBalance ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          onClick={() => hasEnoughBalance && handleFundingMethodChange('balance')}
        >
          <div className="flex items-start">
            <input
              type="radio"
              checked={fundingMethod === 'balance'}
              onChange={() => handleFundingMethodChange('balance')}
              disabled={!hasEnoughBalance}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <div className="ml-3 flex-1">
              <div className="flex items-center">
                <WalletIcon className="h-5 w-5 text-gray-600 mr-2" />
                <span className="text-base font-medium text-gray-900">Dott Balance</span>
              </div>
              <div className="mt-1 text-sm text-gray-600">
                <p>• Use existing balance</p>
                <p>• No fees</p>
                <p>• Current balance: {formatCurrency(balance)}</p>
                {!hasEnoughBalance && (
                  <p className="text-red-600 mt-1">Insufficient balance</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Form */}
      {fundingMethod === 'bank' && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Select Bank Account
            </label>
            <select
              value={selectedBankAccount}
              onChange={(e) => setSelectedBankAccount(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              {bankAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ****{account.last4}
                </option>
              ))}
              <option value="new">Add new bank account</option>
            </select>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <p className="text-sm text-yellow-800">
              By clicking "Authorize Transfer", you authorize Dott to debit {formatCurrency(totalDue)} from your account for payroll processing.
            </p>
          </div>
          
          <button
            onClick={authorizeBankTransfer}
            disabled={!selectedBankAccount || processing}
            className={`
              w-full py-2 px-4 text-sm font-medium rounded-md
              ${!selectedBankAccount || processing
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
              }
            `}
          >
            {processing ? 'Processing...' : 'Authorize Transfer'}
          </button>
        </div>
      )}

      {fundingMethod === 'card' && (
        <div className="bg-gray-50 rounded-lg p-4">
          <button
            onClick={processCardPayment}
            disabled={processing}
            className={`
              w-full py-2 px-4 text-sm font-medium rounded-md
              ${processing
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
              }
            `}
          >
            {processing ? 'Processing...' : 'Continue to Payment'}
          </button>
        </div>
      )}

      {fundingMethod === 'balance' && (
        <div className="bg-gray-50 rounded-lg p-4">
          <button
            onClick={useExistingBalance}
            disabled={!hasEnoughBalance || processing}
            className={`
              w-full py-2 px-4 text-sm font-medium rounded-md
              ${!hasEnoughBalance || processing
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
              }
            `}
          >
            {processing ? 'Processing...' : 'Use Balance'}
          </button>
        </div>
      )}

      {/* Funding Progress */}
      {fundingStatus === 'processing' && (
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-3">Transfer Progress</h4>
          <div className="space-y-2">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-blue-600 rounded-full mr-3"></div>
              <span className="text-sm text-blue-900 font-medium">Transfer Initiated</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-blue-300 rounded-full mr-3 animate-pulse"></div>
              <span className="text-sm text-blue-700">Processing</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-gray-300 rounded-full mr-3"></div>
              <span className="text-sm text-gray-500">Funds Available</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-gray-300 rounded-full mr-3"></div>
              <span className="text-sm text-gray-500">Ready to Pay</span>
            </div>
          </div>
          <p className="text-sm text-blue-700 mt-3">
            Estimated completion: {formatDate(fundingMethod === 'bank' ? 3 : 0)}
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
        <button
          onClick={onPrevious}
          className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={fundingStatus !== 'processing' && fundingStatus !== 'complete'}
          className={`
            px-6 py-2 text-sm font-medium rounded-md
            ${fundingStatus === 'processing' || fundingStatus === 'complete'
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          Continue to Process Payments
        </button>
      </div>
    </div>
  );
}