'use client';

import React from 'react';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { BuildingLibraryIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

/**
 * Reusable account selector component for Banking pages
 * Shows connected accounts with balances and allows selection
 */
const AccountSelector = ({ 
  selectedAccountId, 
  onAccountChange, 
  label = "Bank Account",
  placeholder = "Select account",
  showBalance = true,
  className = "",
  required = false 
}) => {
  const { 
    accounts, 
    loading, 
    hasConnectedAccounts, 
    getActiveAccounts, 
    formatBalance 
  } = useBankAccounts();

  const activeAccounts = getActiveAccounts();

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (!hasConnectedAccounts) {
    return (
      <div className={className}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
        <div className="relative">
          <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 text-sm">
            <div className="flex items-center justify-between">
              <span>No bank accounts connected</span>
              <BuildingLibraryIcon className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <Link
              href="/Settings?tab=banking"
              className="text-sm text-blue-600 hover:text-blue-500 font-medium"
            >
              Connect bank account →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          value={selectedAccountId || ''}
          onChange={(e) => onAccountChange?.(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
          required={required}
        >
          <option value="">{placeholder}</option>
          {activeAccounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.displayName}
              {showBalance && account.balance ? ` - ${formatBalance(account.balance)}` : ''}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
      </div>
      
      {activeAccounts.length > 0 && (
        <div className="mt-1 text-xs text-gray-500">
          {activeAccounts.length} account{activeAccounts.length !== 1 ? 's' : ''} available
        </div>
      )}
    </div>
  );
};

/**
 * Simple account display component for showing selected account info
 */
export const AccountDisplay = ({ accountId, showBalance = true, compact = false }) => {
  const { getAccountById, formatBalance } = useBankAccounts();
  const account = getAccountById(accountId);

  if (!account) {
    return (
      <div className="text-sm text-gray-500">
        No account selected
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        <BuildingLibraryIcon className="h-4 w-4 text-gray-400" />
        <span className="text-sm text-gray-900">{account.bankName}</span>
        <span className="text-xs text-gray-500">{account.maskedAccountNumber}</span>
      </div>
    );
  }

  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">{account.bankName}</p>
          <p className="text-xs text-gray-500">
            {account.maskedAccountNumber} • {account.accountType}
          </p>
        </div>
        {showBalance && account.balance && (
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-900">
              {formatBalance(account.balance)}
            </p>
            <p className="text-xs text-gray-500">{account.currency}</p>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Account list component for showing multiple accounts
 */
export const AccountList = ({ 
  onAccountSelect, 
  selectedAccountId, 
  showBalances = true,
  allowMultiple = false 
}) => {
  const { getActiveAccounts, formatBalance } = useBankAccounts();
  const activeAccounts = getActiveAccounts();

  if (activeAccounts.length === 0) {
    return (
      <div className="text-center py-8">
        <BuildingLibraryIcon className="mx-auto h-8 w-8 text-gray-400" />
        <p className="mt-2 text-sm text-gray-500">No connected accounts</p>
        <Link
          href="/Settings?tab=banking"
          className="mt-2 text-sm text-blue-600 hover:text-blue-500 font-medium"
        >
          Connect account →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {activeAccounts.map((account) => (
        <div
          key={account.id}
          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
            selectedAccountId === account.id
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => onAccountSelect?.(account.id)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <input
                type={allowMultiple ? 'checkbox' : 'radio'}
                checked={selectedAccountId === account.id}
                onChange={() => onAccountSelect?.(account.id)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <div>
                <p className="text-sm font-medium text-gray-900">{account.bankName}</p>
                <p className="text-xs text-gray-500">
                  {account.maskedAccountNumber} • {account.accountType}
                </p>
              </div>
            </div>
            {showBalances && account.balance && (
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {formatBalance(account.balance)}
                </p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AccountSelector;