import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { plaidApi, bankAccountsApi } from '@/services/api/banking';
import { logger } from '@/utils/logger';
import { CenteredSpinner, ButtonSpinner } from '@/components/ui/StandardSpinner';

// Temporarily disabled while rebuilding Plaid integration
// const PlaidLinkComponent = dynamic(
//   () => import('./PlaidLinkComponent'),
//   { 
//     ssr: false,
//     loading: () => <div className="text-center p-4">Loading Plaid...</div>
//   }
// );

const ConnectBank = ({ preferredProvider = null, businessCountry = null, autoConnect = false, onSuccess = null, onClose = null }) => {
  const [region, setRegion] = useState('');
  const [africanOption, setAfricanOption] = useState('');
  const [africanBankProvider, setAfricanBankProvider] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [linkToken, setLinkToken] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [connectedBankInfo, setConnectedBankInfo] = useState(null);
  const [showProviderForm, setShowProviderForm] = useState(false);

  // Use preferredProvider when provided - skip region selection entirely
  useEffect(() => {
    if (preferredProvider && businessCountry) {
      // Set region based on preferred provider
      if (preferredProvider.provider === 'plaid') {
        // Check if this is Europe or North America
        const europeanCountries = [
          'GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'CH', 'SE', 'DK', 'NO', 'FI', 
          'PT', 'IE', 'GR', 'PL', 'CZ', 'HU', 'RO'
        ];
        
        if (europeanCountries.includes(businessCountry)) {
          setRegion('Europe');
        } else {
          setRegion('America');
        }
      } else if (preferredProvider.provider === 'mobilemoney') {
        setRegion('Africa');
        setAfricanOption('Mobile Money');
      } else if (preferredProvider.provider === 'dlocal') {
        setRegion('South America');
      }
      
      // Show the provider form directly without region selection
      setShowProviderForm(true);
      
      // Don't auto-connect, let user click the button
      // This prevents the null token error on initial load
    }
  }, [preferredProvider, businessCountry]);

  const handleRegionChange = (event) => {
    setRegion(event.target.value);
    setAfricanOption('');
    setAfricanBankProvider('');
  };

  const handleAfricanOptionChange = (event) => {
    setAfricanOption(event.target.value);
    setAfricanBankProvider('');
  };

  const handleAfricanBankProviderChange = (event) => {
    setAfricanBankProvider(event.target.value);
  };

  const getProviderForRegion = (region) => {
    // If we have a preferred provider from the backend, use that
    if (preferredProvider && preferredProvider.provider) {
      return preferredProvider.provider;
    }
    
    // Otherwise, use region-based logic as a fallback
    switch (region) {
      case 'America':
      case 'Europe':
        return 'plaid';
      case 'Africa':
        return africanOption === 'Mobile Money' ? 'africas_talking' : africanBankProvider;
      case 'South America':
        return 'dlocal';
      case 'Asia':
        return 'salt_edge';
      default:
        return 'unknown';
    }
  };
  

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    const provider = getProviderForRegion(region);
    try {
      const payload = { region, provider };
      if (region === 'Africa') {
        payload.sub_option = africanOption;
        if (africanOption === 'Banks') {
          payload.bank_provider = africanBankProvider;
        }
      }
      
      // Add business country to payload
      if (businessCountry) {
        payload.country_code = businessCountry;
      }

      logger.info('🏦 [ConnectBank] Creating link token with payload:', payload);
      const response = await plaidApi.createLinkToken(payload);
      logger.info('🏦 [ConnectBank] Link token response:', response);

      if (response.data && response.data.link_token) {
        logger.info('🏦 [ConnectBank] Link token received successfully');
        setLinkToken(response.data.link_token);
      } else if (response.data && response.data.auth_url) {
        // Handle non-Plaid providers that return an auth URL
        logger.info('🏦 [ConnectBank] Redirecting to auth URL:', response.data.auth_url);
        window.location.href = response.data.auth_url;
      } else {
        logger.error('🏦 [ConnectBank] Invalid response structure:', response);
        throw new Error(`Invalid response from server: ${JSON.stringify(response)}`);
      }
    } catch (err) {
      logger.error('🏦 [ConnectBank] Error creating link token:', err);
      setError(`Failed to initialize bank connection: ${err.message || 'Please try again.'}`);
      setSnackbar({ open: true, message: `Failed to connect bank: ${err.message || 'Unknown error'}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };


  const exchangePublicToken = async (public_token) => {
    try {
      const response = await plaidApi.exchangeToken(public_token);
      if (response.data.success) {
        setConnectedBankInfo(response.data.bank_info);
        setSnackbar({
          open: true,
          message: 'Bank connected successfully',
          severity: 'success',
        });
        
        // Call onSuccess callback if provided
        if (onSuccess && typeof onSuccess === 'function') {
          onSuccess(response.data.bank_info);
        }
      } else {
        throw new Error('Failed to exchange token');
      }
    } catch (error) {
      logger.error('Error exchanging token:', error);
      setSnackbar({
        open: true,
        message: 'Failed to connect bank. Please try again.',
        severity: 'error',
      });
    }
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar({ ...snackbar, open: false });
  };

  // Add message about auto-detected region when preferred provider is used
  const getRegionMessage = () => {
    if (preferredProvider && businessCountry) {
      return (
        <div className="mb-4 p-3 bg-blue-50 text-blue-800 rounded-md">
          <span className="font-medium">Based on your business location ({businessCountry}), we've selected the best connection method for you.</span>
        </div>
      );
    }
    return null;
  };


  return (
    <div className="p-6">
      {!connectedBankInfo ? (
        <>
          {/* Show provider-specific form when auto-detected */}
          {showProviderForm ? (
            <>
              <div className="flex items-center mb-4">
                {preferredProvider?.provider === 'plaid' ? (
                  <svg className="h-6 w-6 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                )}
                <h2 className="text-xl font-bold text-gray-900">
                  Connect Your {businessCountry} Bank
                </h2>
              </div>
              
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center">
                  {preferredProvider.provider === 'plaid' ? (
                    <svg className="h-5 w-5 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  )}
                  <div>
                    <div className="font-medium text-blue-800">
                      Using {preferredProvider.name} for {businessCountry} banks
                    </div>
                    <div className="text-sm text-blue-600">
                      {preferredProvider.description}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Plaid-specific form */}
              {preferredProvider?.provider === 'plaid' && (
                <div className="space-y-4">
                  <p className="text-gray-600">
                    Click the button below to securely connect your bank account using Plaid. 
                    You'll be redirected to your bank's secure login page.
                  </p>
                  
                  {linkToken ? (
                    <div className="p-4 bg-yellow-50 text-yellow-800 rounded-md">
                      <p className="font-medium">Plaid integration is being rebuilt</p>
                      <p className="text-sm mt-1">Please check back shortly while we fix the integration.</p>
                    </div>
                  ) : (
                    <button
                      className={`w-full py-3 px-4 rounded-md font-medium ${
                        loading
                          ? 'bg-blue-300 cursor-not-allowed text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                      onClick={handleConnect}
                      disabled={loading}
                    >
                      {loading ? (
                        <div className="flex items-center justify-center">
                          <ButtonSpinner />
                          Connecting...
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                          </svg>
                          Connect with Plaid
                        </div>
                      )}
                    </button>
                  )}
                  
                  <div className="text-xs text-gray-500 mt-4">
                    <p className="font-medium mb-1">🔒 Your data is secure:</p>
                    <ul className="space-y-1 text-gray-400">
                      <li>• Bank-level 256-bit encryption</li>
                      <li>• We never store your login credentials</li>
                      <li>• Read-only access to account information</li>
                      <li>• Trusted by over 5,000 financial institutions</li>
                    </ul>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Fallback: Manual region selection for edge cases */
            <>
              <h1 className="text-2xl font-bold mb-4">
                Connect Your Bank
              </h1>
              <p className="mb-4">
                Please choose the region where your bank is located. This helps us provide you with the
                most appropriate connection method for your bank.
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Your Region
                </label>
                <select
                  value={region}
                  onChange={handleRegionChange}
                  className="w-full p-2 border border-gray-300 rounded-md bg-white focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="" disabled>Select a region</option>
                  <option value="America">America</option>
                  <option value="Europe">Europe</option>
                  <option value="Africa">Africa</option>
                  <option value="South America">South America</option>
                  <option value="Asia">Asia</option>
                </select>
              </div>

          {region === 'Africa' && (
            <div className="mb-4">
              <fieldset>
                <legend className="text-sm font-medium text-gray-700 mb-2">Choose a connection method</legend>
                <div className="space-y-2">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      value="Mobile Money"
                      checked={africanOption === 'Mobile Money'}
                      onChange={handleAfricanOptionChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2">Mobile Money</span>
                  </label>
                  <div>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        value="Banks"
                        checked={africanOption === 'Banks'}
                        onChange={handleAfricanOptionChange}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2">Traditional Banks</span>
                    </label>
                  </div>
                </div>
              </fieldset>
            </div>
          )}

          {region === 'Africa' && africanOption === 'Banks' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Bank Provider
              </label>
              <select
                value={africanBankProvider}
                onChange={handleAfricanBankProviderChange}
                className="w-full p-2 border border-gray-300 rounded-md bg-white focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="" disabled>Select a provider</option>
                <option value="Mono">Mono</option>
                <option value="Stitch">Stitch</option>
              </select>
            </div>
          )}

          <button
            className={`w-full py-2 px-4 rounded-md ${
              !region ||
              (region === 'Africa' &&
                (!africanOption || (africanOption === 'Banks' && !africanBankProvider))) ||
              loading
                ? 'bg-blue-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
            onClick={handleConnect}
            disabled={
              !region ||
              (region === 'Africa' &&
                (!africanOption || (africanOption === 'Banks' && !africanBankProvider))) ||
              loading
            }
          >
            {loading ? (
              <ButtonSpinner />
            ) : 'Connect'}
          </button>
            </>
          )}
        </>
      ) : (
        <div>
          <h2 className="text-xl font-bold text-blue-600 mb-2">
            Successfully Connected!
          </h2>
          <p className="mb-4">
            You are now connected to {connectedBankInfo.institution_name}.
          </p>
          <ul className="divide-y divide-gray-200">
            {connectedBankInfo.accounts.map((account, index) => (
              <li key={index} className="py-3">
                <div className="font-medium">Account: {account.name}</div>
                <div className="text-sm text-gray-600">Type: {account.type}, Balance: ${account.balances.current.toFixed(2)}</div>
              </li>
            ))}
          </ul>
          <p className="text-sm text-gray-500 mt-4">
            You can now view your transactions and account details in the Banking Dashboard.
          </p>
          <a
            href="/dashboard/banking"
            className="mt-4 w-full block py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-center rounded-md"
          >
            Go to Banking Dashboard
          </a>
        </div>
      )}

      {error && (
        <p className="mt-4 text-red-600">
          {error}
        </p>
      )}
      
      {snackbar.open && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className={`p-3 rounded-md shadow-lg ${
            snackbar.severity === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
            snackbar.severity === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
            'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            <div className="flex items-center">
              <span>{snackbar.message}</span>
              <button 
                onClick={handleCloseSnackbar}
                className="ml-3 text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <span className="sr-only">Close</span>
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectBank;
