'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getSecureTenantId } from '@/utils/tenantUtils';
import { logger } from '@/utils/logger';

const PaymentGateways = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gateways, setGateways] = useState([]);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState(null);
  const [configData, setConfigData] = useState({
    apiKey: '',
    secretKey: '',
    webhookUrl: '',
    testMode: true
  });

  const tenantId = getSecureTenantId();

  const fetchGateways = useCallback(async () => {
    logger.debug('[PaymentGateways] Fetching payment gateways for tenant:', tenantId);
    setIsLoading(true);
    setError(null);

    try {
      // TODO: Replace with actual API endpoint
      const mockData = [
        {
          id: 1,
          name: 'Stripe',
          logo: '💳',
          status: 'active',
          testMode: false,
          supportedMethods: ['credit_card', 'debit_card', 'bank_transfer'],
          lastSync: '2025-01-06T10:30:00',
          monthlyVolume: 125000,
          successRate: 98.5
        },
        {
          id: 2,
          name: 'PayPal',
          logo: '🅿️',
          status: 'active',
          testMode: true,
          supportedMethods: ['credit_card', 'debit_card', 'paypal'],
          lastSync: '2025-01-06T09:45:00',
          monthlyVolume: 45000,
          successRate: 97.2
        },
        {
          id: 3,
          name: 'Square',
          logo: '⬜',
          status: 'inactive',
          testMode: true,
          supportedMethods: ['credit_card', 'debit_card'],
          lastSync: null,
          monthlyVolume: 0,
          successRate: 0
        },
        {
          id: 4,
          name: 'Authorize.Net',
          logo: '🔐',
          status: 'inactive',
          testMode: true,
          supportedMethods: ['credit_card', 'debit_card', 'ach'],
          lastSync: null,
          monthlyVolume: 0,
          successRate: 0
        }
      ];

      setGateways(mockData);
      logger.info('[PaymentGateways] Gateways loaded successfully');
    } catch (err) {
      logger.error('[PaymentGateways] Error fetching gateways:', err);
      setError(err.message || 'Failed to load payment gateways');
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchGateways();
  }, [fetchGateways]);

  const handleConfigure = (gateway) => {
    setSelectedGateway(gateway);
    setConfigData({
      apiKey: gateway.status === 'active' ? '••••••••••••' : '',
      secretKey: gateway.status === 'active' ? '••••••••••••' : '',
      webhookUrl: `https://api.dottapps.com/webhooks/${gateway.name.toLowerCase()}`,
      testMode: gateway.testMode
    });
    setShowConfigModal(true);
  };

  const handleSaveConfig = async () => {
    logger.debug('[PaymentGateways] Saving gateway configuration:', selectedGateway.name);
    setShowConfigModal(false);
    // TODO: Implement actual save logic
    await fetchGateways();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        <p className="font-semibold">Error loading payment gateways</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payment Gateways</h1>
        <p className="mt-1 text-sm text-gray-600">Configure and manage your payment gateway integrations</p>
      </div>

      {/* Gateways Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {gateways.map((gateway) => (
          <div key={gateway.id} className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center">
                <span className="text-3xl mr-3">{gateway.logo}</span>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{gateway.name}</h3>
                  <p className="text-sm text-gray-500">
                    {gateway.status === 'active' ? (
                      <span className="text-green-600">● Connected</span>
                    ) : (
                      <span className="text-gray-400">● Not Connected</span>
                    )}
                  </p>
                </div>
              </div>
              {gateway.testMode && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Test Mode
                </span>
              )}
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Supported Methods</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {gateway.supportedMethods.map((method) => (
                    <span key={method} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                      {method.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>

              {gateway.status === 'active' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Monthly Volume</p>
                      <p className="text-sm text-gray-900">{formatCurrency(gateway.monthlyVolume)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Success Rate</p>
                      <p className="text-sm text-gray-900">{gateway.successRate}%</p>
                    </div>
                  </div>
                  {gateway.lastSync && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Last Sync</p>
                      <p className="text-sm text-gray-900">
                        {new Date(gateway.lastSync).toLocaleString()}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => handleConfigure(gateway)}
                className="text-blue-600 hover:text-blue-900 text-sm font-medium"
              >
                {gateway.status === 'active' ? 'Configure' : 'Connect'}
              </button>
              {gateway.status === 'active' && (
                <button className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                  Test Connection
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Configuration Modal */}
      {showConfigModal && selectedGateway && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                Configure {selectedGateway.name}
              </h2>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Key
                </label>
                <input
                  type="text"
                  value={configData.apiKey}
                  onChange={(e) => setConfigData({ ...configData, apiKey: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter API key"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Secret Key
                </label>
                <input
                  type="password"
                  value={configData.secretKey}
                  onChange={(e) => setConfigData({ ...configData, secretKey: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter secret key"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Webhook URL
                </label>
                <input
                  type="text"
                  value={configData.webhookUrl}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Configure this URL in your {selectedGateway.name} dashboard
                </p>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={configData.testMode}
                    onChange={(e) => setConfigData({ ...configData, testMode: e.target.checked })}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Enable test mode</span>
                </label>
              </div>
            </div>

            <div className="px-6 py-4 border-t flex justify-end space-x-3">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveConfig}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500 text-center">
        Debug: Tenant ID: {tenantId} | Component: PaymentGateways | Last Updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
};

export default PaymentGateways;