'use client';

import React, { useState, useEffect } from 'react';
import { 
  BuildingLibraryIcon, 
  PlusIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import { CenteredSpinner } from '@/components/ui/StandardSpinner';
import ConnectedBanks from './ConnectedBanks';
import AddBankAccount from './AddBankAccount';
import { useSession } from '@/hooks/useSession-v2';
import toast from 'react-hot-toast';

// Plaid supported countries
const PLAID_COUNTRIES = ['US', 'CA', 'GB', 'FR', 'ES', 'NL', 'IE', 'DE'];

/**
 * Main Banking Dashboard Component
 * Manages bank connections with automatic provider selection
 */
export default function BankingDashboard() {
  const { user } = useSession();
  const [loading, setLoading] = useState(true);
  const [bankConnections, setBankConnections] = useState([]);
  const [userCountry, setUserCountry] = useState(null);
  const [showAddBank, setShowAddBank] = useState(false);
  const [provider, setProvider] = useState(null);
  const [countryDetected, setCountryDetected] = useState(false);
  
  // Debug re-renders
  console.log('🔍 [BankingDashboard] Component rendered - Country:', userCountry, 'Provider:', provider, 'Detected:', countryDetected);

  useEffect(() => {
    if (!countryDetected) {
      fetchUserProfile();
    }
    fetchBankConnections();
  }, [countryDetected]);

  /**
   * Fetch user profile to get country
   */
  const fetchUserProfile = async () => {
    console.log('🔍 [BankingDashboard] === STARTING COUNTRY DETECTION ===');
    try {
      // Try the session endpoint first which has user data
      const response = await fetch('/api/auth/session-v2', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 [BankingDashboard] Full session response:', JSON.stringify(data, null, 2));
        
        // Get country from session user data - check all possible locations
        const country = data.user?.country || 
                       data.user?.business_country || 
                       data.country || 
                       data.business_country || 
                       'US';
        
        console.log('🔍 [BankingDashboard] Extracted country from session:', country);
        console.log('🔍 [BankingDashboard] Available fields in user:', data.user ? Object.keys(data.user) : 'No user object');
        
        if (country && country !== 'US') {
          // Only set if we found a non-US country
          setUserCountry(country);
          const useProvider = PLAID_COUNTRIES.includes(country) ? 'plaid' : 'wise';
          setProvider(useProvider);
          setCountryDetected(true);
          console.log(`🔍 [BankingDashboard] Session set - Country: ${country}, Provider: ${useProvider}`);
          return; // Don't try the alt endpoint
        } else {
          console.log('🔍 [BankingDashboard] Session returned US or no country, trying alt endpoint...');
        }
      } else {
        console.error('🔍 [BankingDashboard] Failed to fetch session:', response.status);
      }
      
      // Try alternative endpoints
      console.log('🔍 [BankingDashboard] Trying alternative endpoints...');
      
      // First try /api/user/profile
      let altResponse = await fetch('/api/user/profile', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      // If that fails, try /api/users/me
      if (!altResponse.ok) {
        console.log('🔍 [BankingDashboard] /api/user/profile failed, trying /api/users/me...');
        altResponse = await fetch('/api/users/me', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        });
      }
      
      if (altResponse.ok) {
        const altData = await altResponse.json();
        console.log('🔍 [BankingDashboard] Full /api/users/me response:', JSON.stringify(altData, null, 2));
        
        // Check all possible locations for country
        const country = altData.country || 
                       altData.business_country || 
                       altData.user?.country || 
                       altData.user?.business_country ||
                       altData.data?.country ||
                       altData.data?.business_country ||
                       'US';
                       
        console.log('🔍 [BankingDashboard] Extracted country from /api/users/me:', country);
        setUserCountry(country);
        
        const useProvider = PLAID_COUNTRIES.includes(country) ? 'plaid' : 'wise';
        setProvider(useProvider);
        setCountryDetected(true);
        console.log(`🔍 [BankingDashboard] /api/users/me set - Country: ${country}, Provider: ${useProvider}`);
      } else {
        console.error('🔍 [BankingDashboard] Both endpoints failed, defaulting to US');
        console.error('🔍 [BankingDashboard] /api/users/me status:', altResponse.status);
        setUserCountry('US');
        setProvider('plaid');
        setCountryDetected(true);
      }
    } catch (error) {
      console.error('🔍 [BankingDashboard] Error fetching user profile:', error);
      setUserCountry('US');
      setProvider('plaid');
      setCountryDetected(true);
    }
  };

  /**
   * Fetch existing bank connections
   */
  const fetchBankConnections = async () => {
    try {
      const response = await fetch('/api/banking/connections/', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        setBankConnections(data.connections || []);
      } else if (response.status === 404) {
        // No connections yet
        setBankConnections([]);
      } else {
        console.error('Failed to fetch bank connections:', response.status);
      }
    } catch (error) {
      console.error('Error fetching bank connections:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle successful bank connection
   */
  const handleBankConnected = (newConnection) => {
    setBankConnections([...bankConnections, newConnection]);
    setShowAddBank(false);
    toast.success('Bank account connected successfully!');
    fetchBankConnections(); // Refresh list
  };

  /**
   * Handle bank disconnection
   */
  const handleBankDisconnected = (connectionId) => {
    setBankConnections(bankConnections.filter(conn => conn.id !== connectionId));
    toast.success('Bank account disconnected');
  };

  /**
   * Set a bank as primary
   */
  const handleSetPrimary = async (connectionId) => {
    try {
      const response = await fetch(`/api/banking/connections/${connectionId}/`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_primary: true })
      });

      if (response.ok) {
        // Update local state
        setBankConnections(bankConnections.map(conn => ({
          ...conn,
          is_primary: conn.id === connectionId
        })));
        toast.success('Primary bank account updated');
      } else {
        toast.error('Failed to update primary bank account');
      }
    } catch (error) {
      console.error('Error setting primary bank:', error);
      toast.error('Failed to update primary bank account');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <CenteredSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <BuildingLibraryIcon className="h-7 w-7 text-blue-600 mr-3" />
              Banking & Payments
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Connect your bank accounts to receive payments, process payroll, and manage finances.
            </p>
          </div>
          
          {!showAddBank && (
            <button
              onClick={() => setShowAddBank(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Bank Account
            </button>
          )}
        </div>
      </div>

      {/* Security Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex">
          <ShieldCheckIcon className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-900">
              Bank-Level Security
            </h3>
            <p className="mt-1 text-sm text-blue-700">
              Your bank credentials are never stored on our servers. We use {provider === 'plaid' ? 'Plaid' : 'Stripe Connect'} 
              {' '}for secure, encrypted connections. Only the last 4 digits of your account are visible for identification.
            </p>
          </div>
        </div>
      </div>

      {/* Provider Info */}
      <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <GlobeAltIcon className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Banking Provider for {userCountry || 'your region'}
                </p>
                <p className="text-sm text-gray-500">
                  {provider === 'plaid' 
                    ? 'Using Plaid for secure bank connections in your region'
                    : 'Using Wise (via Stripe) for international banking'}
                </p>
              </div>
            </div>
            <div className="flex items-center">
              {provider === 'plaid' ? (
                <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  <CheckCircleIcon className="h-4 w-4 mr-1" />
                  Plaid
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                  <CheckCircleIcon className="h-4 w-4 mr-1" />
                  Wise
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Bank Account Form */}
      {showAddBank && (
        <AddBankAccount
          provider={provider}
          userCountry={userCountry}
          onSuccess={handleBankConnected}
          onCancel={() => setShowAddBank(false)}
        />
      )}

      {/* Connected Banks List */}
      {!showAddBank && (
        <ConnectedBanks
          connections={bankConnections}
          onDisconnect={handleBankDisconnected}
          onSetPrimary={handleSetPrimary}
        />
      )}

      {/* Empty State */}
      {!showAddBank && bankConnections.length === 0 && (
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="text-center py-12">
              <BuildingLibraryIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No bank accounts connected</h3>
              <p className="mt-1 text-sm text-gray-500">
                Connect your bank account to start receiving payments and managing finances.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setShowAddBank(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Connect Your First Bank Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Features Info */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm">
          <div className="flex items-center">
            <span className="rounded-lg inline-flex p-3 bg-blue-50 text-blue-600">
              <CheckCircleIcon className="h-6 w-6" />
            </span>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-900">Receive Payments</h3>
              <p className="mt-1 text-sm text-gray-500">
                Accept customer payments directly to your bank
              </p>
            </div>
          </div>
        </div>

        <div className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm">
          <div className="flex items-center">
            <span className="rounded-lg inline-flex p-3 bg-green-50 text-green-600">
              <CheckCircleIcon className="h-6 w-6" />
            </span>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-900">Process Payroll</h3>
              <p className="mt-1 text-sm text-gray-500">
                Pay employees directly from connected accounts
              </p>
            </div>
          </div>
        </div>

        <div className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm">
          <div className="flex items-center">
            <span className="rounded-lg inline-flex p-3 bg-purple-50 text-purple-600">
              <CheckCircleIcon className="h-6 w-6" />
            </span>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-900">Track Finances</h3>
              <p className="mt-1 text-sm text-gray-500">
                Monitor cash flow and transaction history
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}