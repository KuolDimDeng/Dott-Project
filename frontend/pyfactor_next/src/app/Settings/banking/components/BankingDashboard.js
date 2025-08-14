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
import {
  PLAID_COUNTRIES,
  getBankingProvider,
  getCountryDisplayName,
  getCachedCountryData,
  cacheCountryData,
  getUserSelectedCountry,
  saveUserSelectedCountry,
  clearCountryCache
} from '@/config/bankingProviders';

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
  const [showCountrySelector, setShowCountrySelector] = useState(false);
  const [isDetectingCountry, setIsDetectingCountry] = useState(false);
  
  // Debug info
  console.log('🔍 [BankingDashboard] Render - Country:', userCountry, 'Provider:', provider, 'Detected:', countryDetected);

  useEffect(() => {
    // Initialize country detection
    initializeCountryDetection();
    fetchBankConnections();
  }, []); // Only run once on mount

  /**
   * Initialize country detection with caching
   */
  const initializeCountryDetection = async () => {
    console.log('🔍 [BankingDashboard] Initializing country detection...');
    
    // Check for user's manual selection first
    const userSelected = getUserSelectedCountry();
    if (userSelected) {
      console.log('🔍 [BankingDashboard] Using user selected country:', userSelected);
      setUserCountry(userSelected);
      setProvider(getBankingProvider(userSelected));
      setCountryDetected(true);
      return;
    }
    
    // Check for cached country data
    const cached = getCachedCountryData();
    if (cached) {
      console.log('🔍 [BankingDashboard] Using cached country:', cached.country, 'Age:', Math.round(cached.age / 1000), 'seconds');
      setUserCountry(cached.country);
      setProvider(cached.provider);
      setCountryDetected(true);
      return;
    }
    
    // No cache, fetch from API
    if (!isDetectingCountry) {
      await fetchUserProfile();
    }
  };

  /**
   * Fetch user profile to get country
   */
  const fetchUserProfile = async () => {
    console.log('🔍 [BankingDashboard] === STARTING COUNTRY DETECTION ===');
    setIsDetectingCountry(true);
    try {
      // Try the user profile endpoint which has business country data
      const response = await fetch('/api/user/profile', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 [BankingDashboard] Full profile response:', JSON.stringify(data, null, 2));
        
        // Get country from profile data - check all possible locations
        // Priority: business_country > country > default to empty (not US)
        const country = data.business_country || 
                       data.country || 
                       data.user?.business_country || 
                       data.user?.country || 
                       '';
        
        console.log('🔍 [BankingDashboard] Extracted country from profile:', country);
        console.log('🔍 [BankingDashboard] Available fields:', Object.keys(data));
        
        if (country) {
          // Set and cache the country we found
          setUserCountry(country);
          const useProvider = getBankingProvider(country);
          setProvider(useProvider);
          setCountryDetected(true);
          cacheCountryData(country); // Cache for future use
          setIsDetectingCountry(false);
          console.log(`🔍 [BankingDashboard] Profile set - Country: ${country}, Provider: ${useProvider}`);
          return; // Don't try the alt endpoint
        } else {
          console.log('🔍 [BankingDashboard] No country in profile, trying session endpoint...');
        }
      } else {
        console.error('🔍 [BankingDashboard] Failed to fetch profile:', response.status);
      }
      
      // Try alternative endpoints
      console.log('🔍 [BankingDashboard] Trying alternative endpoints...');
      
      // Try the session-v2 endpoint
      let altResponse = await fetch('/api/auth/session-v2', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      // If that fails, try /api/users/me
      if (!altResponse.ok) {
        console.log('🔍 [BankingDashboard] Session-v2 failed, trying /api/users/me...');
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
        console.log('🔍 [BankingDashboard] Alternative endpoint response:', JSON.stringify(altData, null, 2));
        
        // Check all possible locations for country
        const country = altData.business_country || 
                       altData.country || 
                       altData.user?.business_country || 
                       altData.user?.country ||
                       altData.data?.business_country ||
                       altData.data?.country ||
                       '';
                       
        console.log('🔍 [BankingDashboard] Extracted country from alternative endpoint:', country);
        
        if (country) {
          setUserCountry(country);
          const useProvider = getBankingProvider(country);
          setProvider(useProvider);
          setCountryDetected(true);
          cacheCountryData(country); // Cache for future use
          setIsDetectingCountry(false);
          console.log(`🔍 [BankingDashboard] Alternative endpoint set - Country: ${country}, Provider: ${useProvider}`);
        } else {
          // If still no country found, show country selector
          console.log('🔍 [BankingDashboard] No country found in any endpoint, showing country selector');
          setShowCountrySelector(true);
          setUserCountry('International');
          setProvider('wise');
          setCountryDetected(true);
          setIsDetectingCountry(false);
        }
      } else {
        console.error('🔍 [BankingDashboard] All endpoints failed, showing country selector');
        console.error('🔍 [BankingDashboard] Last endpoint status:', altResponse.status);
        setShowCountrySelector(true);
        setUserCountry('International');
        setProvider('wise');
        setCountryDetected(true);
        setIsDetectingCountry(false);
      }
    } catch (error) {
      console.error('🔍 [BankingDashboard] Error fetching user profile:', error);
      // Show country selector when we can't determine country
      setShowCountrySelector(true);
      setUserCountry('International');
      setProvider('wise');
      setCountryDetected(true);
      setIsDetectingCountry(false);
    }
  };

  /**
   * Handle manual country selection
   */
  const handleCountrySelect = (countryCode) => {
    console.log('🔍 [BankingDashboard] Manual country selection:', countryCode);
    setUserCountry(countryCode);
    setProvider(getBankingProvider(countryCode));
    saveUserSelectedCountry(countryCode);
    setShowCountrySelector(false);
    toast.success(`Country set to ${getCountryDisplayName(countryCode)}`);
  };

  /**
   * Reset country detection
   */
  const resetCountryDetection = () => {
    clearCountryCache();
    setCountryDetected(false);
    setUserCountry(null);
    setProvider(null);
    setShowCountrySelector(false);
    initializeCountryDetection();
    toast.info('Country detection reset');
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
                  Banking Provider for {getCountryDisplayName(userCountry)}
                </p>
                <p className="text-sm text-gray-500">
                  {provider === 'plaid' 
                    ? 'Using Plaid for secure bank connections in your region'
                    : 'Using Wise (via Stripe) for international banking'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
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
              <button
                onClick={() => setShowCountrySelector(true)}
                className="text-sm text-blue-600 hover:text-blue-500 underline"
              >
                Change Country
              </button>
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

      {/* Country Selector Modal */}
      {showCountrySelector && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-lg w-full mx-4 p-6">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900">Select Your Country</h3>
              <p className="mt-1 text-sm text-gray-500">
                Choose your business country to determine the best banking provider for you.
              </p>
            </div>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              <div className="mb-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Plaid Supported Countries (Direct Bank Connection)
                </p>
                {PLAID_COUNTRIES.map(country => (
                  <button
                    key={country}
                    onClick={() => handleCountrySelect(country)}
                    className="w-full text-left px-3 py-2 rounded hover:bg-blue-50 flex items-center justify-between group"
                  >
                    <span>{getCountryDisplayName(country)}</span>
                    <span className="text-xs text-green-600 opacity-0 group-hover:opacity-100">
                      Plaid ✓
                    </span>
                  </button>
                ))}
              </div>
              
              <div className="border-t pt-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Other Countries (Wise Banking)
                </p>
                {Object.entries({
                  'SS': 'South Sudan',
                  'KE': 'Kenya',
                  'NG': 'Nigeria',
                  'ZA': 'South Africa',
                  'GH': 'Ghana',
                  'TZ': 'Tanzania',
                  'UG': 'Uganda',
                  'ET': 'Ethiopia',
                  'RW': 'Rwanda',
                  'SN': 'Senegal',
                  'IN': 'India',
                  'PK': 'Pakistan',
                  'BD': 'Bangladesh',
                  'PH': 'Philippines',
                  'ID': 'Indonesia',
                  'MY': 'Malaysia',
                  'TH': 'Thailand',
                  'VN': 'Vietnam',
                  'AU': 'Australia',
                  'NZ': 'New Zealand',
                  'JP': 'Japan',
                  'KR': 'South Korea',
                  'CN': 'China',
                  'BR': 'Brazil',
                  'MX': 'Mexico',
                  'AR': 'Argentina',
                  'CL': 'Chile',
                  'CO': 'Colombia'
                }).map(([code, name]) => (
                  <button
                    key={code}
                    onClick={() => handleCountrySelect(code)}
                    className="w-full text-left px-3 py-2 rounded hover:bg-purple-50 flex items-center justify-between group"
                  >
                    <span>{name}</span>
                    <span className="text-xs text-purple-600 opacity-0 group-hover:opacity-100">
                      Wise ✓
                    </span>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => setShowCountrySelector(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Cancel
              </button>
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