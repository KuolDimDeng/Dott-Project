'use client';


import React, { useState, useEffect } from 'react';
import ConnectBank from './ConnectBank';
import { bankAccountsApi } from '@/services/api/banking';
import { logger } from '@/utils/logger';

/**
 * ConnectBankManagement component
 * A comprehensive interface for connecting to bank accounts based on business location
 */
const ConnectBankManagement = () => {
  const [activeTab, setActiveTab] = useState('connect');
  const [businessCountry, setBusinessCountry] = useState('');
  const [preferredProvider, setPreferredProvider] = useState(null);
  const [connectedAccounts, setConnectedAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Set default business country to US (Auth0 integration can be added later)
    const fetchBusinessCountry = async () => {
      try {
        // Default to US for now - can be enhanced with Auth0 profile data later
        setBusinessCountry('US');
        return 'US';
      } catch (err) {
        logger.error('Error setting business country:', err);
        setBusinessCountry('US');
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

    // Get the preferred payment gateway from backend
    const getPaymentGatewayFromBackend = async (countryCode) => {
      try {
        const response = await axiosInstance.get(`/api/banking/payment-gateway/?country=${countryCode}`);
        if (response.data && response.data.primary) {
          const gateway = response.data.primary.toLowerCase();
          setPreferredProvider(gateway);
          console.log(`Using payment gateway for ${countryCode}: ${gateway}`);
          return gateway;
        } else {
          console.warn(`No payment gateway found for country ${countryCode}, using default`);
          setPreferredProvider('plaid');
          return 'plaid';
        }
      } catch (err) {
        console.error('Error fetching payment gateway:', err);
        setPreferredProvider('plaid');
        return 'plaid';
      }
    };

    // Initialize everything
    const init = async () => {
      const country = await fetchBusinessCountry();
      await getPaymentGatewayFromBackend(country);
      await fetchConnectedAccounts();
    };

    init();
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };
  
  const handleDisconnectAccount = async (accountId) => {
    if (window.confirm('Are you sure you want to disconnect this account?')) {
      try {
        await axiosInstance.delete(`/api/banking/connected-accounts/${accountId}/`);
        // Refresh the list after disconnecting
        setConnectedAccounts(connectedAccounts.filter(account => account.id !== accountId));
      } catch (err) {
        console.error('Error disconnecting account:', err);
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
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
              </div>
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
                            <button className="text-indigo-600 hover:text-indigo-900 mr-2">View</button>
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

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="flex items-center border-b border-gray-200 mb-4">
        <h1 className="text-2xl font-bold p-6">Banking Connection Manager</h1>
      </div>

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
            Connect Bank
          </button>
          <button
            className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
              activeTab === 'manage'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => handleTabChange('manage')}
          >
            Manage Connections
          </button>
        </nav>
      </div>

      <div className="p-4">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default ConnectBankManagement; 