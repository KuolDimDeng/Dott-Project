'use client';

import React, { useState, useEffect } from 'react';
import { useNotification } from '@/context/NotificationContext';
import { BanknotesIcon, PlusIcon, TrashIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { bankAccountsApi } from '@/services/api/banking';
// Import ConnectBank dynamically to handle potential loading issues
import dynamic from 'next/dynamic';

const ConnectBank = dynamic(
  () => import('@/app/dashboard/components/forms/ConnectBank'),
  {
    loading: () => <div className="text-center p-4">Loading bank connection...</div>,
    ssr: false
  }
);
import { CenteredSpinner } from '@/components/ui/StandardSpinner';
import { logger } from '@/utils/logger';
import BankConnectionsDebug from './BankConnectionsDebug';

const BankConnections = () => {
  const { notifySuccess, notifyError } = useNotification();
  const [loading, setLoading] = useState(true);
  const [connectedAccounts, setConnectedAccounts] = useState([]);
  const [businessCountry, setBusinessCountry] = useState(null);
  const [showConnectModal, setShowConnectModal] = useState(false);

  useEffect(() => {
    loadBankAccounts();
    loadBusinessCountry();
  }, []);

  const loadBusinessCountry = async () => {
    console.log('🔍🔍🔍 [BankConnections] === START LOADING BUSINESS COUNTRY ===');
    console.log('🔍🔍🔍 [BankConnections] Current businessCountry state:', businessCountry);
    
    try {
      console.log('🔍🔍🔍 [BankConnections] Fetching /api/users/me...');
      const response = await fetch('/api/users/me', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      console.log('🔍🔍🔍 [BankConnections] Response status:', response.status);
      console.log('🔍🔍🔍 [BankConnections] Response ok:', response.ok);
      
      if (!response.ok) {
        console.error('🔍🔍🔍 [BankConnections] Failed to load user profile:', response.status);
        const errorText = await response.text();
        console.error('🔍🔍🔍 [BankConnections] Error response:', errorText);
        console.error('🔍🔍🔍 [BankConnections] DEFAULTING TO US DUE TO API ERROR');
        setBusinessCountry('US'); // Default to US
        return;
      }
      
      const data = await response.json();
      
      // Debug log the full response
      console.log('🔍🔍🔍 [BankConnections] Full API response:', JSON.stringify(data, null, 2));
      console.log('🔍🔍🔍 [BankConnections] data.country value:', data.country);
      console.log('🔍🔍🔍 [BankConnections] data.business_country value:', data.business_country);
      console.log('🔍🔍🔍 [BankConnections] data.country type:', typeof data.country);
      console.log('🔍🔍🔍 [BankConnections] data.business_country type:', typeof data.business_country);
      
      // Get country from the user profile (backend returns 'country' not 'business_country')
      const country = data.country || data.business_country || 'US';
      
      console.log('🔍🔍🔍 [BankConnections] Selected country:', country);
      console.log('🔍🔍🔍 [BankConnections] Why this country was selected:');
      if (data.country) {
        console.log('🔍🔍🔍   - Using data.country:', data.country);
      } else if (data.business_country) {
        console.log('🔍🔍🔍   - Using data.business_country:', data.business_country);
      } else {
        console.log('🔍🔍🔍   - DEFAULTING TO US (no country in response)');
      }
      
      console.log('🔍🔍🔍 [BankConnections] Setting businessCountry to:', country);
      setBusinessCountry(country);
      console.log('🔍🔍🔍 [BankConnections] businessCountry state will be updated to:', country);
      
    } catch (error) {
      console.error('🔍🔍🔍 [BankConnections] Error loading business country:', error);
      console.error('🔍🔍🔍 [BankConnections] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      console.error('🔍🔍🔍 [BankConnections] DEFAULTING TO US DUE TO EXCEPTION');
      setBusinessCountry('US'); // Default to US
    }
    
    console.log('🔍🔍🔍 [BankConnections] === END LOADING BUSINESS COUNTRY ===');
  };

  const loadBankAccounts = async () => {
    logger.info('🎯 [BankConnections] === LOADING BANK ACCOUNTS ===');
    setLoading(true);
    
    try {
      // Direct fetch with better error handling
      const response = await fetch('/api/banking/accounts', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      logger.debug('🎯 [BankConnections] Response status:', response.status);
      logger.debug('🎯 [BankConnections] Response ok:', response.ok);

      if (!response.ok) {
        // Handle specific HTTP errors
        if (response.status === 404) {
          logger.info('🎯 [BankConnections] No accounts found (404)');
          setConnectedAccounts([]);
          return;
        }
        
        const errorText = await response.text();
        logger.error('🎯 [BankConnections] HTTP error:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      logger.debug('🎯 [BankConnections] Raw API response:', data);
      
      // Handle both array and object responses
      let accountsData = [];
      if (data) {
        if (Array.isArray(data)) {
          accountsData = data;
        } else if (data.data && Array.isArray(data.data)) {
          accountsData = data.data;
        } else if (data.accounts && Array.isArray(data.accounts)) {
          accountsData = data.accounts;
        }
      }
      
      // Transform accounts to include status and metadata
      const accounts = accountsData.map(account => ({
        ...account,
        status: account.is_active ? 'connected' : 'disconnected',
        provider: account.integration_type || account.provider || 'plaid',
        lastSync: account.last_sync || account.updated_at,
        balance: account.balance || null
      }));

      setConnectedAccounts(accounts);
      logger.info('🎯 [BankConnections] Loaded accounts count:', accounts.length);
      
    } catch (error) {
      logger.error('🎯 [BankConnections] Error loading bank accounts:', error);
      logger.error('🎯 [BankConnections] Full error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      // Set empty array to show empty state instead of hanging
      setConnectedAccounts([]);
      
      // Only show error notification if it's not a 404 (no accounts)
      if (!error.message?.includes('404') && !error.message?.includes('No accounts')) {
        notifyError('Failed to load bank accounts');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConnectNewAccount = () => {
    logger.debug('🎯 [BankConnections] Opening connect modal');
    setShowConnectModal(true);
  };

  const handleDisconnectAccount = async (account) => {
    logger.info('🎯 [BankConnections] === DISCONNECTING ACCOUNT ===');
    logger.debug('🎯 [BankConnections] Account ID:', account.id);

    const confirmDisconnect = window.confirm(
      `Are you sure you want to disconnect ${account.bank_name}? This will not affect past transactions but will stop automatic syncing.`
    );

    if (!confirmDisconnect) return;

    try {
      await bankAccountsApi.delete(account.id);
      notifySuccess(`${account.bank_name} disconnected successfully`);
      logger.info('🎯 [BankConnections] Account disconnected successfully');
      loadBankAccounts();
    } catch (error) {
      logger.error('🎯 [BankConnections] Error disconnecting account:', error);
      notifyError('Failed to disconnect account');
    }
  };

  const handleBankConnected = async (bankData) => {
    logger.info('🎯 [BankConnections] === BANK CONNECTED ===');
    logger.debug('🎯 [BankConnections] Bank data:', bankData);
    
    try {
      notifySuccess(`${bankData.bank_name} connected successfully`);
      setShowConnectModal(false);
      loadBankAccounts();
    } catch (error) {
      logger.error('🎯 [BankConnections] Error handling bank connection:', error);
      notifyError('Failed to complete bank connection setup');
    }
  };

  const getProviderDisplay = (provider) => {
    const providerMap = {
      'plaid': 'Plaid',
      'wise': 'Wise',
      'stripe': 'Stripe Connect',
      'dlocal': 'DLocal',
      'salt_edge': 'Salt Edge',
      'yodlee': 'Yodlee'
    };
    
    return providerMap[provider] || provider?.charAt(0).toUpperCase() + provider?.slice(1);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'connected':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'disconnected':
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <div className="h-5 w-5 rounded-full bg-yellow-400 animate-pulse" />;
    }
  };

  const shouldUseWise = () => {
    console.log('🔍🔍🔍 [shouldUseWise] === DETERMINING PROVIDER ===');
    console.log('🔍🔍🔍 [shouldUseWise] Current businessCountry:', businessCountry);
    console.log('🔍🔍🔍 [shouldUseWise] businessCountry type:', typeof businessCountry);
    
    // Plaid only works well in these countries
    const plaidCountries = [
      'US', // United States
      'CA', // Canada
      'GB', // United Kingdom
      'FR', // France
      'ES', // Spain
      'NL', // Netherlands
      'IE', // Ireland
      'DE', // Germany (limited)
      'DK', // Denmark (limited)
      'NO', // Norway (limited)
      'SE', // Sweden (limited)
      'EE', // Estonia (limited)
      'LT', // Lithuania (limited)
      'LV', // Latvia (limited)
      'PL', // Poland (limited)
      'BE', // Belgium (limited)
      'AT', // Austria (limited)
      'PT', // Portugal (limited)
      'IT', // Italy (limited)
    ];
    
    console.log('🔍🔍🔍 [shouldUseWise] Plaid countries:', plaidCountries);
    console.log('🔍🔍🔍 [shouldUseWise] Is businessCountry in plaidCountries?:', plaidCountries.includes(businessCountry));
    
    // Log the decision
    const useWise = !plaidCountries.includes(businessCountry);
    console.log('🔍🔍🔍 [shouldUseWise] Decision: Use Wise?', useWise);
    console.log('🔍🔍🔍 [shouldUseWise] Provider selected:', useWise ? 'WISE' : 'PLAID');
    
    // If NOT in Plaid countries, use Wise
    return useWise;
  };

  console.log('🔍🔍🔍 [BankConnections] === RENDER PHASE ===');
  console.log('🔍🔍🔍 [BankConnections] Loading state:', loading);
  console.log('🔍🔍🔍 [BankConnections] BusinessCountry state:', businessCountry);
  console.log('🔍🔍🔍 [BankConnections] Connected accounts:', connectedAccounts.length);

  if (loading) {
    console.log('🔍🔍🔍 [BankConnections] Returning spinner (loading=true)');
    return <CenteredSpinner />;
  }

  // Pre-calculate provider to avoid multiple calls
  const useWise = shouldUseWise();
  console.log('🔍🔍🔍 [BankConnections] Rendering with Wise?', useWise);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <BanknotesIcon className="h-6 w-6 text-blue-600 mr-2" />
              Bank Account Connections
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Connect your bank accounts to sync transactions, automate payments, and streamline your financial operations.
            </p>
          </div>
          <button
            onClick={handleConnectNewAccount}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Connect Bank Account
          </button>
        </div>
        
        {/* Security Note */}
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>🔒 Security:</strong> We use {useWise ? 'Wise' : 'Plaid'} for secure bank connections 
            in your region ({businessCountry || 'detecting...'}). Your credentials are never stored on our servers.
          </p>
        </div>
      </div>

      {/* Connected Accounts */}
      {connectedAccounts.length > 0 ? (
        <div className="bg-white shadow-sm rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Connected Accounts ({connectedAccounts.length})</h3>
            <p className="text-sm text-gray-500">Manage your connected bank accounts and their sync status</p>
          </div>
          
          <div className="divide-y divide-gray-200">
            {connectedAccounts.map((account) => (
              <div key={account.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {getStatusIcon(account.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {account.bank_name || 'Unknown Bank'}
                        </p>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {getProviderDisplay(account.provider)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 mt-1">
                        <p className="text-sm text-gray-500">
                          Account: ****{account.account_number?.slice(-4) || '****'}
                        </p>
                        <p className="text-sm text-gray-500">
                          Type: {account.account_type || 'Checking'}
                        </p>
                        {account.balance && (
                          <p className="text-sm text-gray-500">
                            Balance: ${account.balance.toLocaleString()}
                          </p>
                        )}
                      </div>
                      {account.lastSync && (
                        <p className="text-xs text-gray-400 mt-1">
                          Last synced: {new Date(account.lastSync).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      account.status === 'connected' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {account.status === 'connected' ? 'Active' : 'Disconnected'}
                    </span>
                    
                    <button
                      onClick={() => handleDisconnectAccount(account)}
                      className="text-red-600 hover:text-red-700 p-1"
                      title="Disconnect account"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white shadow-sm rounded-lg p-12 text-center">
          <BanknotesIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No bank accounts connected</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by connecting your first bank account to sync transactions and automate payments.
          </p>
          <div className="mt-6">
            <button
              onClick={handleConnectNewAccount}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Connect Your First Bank Account
            </button>
          </div>
        </div>
      )}

      {/* Usage Information */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">How Connected Accounts Are Used</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-sm">1</span>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900">Transaction Sync</h4>
              <p className="text-sm text-gray-500">Automatically import and categorize your business transactions</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-semibold text-sm">2</span>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900">Payment Processing</h4>
              <p className="text-sm text-gray-500">Process payroll, vendor payments, and customer transfers</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-purple-600 font-semibold text-sm">3</span>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900">Financial Reports</h4>
              <p className="text-sm text-gray-500">Generate accurate cash flow and reconciliation reports</p>
            </div>
          </div>
        </div>
      </div>

      {/* Connect Bank Modal */}
      {showConnectModal && (
        <div className="absolute inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Connect Bank Account</h3>
              <button
                onClick={() => setShowConnectModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Load the actual ConnectBank component */}
            <ConnectBank
              preferredProvider={useWise ? { provider: 'wise', name: 'Wise', description: 'International bank connections' } : { provider: 'plaid', name: 'Plaid', description: 'Secure bank connections for US & Europe' }}
              businessCountry={businessCountry}
              autoConnect={false}
              onSuccess={handleBankConnected}
              onClose={() => setShowConnectModal(false)}
            />
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500 text-center">
        Debug: Connected Accounts: {connectedAccounts.length} | Country: {businessCountry} | Provider: {useWise ? 'Wise' : 'Plaid'}
      </div>
      
      {/* Temporary Debug Component */}
      <BankConnectionsDebug />
    </div>
  );
};

export default BankConnections;