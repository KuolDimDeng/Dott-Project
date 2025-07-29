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
        setCurrencies(data.currencies);
      } else {
        // Fallback to local currency list
        setCurrencies(getAllCurrencies());
      }
    } catch (error) {
      console.error('Error loading currency list:', error);
      // Fallback to local currency list
      setCurrencies(getAllCurrencies());
    }
  };

  const loadPreferences = async () => {
    try {
      const response = await fetch('/api/currency/preferences');
      const data = await response.json();
      
      if (data.success) {
        setPreferences(data.preferences);
      }
    } catch (error) {
      console.error('Error loading currency preferences:', error);
      notifyError('Failed to load currency preferences');
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
    
    console.log('🚀 [CurrencyPreferences] === UPDATE CURRENCY START ===');
    console.log('🚀 [CurrencyPreferences] Currency code to update:', currencyCode);
    console.log('🚀 [CurrencyPreferences] Current preferences:', preferences);
    
    setLoading(true);
    try {
      const requestBody = {
        currency_code: currencyCode,
      };
      
      console.log('🚀 [CurrencyPreferences] Request body:', requestBody);
      console.log('🚀 [CurrencyPreferences] Making PUT request to /api/currency/preferences');
      
      const response = await fetch('/api/currency/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('🚀 [CurrencyPreferences] Response status:', response.status);
      console.log('🚀 [CurrencyPreferences] Response headers:', response.headers);
      
      const data = await response.json();
      console.log('🚀 [CurrencyPreferences] Response data:', data);
      
      if (data.success) {
        console.log('🚀 [CurrencyPreferences] Update successful!');
        setPreferences(data.preferences);
        notifySuccess(`Currency updated to ${data.preferences.currency_name}`);
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
      notifyError('Failed to update currency preferences');
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
      
      const response = await fetch('/api/currency/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('🎯 [CurrencyPreferences] Response status:', response.status);
      const data = await response.json();
      console.log('🎯 [CurrencyPreferences] Response data:', data);
      
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
        <button
          onClick={testAuth}
          className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded"
        >
          Test Auth
        </button>
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

      <ConfirmationModal />
    </div>
  );
};

export default CurrencyPreferences;