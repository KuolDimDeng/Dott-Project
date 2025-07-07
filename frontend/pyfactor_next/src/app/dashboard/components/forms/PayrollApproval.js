'use client';

import React, { useState, useEffect } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';
import { useToast } from '@/components/Toast/ToastProvider';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { CenteredSpinner, ButtonSpinner } from '@/components/ui/StandardSpinner';
import { CheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const PayrollApproval = ({ 
  payrollRun, 
  onApprove, 
  onCancel,
  currency = 'USD' 
}) => {
  const [loading, setLoading] = useState(false);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedBankAccount, setSelectedBankAccount] = useState('');
  const [signatureName, setSignatureName] = useState('');
  const [signatureDate, setSignatureDate] = useState(new Date().toISOString().split('T')[0]);
  const [confirmationChecked, setConfirmationChecked] = useState(false);
  const [loadingBanks, setLoadingBanks] = useState(true);
  const toast = useToast();

  useEffect(() => {
    fetchBankAccounts();
  }, []);

  const fetchBankAccounts = async () => {
    try {
      setLoadingBanks(true);
      const response = await axiosInstance.get('/api/banking/accounts/');
      
      // Filter for active checking/savings accounts
      const eligibleAccounts = response.data.filter(account => 
        account.is_active && 
        ['checking', 'savings'].includes(account.account_type?.toLowerCase())
      );
      
      setBankAccounts(eligibleAccounts);
      
      // Pre-select primary account if available
      const primaryAccount = eligibleAccounts.find(acc => acc.is_primary);
      if (primaryAccount) {
        setSelectedBankAccount(primaryAccount.id);
      }
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
      toast.showError('Failed to load bank accounts');
    } finally {
      setLoadingBanks(false);
    }
  };

  const handleApprove = async () => {
    // Validation
    if (!selectedBankAccount) {
      toast.showError('Please select a bank account');
      return;
    }
    
    if (!signatureName.trim()) {
      toast.showError('Please enter your full name for signature');
      return;
    }
    
    if (!signatureDate) {
      toast.showError('Please enter the signature date');
      return;
    }
    
    if (!confirmationChecked) {
      toast.showError('Please confirm that you authorize this payroll');
      return;
    }

    try {
      setLoading(true);
      
      const approvalData = {
        payroll_run_id: payrollRun.id,
        signature_name: signatureName.trim(),
        signature_date: signatureDate,
        selected_bank_account_id: selectedBankAccount,
      };
      
      await onApprove(approvalData);
      
    } catch (error) {
      console.error('Error approving payroll:', error);
      toast.showError('Failed to approve payroll');
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals with platform fee
  const totalNetPay = payrollRun?.total_net_pay || 0;
  const platformFeeRate = 0.024; // 2.4%
  const platformFee = totalNetPay * platformFeeRate;
  const totalWithFee = totalNetPay + platformFee;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Approve Payroll Payment</h2>
      
      {/* Payroll Summary */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h3 className="text-lg font-medium mb-4">Payroll Summary</h3>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-600">Pay Period</p>
            <p className="font-medium">
              {formatDate(payrollRun.start_date)} - {formatDate(payrollRun.end_date)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Pay Date</p>
            <p className="font-medium">{formatDate(payrollRun.pay_date)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Number of Employees</p>
            <p className="font-medium">{payrollRun.employee_count || 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Gross Pay</p>
            <p className="font-medium">{formatCurrency(payrollRun.total_gross_pay || 0, currency)}</p>
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Net Pay to Employees</span>
              <span className="font-medium">{formatCurrency(totalNetPay, currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Platform Fee (2.4%)</span>
              <span className="font-medium">{formatCurrency(platformFee, currency)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total Amount to be Debited</span>
              <span className="text-blue-600">{formatCurrency(totalWithFee, currency)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bank Account Selection */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h3 className="text-lg font-medium mb-4">Select Funding Source</h3>
        
        {loadingBanks ? (
          <CenteredSpinner />
        ) : bankAccounts.length === 0 ? (
          <div className="text-center py-8">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-yellow-400" />
            <p className="mt-2 text-sm text-gray-600">
              No bank accounts found. Please add a bank account in the Banking menu first.
            </p>
            <button
              onClick={() => window.location.href = '/dashboard/banking/connect'}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Connect Bank Account
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {bankAccounts.map((account) => (
              <label
                key={account.id}
                className={`relative flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                  selectedBankAccount === account.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <input
                  type="radio"
                  className="sr-only"
                  name="bank-account"
                  value={account.id}
                  checked={selectedBankAccount === account.id}
                  onChange={(e) => setSelectedBankAccount(e.target.value)}
                />
                <div className="flex-1">
                  <div className="flex items-center">
                    <span className="font-medium">{account.bank_name}</span>
                    {account.is_primary && (
                      <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                        Primary
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-sm text-gray-600">
                    {account.account_type} - ****{account.last4}
                  </div>
                  <div className="mt-1 text-sm">
                    Available Balance: {formatCurrency(account.available_balance || 0, currency)}
                  </div>
                </div>
                {selectedBankAccount === account.id && (
                  <CheckIcon className="h-5 w-5 text-blue-600" />
                )}
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Digital Signature */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h3 className="text-lg font-medium mb-4">Authorization Signature</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name (as it appears on bank account)
            </label>
            <input
              type="text"
              value={signatureName}
              onChange={(e) => setSignatureName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your full name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date of Signature
            </label>
            <input
              type="date"
              value={signatureDate}
              onChange={(e) => setSignatureDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="mt-4">
            <label className="flex items-start">
              <input
                type="checkbox"
                checked={confirmationChecked}
                onChange={(e) => setConfirmationChecked(e.target.checked)}
                className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">
                I authorize Dott to debit my bank account for the total amount of{' '}
                <span className="font-bold">{formatCurrency(totalWithFee, currency)}</span> to fund this payroll.
                I understand that this includes a platform fee of {formatCurrency(platformFee, currency)} (2.4%).
                The funds will be distributed to employees on {formatDate(payrollRun.pay_date)}.
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4">
        <button
          onClick={onCancel}
          disabled={loading}
          className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleApprove}
          disabled={loading || !selectedBankAccount || !signatureName || !confirmationChecked}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {loading ? (
            <>
              <ButtonSpinner />
              <span className="ml-2">Processing...</span>
            </>
          ) : (
            'Approve and Process Payroll'
          )}
        </button>
      </div>
    </div>
  );
};

export default PayrollApproval;