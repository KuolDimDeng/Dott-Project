import React, { useState, useEffect } from 'react';
import { 
  CurrencyDollarIcon,
  CheckIcon, 
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { useNotification } from '@/context/NotificationContext';
import { formatCurrency, getAllCurrencies } from '@/utils/currencyFormatter';

const CurrencyPreferences = () => {
  const { notifySuccess, notifyError } = useNotification();
  const [loading, setLoading] = useState(false);
  const [currencies, setCurrencies] = useState([]);
  const [preferences, setPreferences] = useState({
    currency_code: 'USD',
    currency_name: 'US Dollar',
    currency_symbol: '$',
    show_usd_on_invoices: true,
    show_usd_on_quotes: true,
    show_usd_on_reports: false,
  });
  const [exchangeRateInfo, setExchangeRateInfo] = useState(null);
  
  // Run diagnostic
  const runDiagnostic = async () => {
    console.log('🩺 [CurrencyPreferences] Running diagnostic...');
    try {
      const response = await fetch('/api/currency/diagnostic');
      console.log('🩺 [CurrencyPreferences] Diagnostic response status:', response.status);
      console.log('🩺 [CurrencyPreferences] Diagnostic response headers:', response.headers);
      console.log('🩺 [CurrencyPreferences] Diagnostic response ok:', response.ok);
      
      // Get response as text first
      const responseText = await response.text();
      console.log('🩺 [CurrencyPreferences] Raw response text length:', responseText.length);
      console.log('🩺 [CurrencyPreferences] Raw response text (first 500 chars):', responseText.substring(0, 500));
      
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('🩺 [CurrencyPreferences] Diagnostic data:', JSON.stringify(data, null, 2));
      } catch (parseError) {
        console.error('🩺 [CurrencyPreferences] Failed to parse diagnostic response:', parseError);
        console.error('🩺 [CurrencyPreferences] Raw response that failed to parse:', responseText);
        notifyError('Diagnostic failed: Invalid response format');
        return;
      }
      
      if (data.success) {
        notifySuccess('Diagnostic complete - check console for details');
        
        // Check for missing currency fields
        if (data.diagnostics?.business_details?.has_currency_fields === false) {
          notifyError('WARNING: Currency fields are missing from BusinessDetails model!');
        }
      } else {
        const errorMsg = data.error || 'Unknown error';
        console.error('🩺 [CurrencyPreferences] Diagnostic failed:', errorMsg);
        console.error('🩺 [CurrencyPreferences] Full error data:', data);
        
        if (data.htmlPreview) {
          console.error('🩺 [CurrencyPreferences] HTML preview:', data.htmlPreview);
          notifyError('Diagnostic failed: Backend returned HTML error page');
        } else if (data.parseError) {
          console.error('🩺 [CurrencyPreferences] Parse error:', data.parseError);
          notifyError('Diagnostic failed: ' + errorMsg);
        } else {
          notifyError('Diagnostic failed: ' + errorMsg);
        }
        
        if (data.traceback) {
          console.error('🩺 [CurrencyPreferences] Traceback:', data.traceback);
        }
        if (data.response) {
          console.error('🩺 [CurrencyPreferences] Raw response:', data.response);
        }
      }
    } catch (error) {
      console.error('🩺 [CurrencyPreferences] Diagnostic error:', error);
      notifyError('Diagnostic failed: ' + error.message);
    }
  };
  
  // Test auth function
  const testAuth = async () => {
    console.log('🧪 [CurrencyPreferences] Testing authentication...');
    try {
      const response = await fetch('/api/currency/test-auth');
      console.log('🧪 [CurrencyPreferences] Test auth response status:', response.status);
      const data = await response.json();
      console.log('🧪 [CurrencyPreferences] Test auth response data:', data);
      if (data.success) {
        notifySuccess('Auth test passed: ' + data.message);
      } else {
        notifyError('Auth test failed: ' + data.error);
      }
    } catch (error) {
      console.error('🧪 [CurrencyPreferences] Auth test error:', error);
      notifyError('Auth test failed: ' + error.message);
    }
  };
  
  // Test connection
  const testConnection = async () => {
    console.log('🔌 [CurrencyPreferences] Running connection test...');
    try {
      const response = await fetch('/api/currency/test-connection');
      const data = await response.json();
      console.log('🔌 [CurrencyPreferences] Connection test results:', data);
      
      if (data.success) {
        const failedTests = data.tests.filter(t => !t.success);
        if (failedTests.length > 0) {
          console.error('🔌 [CurrencyPreferences] Some tests failed:', failedTests);
          notifyError(`Connection issues detected: ${failedTests.map(t => t.test).join(', ')}`);
        } else {
          notifySuccess('Connection test passed - all systems operational');
        }
      } else {
        notifyError('Connection test failed: ' + data.error);
      }
    } catch (error) {
      console.error('🔌 [CurrencyPreferences] Connection test error:', error);
      notifyError('Failed to run connection test');
    }
  };
  
  // Debug preferences endpoint
  const debugPreferences = async () => {
    console.log('🔍 [CurrencyPreferences] Running debug...');
    try {
      const response = await fetch('/api/currency/debug-preferences');
      const data = await response.json();
      console.log('🔍 [CurrencyPreferences] Debug response:', data);
      
      if (data.success) {
        notifySuccess('Debug complete - check console for details');
      } else {
        notifyError('Debug failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('🔍 [CurrencyPreferences] Debug error:', error);
      notifyError('Debug failed: ' + error.message);
    }
  };

  // Test public endpoint
  const testPublic = async () => {
    console.log('🌐 [CurrencyPreferences] Testing public endpoint...');
    try {
      // Use the frontend proxy route
      const response = await fetch('/api/currency/test-public');
      console.log('🌐 [CurrencyPreferences] Public test response status:', response.status);
      const data = await response.json();
      console.log('🌐 [CurrencyPreferences] Public test response data:', data);
      
      if (data.success) {
        notifySuccess('Public test passed: ' + data.message);
      } else {
        notifyError('Public test failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('🌐 [CurrencyPreferences] Public test error:', error);
      notifyError('Public test failed: ' + error.message);
    }
  };
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingCurrency, setPendingCurrency] = useState(null);

  // Load currency list and preferences
  useEffect(() => {
    loadCurrencies();
    loadPreferences();
  }, []);

  const loadCurrencies = async () => {
    try {
      const response = await fetch('/api/currency/list');
      const data = await response.json();
      
      if (data.success) {
        // Sort currencies alphabetically by display name
        const sortedCurrencies = data.currencies.sort((a, b) => 
          a.display.localeCompare(b.display)
        );
        setCurrencies(sortedCurrencies);
      } else {
        // Fallback to local currency list
        const allCurrencies = getAllCurrencies();
        // Sort alphabetically
        const sortedCurrencies = allCurrencies.sort((a, b) => 
          a.display.localeCompare(b.display)
        );
        setCurrencies(sortedCurrencies);
      }
    } catch (error) {
      console.error('Error loading currency list:', error);
      // Fallback to local currency list
      const allCurrencies = getAllCurrencies();
      // Sort alphabetically
      const sortedCurrencies = allCurrencies.sort((a, b) => 
        a.display.localeCompare(b.display)
      );
      setCurrencies(sortedCurrencies);
    }
  };

  const loadPreferences = async () => {
    try {
      console.log('💰 [CurrencyPreferences] Loading preferences...');
      
      // Try the v3 endpoint first (handles redirects properly)
      const response = await fetch('/api/currency/preferences-v3');
      console.log('💰 [CurrencyPreferences] Response status:', response.status);
      console.log('💰 [CurrencyPreferences] Response headers:', response.headers);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('💰 [CurrencyPreferences] Error response:', errorText);
        
        // If simple endpoint fails, try the original
        console.log('💰 [CurrencyPreferences] Trying original endpoint...');
        const fallbackResponse = await fetch('/api/currency/preferences');
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          if (fallbackData.success) {
            setPreferences(fallbackData.preferences);
            console.log('💰 [CurrencyPreferences] Preferences loaded via fallback:', fallbackData.preferences);
            return;
          }
        }
        
        throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`);
      }
      
      const data = await response.json();
      console.log('💰 [CurrencyPreferences] Response data:', data);
      
      if (data.success) {
        setPreferences(data.preferences);
        console.log('💰 [CurrencyPreferences] Preferences loaded successfully:', data.preferences);
      } else {
        throw new Error(data.error || 'Failed to load preferences');
      }
    } catch (error) {
      console.error('💰 [CurrencyPreferences] Error loading currency preferences:', error);
      
      // Set default preferences if loading fails
      console.log('💰 [CurrencyPreferences] Setting default preferences...');
      setPreferences({
        currency_code: 'USD',
        currency_name: 'US Dollar',
        currency_symbol: '$',
        show_usd_on_invoices: true,
        show_usd_on_quotes: true,
        show_usd_on_reports: false,
      });
      
      // Don't show error notification on initial load
      if (error.message && !error.message.includes('Failed to fetch')) {
        notifyError('Using default currency settings');
      }
    }
    setLoading(false);
  };

  const handleCurrencyChange = async (currencyCode) => {
    const selectedCurrency = currencies.find(c => c.code === currencyCode);
    if (!selectedCurrency) return;

    // If selecting USD, no need for confirmation
    if (currencyCode === 'USD') {
      await updateCurrency(currencyCode);
      return;
    }

    // Show confirmation modal for non-USD currencies
    setPendingCurrency(selectedCurrency);
    
    // Get exchange rate info
    try {
      const response = await fetch('/api/currency/exchange-rate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from_currency: currencyCode,
          to_currency: 'USD',
          amount: 100,
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        setExchangeRateInfo(data.exchange_rate);
      }
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
    }
    
    setShowConfirmModal(true);
  };

  const updateCurrency = async (currencyCode) => {
    if (!currencyCode) {
      currencyCode = pendingCurrency?.code;
    }
    
    console.log('🚀 [CURRENCY-FRONTEND] === UPDATE CURRENCY START ===');
    console.log('🚀 [CURRENCY-FRONTEND] Currency code to update:', currencyCode);
    console.log('🚀 [CURRENCY-FRONTEND] Current preferences:', preferences);
    console.log('🚀 [CURRENCY-FRONTEND] User action: Currency change requested');
    console.log('🚀 [CURRENCY-FRONTEND] Timestamp:', new Date().toISOString());
    
    setLoading(true);
    try {
      const requestBody = {
        currency_code: currencyCode,
      };
      
      console.log('🚀 [CurrencyPreferences] Request body:', requestBody);
      console.log('🚀 [CurrencyPreferences] Making PUT request to /api/currency/preferences');
      
      const response = await fetch('/api/currency/preferences-v3', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('🚀 [CurrencyPreferences] Response status:', response.status);
      console.log('🚀 [CurrencyPreferences] Response headers:', response.headers);
      
      let data;
      try {
        data = await response.json();
        console.log('🚀 [CurrencyPreferences] Response data:', data);
      } catch (jsonError) {
        console.error('🚀 [CurrencyPreferences] Failed to parse response as JSON:', jsonError);
        if (!response.ok) {
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        throw new Error('Invalid response format from server');
      }
      
      if (data.success) {
        console.log('🚀 [CURRENCY-FRONTEND] === UPDATE SUCCESSFUL ===');
        console.log('🚀 [CURRENCY-FRONTEND] Backend response:', data);
        console.log('🚀 [CURRENCY-FRONTEND] New currency set:', data.currency_code);
        console.log('🚀 [CURRENCY-FRONTEND] All future invoices/quotes will use:', data.currency_code);
        
        setPreferences(data);
        notifySuccess(`✅ Currency updated to ${data.currency_name}. All new invoices and quotes will use this currency.`);
        setShowConfirmModal(false);
        setPendingCurrency(null);
        setExchangeRateInfo(null);
      } else {
        console.error('🚀 [CurrencyPreferences] Update failed:', data.error);
        notifyError(data.error || 'Failed to update currency');
      }
    } catch (error) {
      console.error('🚀 [CurrencyPreferences] Network error:', error);
      console.error('🚀 [CurrencyPreferences] Error details:', {
        message: error.message,
        stack: error.stack,
        type: error.constructor.name
      });
      
      // Show more specific error message
      let errorMessage = 'Failed to update currency preferences';
      if (error.message?.includes('NetworkError') || error.message?.includes('Failed to fetch')) {
        errorMessage = 'Network error: Unable to connect to server. Please check your connection and try again.';
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Request timed out. The server might be slow. Please try again.';
      }
      
      notifyError(errorMessage);
      
      // Run connection test automatically on network error
      if (error.message?.includes('NetworkError') || error.message?.includes('Failed to fetch')) {
        console.log('🚀 [CurrencyPreferences] Running connection test due to network error...');
        testConnection();
      }
    }
    setLoading(false);
    console.log('🚀 [CurrencyPreferences] === UPDATE CURRENCY END ===');
  };

  const handleToggleChange = async (field, value) => {
    console.log('🎯 [CurrencyPreferences] === TOGGLE CHANGE START ===');
    console.log('🎯 [CurrencyPreferences] Field:', field, 'Value:', value);
    
    setLoading(true);
    try {
      const requestBody = {
        [field]: value,
      };
      
      console.log('🎯 [CurrencyPreferences] Request body:', requestBody);
      console.log('🎯 [CurrencyPreferences] Making PUT request to /api/currency/preferences');
      
      const response = await fetch('/api/currency/preferences-v3', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('🎯 [CurrencyPreferences] Response status:', response.status);
      
      let data;
      try {
        data = await response.json();
        console.log('🎯 [CurrencyPreferences] Response data:', data);
      } catch (jsonError) {
        console.error('🎯 [CurrencyPreferences] Failed to parse response as JSON:', jsonError);
        if (!response.ok) {
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        throw new Error('Invalid response format from server');
      }
      
      if (data.success) {
        console.log('🎯 [CurrencyPreferences] Toggle update successful!');
        setPreferences(data.preferences);
        notifySuccess('Display preferences updated');
      } else {
        console.error('🎯 [CurrencyPreferences] Toggle update failed:', data.error);
        notifyError(data.error || 'Failed to update preferences');
      }
    } catch (error) {
      console.error('🎯 [CurrencyPreferences] Network error:', error);
      notifyError('Failed to update display preferences');
    }
    setLoading(false);
    console.log('🎯 [CurrencyPreferences] === TOGGLE CHANGE END ===');
  };


  const ConfirmationModal = () => {
    if (!showConfirmModal || !pendingCurrency) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center mb-4">
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500 mr-3" />
            <h3 className="text-lg font-semibold">Confirm Currency Change</h3>
          </div>
          
          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              Change your business currency to <strong>{pendingCurrency.name}</strong>?
            </p>
            
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-blue-900 mb-2">
                What this means:
              </h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• All future invoices and quotes will display amounts in {pendingCurrency.name}</li>
                <li>• Payments will still be processed in USD equivalent</li>
                <li>• You can show USD amounts alongside local currency if desired</li>
              </ul>
            </div>

            {exchangeRateInfo && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium mb-2">Current Exchange Rate:</h4>
                <p className="text-sm">
                  {formatCurrency(100, pendingCurrency.code)} = {formatCurrency(exchangeRateInfo.converted_amount, 'USD')}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Rate from {exchangeRateInfo.source} • {new Date(exchangeRateInfo.timestamp).toLocaleString()}
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setShowConfirmModal(false);
                setPendingCurrency(null);
                setExchangeRateInfo(null);
              }}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={() => updateCurrency()}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Confirm Change'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <CurrencyDollarIcon className="h-6 w-6 text-blue-600 mr-3" />
          <h3 className="text-lg font-semibold">Currency Preferences</h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={testAuth}
            className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded"
          >
            Test Auth
          </button>
          <button
            onClick={testPublic}
            className="px-3 py-1 text-sm bg-blue-200 hover:bg-blue-300 rounded"
          >
            Test Public
          </button>
          <button
            onClick={debugPreferences}
            className="px-3 py-1 text-sm bg-yellow-200 hover:bg-yellow-300 rounded"
          >
            Debug Preferences
          </button>
          <button
            onClick={runDiagnostic}
            className="px-3 py-1 text-sm bg-green-200 hover:bg-green-300 rounded"
          >
            Run Diagnostic
          </button>
        </div>
      </div>

      {/* Current Currency Display */}
      <div className="bg-blue-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-blue-900">Current Business Currency</h4>
            <p className="text-blue-800">
              {preferences.currency_name} ({preferences.currency_code})
            </p>
          </div>
          <div className="text-2xl">
            {preferences.currency_symbol}
          </div>
        </div>
      </div>

      {/* Currency Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Business Currency
        </label>
        <select
          value={preferences.currency_code}
          onChange={(e) => handleCurrencyChange(e.target.value)}
          disabled={loading}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {currencies.map((currency) => (
            <option key={currency.code} value={currency.code}>
              {currency.display}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Select the currency you want to display throughout your business documents
        </p>
      </div>

      {/* USD Display Options */}
      <div>
        <h4 className="font-medium text-gray-900 mb-4">USD Display Options</h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-gray-700">
                Show USD on Invoices
              </label>
              <p className="text-sm text-gray-500">
                Display USD equivalent in parentheses: {formatCurrency(100, preferences.currency_code)} (USD 75.84)
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.show_usd_on_invoices}
                onChange={(e) => handleToggleChange('show_usd_on_invoices', e.target.checked)}
                disabled={loading || preferences.currency_code === 'USD'}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-gray-700">
                Show USD on Quotes
              </label>
              <p className="text-sm text-gray-500">
                Display USD equivalent on quotes and estimates
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.show_usd_on_quotes}
                onChange={(e) => handleToggleChange('show_usd_on_quotes', e.target.checked)}
                disabled={loading || preferences.currency_code === 'USD'}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-gray-700">
                Show USD on Reports
              </label>
              <p className="text-sm text-gray-500">
                Display USD equivalent on financial reports and analytics
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.show_usd_on_reports}
                onChange={(e) => handleToggleChange('show_usd_on_reports', e.target.checked)}
                disabled={loading || preferences.currency_code === 'USD'}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        {preferences.currency_code === 'USD' && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <InformationCircleIcon className="h-5 w-5 text-gray-500 mr-2" />
              <p className="text-sm text-gray-600">
                USD display options are disabled because your business currency is already USD.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Payment Processing Note */}
      <div className="bg-yellow-50 rounded-lg p-4">
        <div className="flex items-start">
          <InformationCircleIcon className="h-5 w-5 text-yellow-600 mr-3 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-800 mb-1">
              Payment Processing
            </h4>
            <p className="text-sm text-yellow-700">
              All payments are processed in USD regardless of your display currency. 
              Customers will see the USD amount and exchange rate before completing payment.
            </p>
          </div>
        </div>
      </div>
      
      {/* Debug Tools - Only in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Debug Tools</h4>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={testConnection}
              className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Test Connection
            </button>
            <button
              onClick={runDiagnostic}
              className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
            >
              Run Diagnostic
            </button>
            <button
              onClick={testAuth}
              className="px-3 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              Test Auth
            </button>
            <button
              onClick={async () => {
                try {
                  const res = await fetch('/api/currency/direct-test');
                  const data = await res.json();
                  console.log('🔬 Direct test results:', data);
                  if (data.success) {
                    notifySuccess('Direct test complete - check console');
                  } else {
                    notifyError('Direct test failed: ' + data.error);
                  }
                } catch (e) {
                  notifyError('Direct test error: ' + e.message);
                }
              }}
              className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
            >
              Direct Backend Test
            </button>
            <button
              onClick={async () => {
                try {
                  const res = await fetch('/api/currency/backend-health');
                  const data = await res.json();
                  console.log('🏥 Backend health results:', data);
                  const working = data.tests.filter(t => t.ok).length;
                  const total = data.tests.length;
                  if (working > 0) {
                    notifySuccess(`Backend health: ${working}/${total} endpoints working`);
                  } else {
                    notifyError('All backend endpoints are unreachable');
                  }
                } catch (e) {
                  notifyError('Health check error: ' + e.message);
                }
              }}
              className="px-3 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600"
            >
              Backend Health
            </button>
            <button
              onClick={() => {
                // Log current cookies
                console.log('🍪 Current cookies:', document.cookie);
                // Parse cookies
                const cookies = document.cookie.split(';').reduce((acc, cookie) => {
                  const [key, value] = cookie.trim().split('=');
                  acc[key] = value;
                  return acc;
                }, {});
                console.log('🍪 Parsed cookies:', cookies);
                console.log('🍪 Session ID:', cookies.sid || cookies.session_token || 'NOT FOUND');
                notifySuccess('Cookie info logged to console');
              }}
              className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Check Cookies
            </button>
          </div>
        </div>
      )}

      <ConfirmationModal />
    </div>
  );
};

export default CurrencyPreferences;