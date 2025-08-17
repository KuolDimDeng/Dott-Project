'use client';

import React, { useState, useEffect } from 'react';
import {
  CreditCardIcon,
  DocumentTextIcon,
  UserGroupIcon,
  ReceiptRefundIcon,
  BuildingOfficeIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

/**
 * Module Account Settings Component
 * Shows each payment module and allows selecting which bank account to use
 */
export default function ModuleAccountSettings({ bankAccounts, onUpdate }) {
  const [settings, setSettings] = useState({
    pos: null,
    invoices: null,
    payroll: null,
    expenses: null,
    vendors: null
  });
  const [saving, setSaving] = useState(null);

  // Initialize settings from bank accounts
  useEffect(() => {
    if (bankAccounts && bankAccounts.length > 0) {
      const newSettings = {
        pos: null,
        invoices: null,
        payroll: null,
        expenses: null,
        vendors: null
      };

      // Find which accounts are set as defaults
      bankAccounts.forEach(account => {
        if (account.is_default_for_pos) newSettings.pos = account.id;
        if (account.is_default_for_invoices) newSettings.invoices = account.id;
        if (account.is_default_for_payroll) newSettings.payroll = account.id;
        if (account.is_default_for_expenses) newSettings.expenses = account.id;
        if (account.is_default_for_vendors) newSettings.vendors = account.id;
      });

      // Only update if settings actually changed to prevent resetting during saves
      setSettings(prev => {
        const hasChanged = JSON.stringify(prev) !== JSON.stringify(newSettings);
        if (hasChanged) {
          console.log('[ModuleAccountSettings] Settings changed from:', prev, 'to:', newSettings);
          return newSettings;
        }
        return prev;
      });
    }
  }, [bankAccounts]);

  const modules = [
    {
      id: 'pos',
      name: 'Point of Sale',
      description: 'Credit card payments from POS system',
      icon: CreditCardIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      id: 'invoices',
      name: 'Invoices',
      description: 'Customer invoice payments',
      icon: DocumentTextIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      id: 'payroll',
      name: 'Payroll',
      description: 'Employee salary disbursements',
      icon: UserGroupIcon,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    {
      id: 'expenses',
      name: 'Expense Reimbursements',
      description: 'Employee expense repayments',
      icon: ReceiptRefundIcon,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      id: 'vendors',
      name: 'Vendor Payments',
      description: 'Supplier and vendor payments',
      icon: BuildingOfficeIcon,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    }
  ];

  const handleAccountChange = async (moduleId, accountId) => {
    if (!accountId) return;

    setSaving(moduleId);
    console.log(`[ModuleAccountSettings] Setting ${moduleId} default to account ${accountId}`);
    console.log(`[ModuleAccountSettings] Current settings:`, settings);
    console.log(`[ModuleAccountSettings] Available accounts:`, bankAccounts?.map(a => ({id: a.id, name: a.bank_name, is_default_for_pos: a.is_default_for_pos})));

    try {
      const response = await fetch(`/api/banking/${moduleId}/set-default`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ account_id: accountId })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || `${moduleId} default account updated`);
        
        // Update local state
        setSettings(prev => ({
          ...prev,
          [moduleId]: accountId
        }));

        // Notify parent to refresh after a short delay to allow backend to update
        if (onUpdate) {
          setTimeout(() => {
            onUpdate();
          }, 1000); // 1 second delay
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error(`[ModuleAccountSettings] Error setting ${moduleId} default:`, errorData);
        toast.error(errorData.error || `Failed to update ${moduleId} settings`);
      }
    } catch (error) {
      console.error(`[ModuleAccountSettings] Error:`, error);
      toast.error(`Failed to update ${moduleId} settings`);
    } finally {
      setSaving(null);
    }
  };

  // Only show verified bank accounts in dropdowns
  const verifiedAccounts = bankAccounts?.filter(acc => acc.is_verified) || [];

  if (verifiedAccounts.length === 0) {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <BanknotesIcon className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              No verified bank accounts available. Please add and verify a bank account first.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Payment Module Settings
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Configure which bank account receives payments for each module
        </p>
      </div>

      <ul className="divide-y divide-gray-200">
        {modules.map(module => {
          const Icon = module.icon;
          return (
            <li key={module.id} className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center flex-1">
                  <div className={`flex-shrink-0 p-2 rounded-lg ${module.bgColor}`}>
                    <Icon className={`h-6 w-6 ${module.color}`} />
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {module.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {module.description}
                    </p>
                  </div>
                </div>
                
                <div className="ml-4">
                  <select
                    value={settings[module.id] || ''}
                    onChange={(e) => handleAccountChange(module.id, e.target.value)}
                    disabled={saving === module.id}
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    <option value="">Select account...</option>
                    {verifiedAccounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.bank_name} (****{account.last4 || account.account_last4 || '****'}) [{account.id.substring(0, 8)}...]
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Show current selection */}
              {settings[module.id] && (
                <div className="mt-2 ml-14">
                  <span className="text-xs text-gray-500">
                    Currently using: {
                      verifiedAccounts.find(acc => acc.id === settings[module.id])?.bank_name
                    }
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}