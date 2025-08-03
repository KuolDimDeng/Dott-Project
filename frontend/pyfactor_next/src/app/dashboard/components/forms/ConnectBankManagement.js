'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ConnectBank from './ConnectBank';
import { bankAccountsApi } from '@/services/api/banking';
import { logger } from '@/utils/logger';
import { getSecureTenantId } from '@/utils/tenantUtils';
import { useSession } from '@/hooks/useSession-v2';
import { CenteredSpinner } from '@/components/ui/StandardSpinner';
import {
  BuildingLibraryIcon,
  LinkIcon,
  GlobeAltIcon,
  CreditCardIcon,
  CheckCircleIcon,
  QuestionMarkCircleIcon,
  DevicePhoneMobileIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';

// Tooltip component for field help
const FieldTooltip = ({ text }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  return (
    <div className="relative inline-block ml-1">
      <QuestionMarkCircleIcon 
        className="h-4 w-4 text-gray-400 cursor-help hover:text-gray-600"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      />
      {isVisible && (
        <div className="absolute z-10 w-64 p-2 text-xs text-white bg-gray-900 rounded-md shadow-lg -top-2 left-6">
          <div className="relative">
            {text}
            <div className="absolute w-2 h-2 bg-gray-900 rotate-45 -left-1 top-2"></div>
          </div>
        </div>
      )}
    </div>
  );
};

// Plaid sandbox credentials
const PLAID_SANDBOX_CONFIG = {
  clientId: process.env.NEXT_PUBLIC_PLAID_CLIENT_ID,
  secretSandbox: process.env.PLAID_SECRET_SANDBOX,
  environment: 'sandbox'
};

// Country to payment provider mapping
const COUNTRY_PAYMENT_PROVIDERS = {
  // Western countries - Plaid
  US: { provider: 'plaid', name: 'Plaid', description: 'Connect US bank accounts securely' },
  CA: { provider: 'plaid', name: 'Plaid', description: 'Connect Canadian bank accounts' },
  GB: { provider: 'plaid', name: 'Plaid', description: 'Connect UK bank accounts' },
  FR: { provider: 'plaid', name: 'Plaid', description: 'Connect French bank accounts' },
  DE: { provider: 'plaid', name: 'Plaid', description: 'Connect German bank accounts' },
  ES: { provider: 'plaid', name: 'Plaid', description: 'Connect Spanish bank accounts' },
  NL: { provider: 'plaid', name: 'Plaid', description: 'Connect Dutch bank accounts' },
  IE: { provider: 'plaid', name: 'Plaid', description: 'Connect Irish bank accounts' },
  
  // African countries - Mobile Money
  KE: { provider: 'mobilemoney', name: 'M-Pesa', description: 'Connect via M-Pesa mobile money' },
  GH: { provider: 'mobilemoney', name: 'MTN Mobile Money', description: 'Connect via MTN Mobile Money' },
  NG: { provider: 'mobilemoney', name: 'Mobile Money', description: 'Connect via mobile payment services' },
  ZA: { provider: 'mobilemoney', name: 'Mobile Money', description: 'Connect via mobile payment services' },
  UG: { provider: 'mobilemoney', name: 'MTN Mobile Money', description: 'Connect via MTN Mobile Money' },
  TZ: { provider: 'mobilemoney', name: 'M-Pesa', description: 'Connect via M-Pesa mobile money' },
  RW: { provider: 'mobilemoney', name: 'MTN Mobile Money', description: 'Connect via MTN Mobile Money' },
  
  // Default
  DEFAULT: { provider: 'plaid', name: 'Plaid', description: 'Connect your bank account securely' }
};

/**
 * ConnectBankManagement component
 * A comprehensive interface for connecting to bank accounts based on business location
 */
const ConnectBankManagement = () => {
  const [tenantId, setTenantId] = useState(null);
  const [activeTab, setActiveTab] = useState('connect');
  const [businessCountry, setBusinessCountry] = useState('');
  const [preferredProvider, setPreferredProvider] = useState(null);
  const [connectedAccounts, setConnectedAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { session } = useSession();

  // Fetch tenant ID on mount
  useEffect(() => {
    const fetchTenantId = async () => {
      const id = await getSecureTenantId();
      setTenantId(id);
    };
    fetchTenantId();
  }, []);

  // Detect country from business information
  const detectBusinessCountry = useCallback(async () => {
    try {
      // Try to get country from session/business info
      if (session?.user?.business_country) {
        return session.user.business_country;
      }
      
      // Try to get from tenant information
      if (session?.tenant?.country) {
        return session.tenant.country;
      }
      
      // Default to US
      return 'US';
    } catch (err) {
      logger.error('Error detecting business country:', err);
      return 'US';
    }
  }, [session]);

  useEffect(() => {
    if (!tenantId) return;

    const fetchBusinessCountry = async () => {
      try {
        const country = await detectBusinessCountry();
        setBusinessCountry(country);
        
        // Set preferred provider based on country
        const providerConfig = COUNTRY_PAYMENT_PROVIDERS[country] || COUNTRY_PAYMENT_PROVIDERS.DEFAULT;
        setPreferredProvider(providerConfig);
        
        logger.info(`Business country detected: ${country}, using provider: ${providerConfig.name}`);
        return country;
      } catch (err) {
        logger.error('Error setting business country:', err);
        setBusinessCountry('US');
        setPreferredProvider(COUNTRY_PAYMENT_PROVIDERS.US);
        return 'US';
      }
    };

    // Fetch connected accounts using banking API service
    const fetchConnectedAccounts = async () => {
      try {
        setLoading(true);
        const response = await bankAccountsApi.getConnectedAccounts();
        if (response.data && Array.isArray(response.data.accounts)) {
          setConnectedAccounts(response.data.accounts);
        } else {
          setConnectedAccounts([]);
        }
      } catch (err) {
        logger.error('Error fetching connected accounts:', err);
        setError('Failed to fetch connected accounts. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    // Initialize everything
    const init = async () => {
      await fetchBusinessCountry();
      await fetchConnectedAccounts();
    };

    init();
  }, [tenantId, detectBusinessCountry]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };
  
  const handleDisconnectAccount = async (accountId) => {
    if (window.confirm('Are you sure you want to disconnect this account?')) {
      try {
        await bankAccountsApi.disconnectAccount(accountId);
        // Refresh the list after disconnecting
        setConnectedAccounts(connectedAccounts.filter(account => account.id !== accountId));
      } catch (err) {
        logger.error('Error disconnecting account:', err);
        setError('Failed to disconnect account. Please try again later.');
      }
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'connect':
        return (
          <ConnectBank 
            preferredProvider={preferredProvider}
            businessCountry={businessCountry}
            autoConnect={true}
          />
        );
      case 'manage':
        return (
          <div className="p-4">
            <h2 className="text-xl font-bold mb-4">Manage Connected Accounts</h2>
            {loading ? (
              <CenteredSpinner size="medium" />
            ) : error ? (
              <div className="text-red-500">{error}</div>
            ) : connectedAccounts.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-gray-500">No bank accounts connected yet.</p>
                <button 
                  className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  onClick={() => setActiveTab('connect')}
                >
                  Connect Your First Account
                </button>
              </div>
            ) : (
              <div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bank</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provider</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {connectedAccounts.map((account, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{account.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{account.account_type || 'Unknown'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${account.balance.toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{account.provider}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button className="text-blue-600 hover:text-blue-900 mr-2">View</button>
                            <button 
                              className="text-red-600 hover:text-red-900"
                              onClick={() => handleDisconnectAccount(account.id)}
                            >
                              Disconnect
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button 
                  className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  onClick={() => setActiveTab('connect')}
                >
                  Connect Another Account
                </button>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  // Calculate stats
  const stats = {
    connectedAccounts: connectedAccounts.length,
    totalBalance: connectedAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0),
    activeProvider: preferredProvider?.name || 'Not Set',
    country: businessCountry || 'Detecting...'
  };

  // Wait for tenant ID to load
  if (!tenantId) {
    return (
      <div className="flex justify-center items-center h-64">
        <CenteredSpinner size="medium" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
            <BuildingLibraryIcon className="h-6 w-6 text-blue-600 mr-2" />
            Bank Connection Manager
          </h1>
          <p className="text-gray-600 text-sm">
            Connect your bank accounts and payment providers. We automatically detect the best connection method for your country.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-500 text-sm font-medium uppercase tracking-wide">Connected Accounts</div>
          <div className="mt-1 text-3xl font-bold text-gray-900">{stats.connectedAccounts}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-500 text-sm font-medium uppercase tracking-wide">Total Balance</div>
          <div className="mt-1 text-3xl font-bold text-blue-600">${stats.totalBalance.toFixed(2)}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-500 text-sm font-medium uppercase tracking-wide">Active Provider</div>
          <div className="mt-1 text-xl font-bold text-green-600 flex items-center">
            {preferredProvider?.provider === 'mobilemoney' ? (
              <DevicePhoneMobileIcon className="h-5 w-5 mr-1" />
            ) : (
              <BanknotesIcon className="h-5 w-5 mr-1" />
            )}
            {stats.activeProvider}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-500 text-sm font-medium uppercase tracking-wide">Business Country</div>
          <div className="mt-1 text-xl font-bold text-gray-700 flex items-center">
            <GlobeAltIcon className="h-5 w-5 mr-1" />
            {stats.country}
          </div>
        </div>
      </div>

      {/* Country Detection Alert */}
      {preferredProvider && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-md">
          <div className="flex items-center">
            <CheckCircleIcon className="h-5 w-5 mr-2" />
            <span>
              Based on your business location in <strong>{businessCountry}</strong>, 
              we recommend using <strong>{preferredProvider.name}</strong>. 
              {preferredProvider.description}
            </span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === 'connect'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => handleTabChange('connect')}
            >
              <div className="flex items-center">
                <LinkIcon className="h-4 w-4 mr-2" />
                Connect Bank
              </div>
            </button>
            <button
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === 'manage'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => handleTabChange('manage')}
            >
              <div className="flex items-center">
                <CreditCardIcon className="h-4 w-4 mr-2" />
                Manage Connections
              </div>
            </button>
          </nav>
        </div>

        <div className="p-4">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default ConnectBankManagement; 