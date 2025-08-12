'use client';

import React, { useState, useEffect } from 'react';
import { useNotification } from '@/context/NotificationContext';
import { BanknotesIcon, CreditCardIcon, ArrowPathIcon, ShoppingCartIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { bankAccountsApi } from '@/services/api/banking';
import ConnectBank from '@/app/dashboard/components/forms/ConnectBank';
import { CenteredSpinner } from '@/components/ui/StandardSpinner';

const BankConnections = () => {
  const { notifySuccess, notifyError } = useNotification();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState({
    payroll: null,
    payments: null,
    transfers: null,
    sales: null
  });
  const [businessCountry, setBusinessCountry] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [showConnectModal, setShowConnectModal] = useState(false);

  // Account type configurations
  const accountTypes = [
    {
      id: 'payroll',
      title: 'Payroll Account',
      description: 'Bank account for paying employees and processing payroll',
      icon: BanknotesIcon,
      color: 'blue',
      usage: 'Used for: Employee salaries, tax payments, benefits deductions'
    },
    {
      id: 'payments',
      title: 'Customer Payments',
      description: 'Receive customer payments via bank transfer (ACH/Wire)',
      icon: CreditCardIcon,
      color: 'green',
      usage: 'Alternative to Stripe for bank transfers. Default: Stripe for cards'
    },
    {
      id: 'transfers',
      title: 'Vendor Transfers',
      description: 'Bank account for paying vendors and suppliers',
      icon: ArrowPathIcon,
      color: 'purple',
      usage: 'Used for: Vendor payments, operating expenses, bill payments'
    },
    {
      id: 'sales',
      title: 'Sales Revenue',
      description: 'Receive sales revenue and income via bank transfer',
      icon: ShoppingCartIcon,
      color: 'orange',
      usage: 'Used for: Invoice payments, sales deposits, revenue collection'
    }
  ];

  useEffect(() => {
    loadBankAccounts();
    loadBusinessCountry();
  }, []);

  const loadBusinessCountry = async () => {
    try {
      const response = await fetch('/api/tenant/profile');
      const data = await response.json();
      setBusinessCountry(data.country || 'US');
    } catch (error) {
      console.error('Error loading business country:', error);
      setBusinessCountry('US'); // Default to US
    }
  };

  const loadBankAccounts = async () => {
    setLoading(true);
    try {
      const response = await bankAccountsApi.list();
      const accountsByType = {
        payroll: null,
        payments: null,
        transfers: null,
        sales: null
      };

      // Map accounts to their purposes
      response.data?.forEach(account => {
        if (account.purpose && accountsByType.hasOwnProperty(account.purpose)) {
          accountsByType[account.purpose] = account;
        }
      });

      setAccounts(accountsByType);
    } catch (error) {
      console.error('Error loading bank accounts:', error);
      notifyError('Failed to load bank accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectAccount = (type) => {
    setSelectedType(type);
    setShowConnectModal(true);
  };

  const handleDisconnectAccount = async (type) => {
    if (!accounts[type]) return;

    const confirmDisconnect = window.confirm(
      `Are you sure you want to disconnect your ${type} bank account? This will not affect past transactions.`
    );

    if (!confirmDisconnect) return;

    try {
      await bankAccountsApi.delete(accounts[type].id);
      notifySuccess(`${type} account disconnected successfully`);
      loadBankAccounts();
    } catch (error) {
      console.error('Error disconnecting account:', error);
      notifyError('Failed to disconnect account');
    }
  };

  const handleBankConnected = async (bankData) => {
    try {
      // Update the account with its purpose
      await bankAccountsApi.update(bankData.id, { purpose: selectedType });
      notifySuccess(`${selectedType} account connected successfully`);
      setShowConnectModal(false);
      setSelectedType(null);
      loadBankAccounts();
    } catch (error) {
      console.error('Error updating account purpose:', error);
      notifyError('Failed to update account purpose');
    }
  };

  const getProviderDisplay = (account) => {
    if (!account) return null;
    
    const provider = account.integration_type || account.provider;
    const providerMap = {
      'plaid': 'Plaid',
      'wise': 'Wise',
      'stripe': 'Stripe',
      'dlocal': 'DLocal',
      'salt_edge': 'Salt Edge'
    };
    
    return providerMap[provider] || provider;
  };

  const shouldUseWise = () => {
    // Countries where Plaid doesn't work well
    const wiseCountries = [
      'KE', 'NG', 'ZA', 'GH', 'UG', 'TZ', 'RW', 'ET', 'EG', 'MA', // Africa
      'IN', 'PK', 'BD', 'LK', 'NP', // South Asia
      'ID', 'MY', 'TH', 'VN', 'PH', // Southeast Asia
      'BR', 'AR', 'CL', 'CO', 'PE', 'UY', 'PY', 'BO', 'EC', 'VE', // South America
      'TR', 'AE', 'SA', 'QA', 'KW', 'BH', 'OM', 'JO', 'LB' // Middle East
    ];
    
    return wiseCountries.includes(businessCountry);
  };

  if (loading) {
    return <CenteredSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Bank Account Connections</h2>
        <p className="text-sm text-gray-600">
          Connect different bank accounts for specific business purposes. This helps maintain clean 
          accounting records and automates payment processing.
        </p>
        
        {/* Security Note */}
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Security:</strong> We use {shouldUseWise() ? 'Wise' : 'Plaid'} for secure bank connections 
            in your region. Your credentials are never stored on our servers.
          </p>
        </div>
      </div>

      {/* Account Types Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {accountTypes.map((type) => {
          const Icon = type.icon;
          const account = accounts[type.id];
          const colorClasses = {
            blue: 'text-blue-600 bg-blue-50 border-blue-200',
            green: 'text-green-600 bg-green-50 border-green-200',
            purple: 'text-purple-600 bg-purple-50 border-purple-200',
            orange: 'text-orange-600 bg-orange-50 border-orange-200'
          };

          return (
            <div key={type.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* Header */}
              <div className={`p-4 border-b ${colorClasses[type.color]}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Icon className="h-6 w-6 mr-3" />
                    <h3 className="text-lg font-medium">{type.title}</h3>
                  </div>
                  {account && (
                    <span className="text-xs px-2 py-1 bg-white rounded-full">
                      Connected
                    </span>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <p className="text-sm text-gray-600 mb-3">{type.description}</p>
                <p className="text-xs text-gray-500 mb-4">{type.usage}</p>

                {account ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{account.bank_name}</p>
                          <p className="text-xs text-gray-500">****{account.account_number?.slice(-4)}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Provider: {getProviderDisplay(account)}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDisconnectAccount(type.id)}
                          className="text-red-600 hover:text-red-700"
                          title="Disconnect account"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => handleConnectAccount(type.id)}
                    className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Connect Bank Account
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Payment Method Preferences */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Method Preferences</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900">Customer Card Payments</p>
              <p className="text-xs text-gray-500">Credit/Debit card processing</p>
            </div>
            <span className="text-sm text-gray-600">Default: Stripe</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900">Bank Transfer Payments</p>
              <p className="text-xs text-gray-500">ACH, Wire transfers</p>
            </div>
            <span className="text-sm text-gray-600">
              {accounts.payments ? 'Connected Bank Account' : 'Not configured'}
            </span>
          </div>
        </div>
      </div>

      {/* Connect Bank Modal */}
      {showConnectModal && (
        <div className="absolute inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                Connect {accountTypes.find(t => t.id === selectedType)?.title}
              </h3>
              <button
                onClick={() => {
                  setShowConnectModal(false);
                  setSelectedType(null);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <ConnectBank
              preferredProvider={shouldUseWise() ? { provider: 'wise' } : { provider: 'plaid' }}
              businessCountry={businessCountry}
              autoConnect={false}
              onSuccess={handleBankConnected}
              onClose={() => {
                setShowConnectModal(false);
                setSelectedType(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default BankConnections;