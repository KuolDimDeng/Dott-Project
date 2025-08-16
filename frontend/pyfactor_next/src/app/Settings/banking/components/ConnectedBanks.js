'use client';

import React, { useState } from 'react';
import {
  TrashIcon,
  StarIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  BanknotesIcon,
  CreditCardIcon,
  DocumentTextIcon,
  UserGroupIcon,
  ReceiptRefundIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

/**
 * Connected Banks List Component
 * Displays connected bank accounts with their assigned modules
 */
export default function ConnectedBanks({ connections, onDisconnect, onSetPrimary }) {
  const [disconnecting, setDisconnecting] = useState(null);

  /**
   * Handle bank disconnection
   */
  const handleDisconnect = async (connection) => {
    if (!confirm(`Are you sure you want to disconnect ${connection.bank_name || connection.account_nickname || 'this bank account'}?`)) {
      return;
    }

    setDisconnecting(connection.id);
    console.log('[ConnectedBanks] Disconnecting bank connection:', connection.id);
    
    try {
      // Remove trailing slash from frontend URL (Next.js route)
      const response = await fetch(`/api/banking/connections/${connection.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log('[ConnectedBanks] Delete response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || 'Bank account disconnected');
        onDisconnect(connection.id);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('[ConnectedBanks] Delete error:', errorData);
        toast.error(errorData.error || 'Failed to disconnect bank account');
      }
    } catch (error) {
      console.error('[ConnectedBanks] Error disconnecting bank:', error);
      toast.error('Failed to disconnect bank account');
    } finally {
      setDisconnecting(null);
    }
  };

  if (!connections || connections.length === 0) {
    return null;
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Connected Bank Accounts
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Manage your connected bank accounts and set your primary account for payments.
        </p>
      </div>
      
      <ul className="divide-y divide-gray-200">
        {connections.map((connection) => {
          // Add defensive check for undefined connection
          if (!connection) return null;
          
          return (
          <li key={connection.id || Math.random()}>
            <div className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <BanknotesIcon className="h-10 w-10 text-gray-400" />
                  </div>
                  <div className="ml-4">
                    <div className="flex items-center">
                      <p className="text-sm font-medium text-gray-900">
                        {connection.bank_name || connection.account_nickname || 'Bank Account'}
                      </p>
                      {connection.is_primary && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Primary
                        </span>
                      )}
                      {connection.is_default_for_pos && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CreditCardIcon className="w-3 h-3 mr-1" />
                          POS
                        </span>
                      )}
                      {connection.is_default_for_invoices && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          <DocumentTextIcon className="w-3 h-3 mr-1" />
                          Invoices
                        </span>
                      )}
                      {connection.is_default_for_payroll && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <UserGroupIcon className="w-3 h-3 mr-1" />
                          Payroll
                        </span>
                      )}
                      {connection.is_default_for_expenses && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          <ReceiptRefundIcon className="w-3 h-3 mr-1" />
                          Expenses
                        </span>
                      )}
                      {connection.is_default_for_vendors && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                          <BuildingOfficeIcon className="w-3 h-3 mr-1" />
                          Vendors
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {connection.provider === 'plaid' ? 'Connected via Plaid' : 'Connected via Wise'}
                      {' • '}****{connection.last4 || connection.account_last4 || '****'}
                    </p>
                    <div className="mt-2 flex items-center text-sm text-gray-500">
                      {(connection.is_active !== false && connection.status !== 'inactive') ? (
                        <>
                          <CheckCircleIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-green-400" />
                          Active
                        </>
                      ) : (
                        <>
                          <ExclamationCircleIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-red-400" />
                          Inactive
                        </>
                      )}
                      {connection.created_at && (
                        <span className="ml-4">
                          Connected {new Date(connection.created_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {/* Primary Account Button */}
                  {!connection.is_primary && (connection.is_active !== false && connection.status !== 'inactive') && onSetPrimary && (
                    <button
                      onClick={() => onSetPrimary(connection.id)}
                      className="inline-flex items-center p-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      title="Set as primary"
                    >
                      <StarIcon className="h-4 w-4" />
                    </button>
                  )}
                  
                  {connection.is_primary && (
                    <button
                      disabled
                      className="inline-flex items-center p-2 border border-blue-300 rounded-md shadow-sm text-sm font-medium text-blue-700 bg-blue-50 cursor-not-allowed"
                      title="Primary account"
                    >
                      <StarIconSolid className="h-4 w-4" />
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleDisconnect(connection)}
                    disabled={disconnecting === connection.id || connection.is_primary}
                    className="inline-flex items-center p-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={connection.is_primary ? "Cannot disconnect primary account" : "Disconnect"}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </li>
          );
        })}
      </ul>
    </div>
  );
}