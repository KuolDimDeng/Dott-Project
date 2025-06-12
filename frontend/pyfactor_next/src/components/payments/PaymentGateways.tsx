'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { CreditCard, AlertCircle, CheckCircle, XCircle, Shield, Settings, Activity, Key } from 'lucide-react';

interface PaymentGateway {
  id: string;
  name: string;
  provider: string;
  status: 'active' | 'inactive' | 'pending';
  supportedMethods: string[];
  transactionFee: number;
  monthlyFee: number;
  setupDate: string;
  lastActivity?: string;
  transactionCount: number;
  totalVolume: number;
  successRate: number;
  apiStatus: 'connected' | 'disconnected' | 'error';
}

const PaymentGateways: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gateways, setGateways] = useState<PaymentGateway[]>([]);
  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);

  useEffect(() => {
    fetchGateways();
  }, []);

  const fetchGateways = async () => {
    try {
      setLoading(true);
      // Simulating API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data
      const mockData: PaymentGateway[] = [
        {
          id: '1',
          name: 'Stripe Production',
          provider: 'Stripe',
          status: 'active',
          supportedMethods: ['credit_card', 'debit_card', 'bank_transfer', 'apple_pay', 'google_pay'],
          transactionFee: 2.9,
          monthlyFee: 0,
          setupDate: '2023-01-15',
          lastActivity: '2024-01-22T15:30:00Z',
          transactionCount: 1542,
          totalVolume: 125420.50,
          successRate: 98.5,
          apiStatus: 'connected'
        },
        {
          id: '2',
          name: 'PayPal Business',
          provider: 'PayPal',
          status: 'active',
          supportedMethods: ['paypal', 'credit_card', 'debit_card'],
          transactionFee: 3.49,
          monthlyFee: 0,
          setupDate: '2023-03-20',
          lastActivity: '2024-01-22T14:45:00Z',
          transactionCount: 856,
          totalVolume: 68900.00,
          successRate: 97.2,
          apiStatus: 'connected'
        },
        {
          id: '3',
          name: 'Square Payments',
          provider: 'Square',
          status: 'inactive',
          supportedMethods: ['credit_card', 'debit_card', 'square_cash'],
          transactionFee: 2.75,
          monthlyFee: 0,
          setupDate: '2023-06-10',
          lastActivity: '2023-12-15T10:00:00Z',
          transactionCount: 234,
          totalVolume: 15600.00,
          successRate: 96.8,
          apiStatus: 'disconnected'
        },
        {
          id: '4',
          name: 'Authorize.Net',
          provider: 'Authorize.Net',
          status: 'pending',
          supportedMethods: ['credit_card', 'debit_card', 'echeck'],
          transactionFee: 2.9,
          monthlyFee: 25,
          setupDate: '2024-01-20',
          transactionCount: 0,
          totalVolume: 0,
          successRate: 0,
          apiStatus: 'error'
        }
      ];
      
      setGateways(mockData);
      setError(null);
    } catch (err) {
      setError('Failed to fetch payment gateways');
      console.error('Error fetching gateways:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'inactive':
        return <XCircle className="w-5 h-5 text-gray-400" />;
      case 'pending':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getApiStatusBadge = (status: string) => {
    const colors = {
      connected: 'bg-green-100 text-green-800',
      disconnected: 'bg-gray-100 text-gray-800',
      error: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status as keyof typeof colors]}`}>
        {status}
      </span>
    );
  };

  const getProviderLogo = (provider: string) => {
    // In a real app, these would be actual logo images
    const colors = {
      'Stripe': 'bg-purple-100 text-purple-600',
      'PayPal': 'bg-blue-100 text-blue-600',
      'Square': 'bg-gray-800 text-white',
      'Authorize.Net': 'bg-orange-100 text-orange-600'
    };
    
    return (
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold ${colors[provider as keyof typeof colors]}`}>
        {provider.charAt(0)}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const activeGateways = gateways.filter(g => g.status === 'active').length;
  const totalVolume = gateways.reduce((sum, g) => sum + g.totalVolume, 0);
  const totalTransactions = gateways.reduce((sum, g) => sum + g.transactionCount, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Gateways</h1>
        <p className="text-gray-600">Configure and manage payment gateway integrations</p>
      </div>

      {/* Debug Info */}
      {user && (
        <div className="mb-4 p-3 bg-gray-100 rounded-lg text-sm text-gray-600">
          <p>Tenant ID: {user.tenantId}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Gateways</p>
              <p className="text-2xl font-bold text-gray-900">{activeGateways}</p>
            </div>
            <Shield className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Volume</p>
              <p className="text-2xl font-bold text-gray-900">${totalVolume.toFixed(2)}</p>
            </div>
            <CreditCard className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Transactions</p>
              <p className="text-2xl font-bold text-gray-900">{totalTransactions}</p>
            </div>
            <Activity className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Success Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {gateways.length > 0 
                  ? `${(gateways.reduce((sum, g) => sum + g.successRate, 0) / gateways.length).toFixed(1)}%`
                  : '0%'}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Add Gateway Button */}
      <div className="mb-6">
        <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          + Add Payment Gateway
        </button>
      </div>

      {/* Gateways Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {gateways.map((gateway) => (
          <div key={gateway.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                {getProviderLogo(gateway.provider)}
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">{gateway.name}</h3>
                  <p className="text-sm text-gray-500">{gateway.provider}</p>
                </div>
              </div>
              {getStatusIcon(gateway.status)}
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">API Status</span>
                {getApiStatusBadge(gateway.apiStatus)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Transaction Fee</span>
                <span className="text-sm font-medium">{gateway.transactionFee}% + ${(0.30).toFixed(2)}</span>
              </div>
              {gateway.monthlyFee > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Monthly Fee</span>
                  <span className="text-sm font-medium">${gateway.monthlyFee}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Success Rate</span>
                <span className="text-sm font-medium">
                  {gateway.successRate > 0 ? `${gateway.successRate}%` : 'N/A'}
                </span>
              </div>
            </div>

            <div className="border-t pt-3">
              <div className="flex flex-wrap gap-1 mb-3">
                {gateway.supportedMethods.map((method, index) => (
                  <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                    {method.replace('_', ' ')}
                  </span>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  {gateway.transactionCount} transactions
                  {gateway.lastActivity && (
                    <div>Last: {new Date(gateway.lastActivity).toLocaleString()}</div>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSelectedGateway(gateway);
                    setShowConfigModal(true);
                  }}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Configuration Modal */}
      {showConfigModal && selectedGateway && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Configure {selectedGateway.name}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Key
                </label>
                <div className="flex items-center">
                  <input
                    type="password"
                    placeholder="Enter API key"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue="••••••••••••••••"
                  />
                  <Key className="w-5 h-5 text-gray-400 ml-2" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Webhook URL
                </label>
                <input
                  type="text"
                  placeholder="https://your-domain.com/webhook"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue="https://api.example.com/webhooks/stripe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue={selectedGateway.status}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="testMode"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="testMode" className="ml-2 text-sm text-gray-700">
                  Enable test mode
                </label>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentGateways;