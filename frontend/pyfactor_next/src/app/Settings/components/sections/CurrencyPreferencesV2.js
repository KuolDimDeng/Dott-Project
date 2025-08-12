import React, { useState, useEffect } from 'react';
import { 
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useNotification } from '@/context/NotificationContext';
import { useCurrency } from '@/context/CurrencyContext';
import { getCurrencyInfo } from '@/utils/currencyFormatter';

// Hardcoded currency list - 170 currencies
const CURRENCIES = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'NZD', name: 'New Zealand Dollar' },
  // African Currencies
  { code: 'ZAR', name: 'South African Rand' },
  { code: 'NGN', name: 'Nigerian Naira' },
  { code: 'KES', name: 'Kenyan Shilling' },
  { code: 'GHS', name: 'Ghanaian Cedi' },
  { code: 'EGP', name: 'Egyptian Pound' },
  { code: 'MAD', name: 'Moroccan Dirham' },
  { code: 'TND', name: 'Tunisian Dinar' },
  { code: 'DZD', name: 'Algerian Dinar' },
  { code: 'ETB', name: 'Ethiopian Birr' },
  { code: 'UGX', name: 'Ugandan Shilling' },
  { code: 'TZS', name: 'Tanzanian Shilling' },
  { code: 'ZWL', name: 'Zimbabwean Dollar' },
  { code: 'ZMW', name: 'Zambian Kwacha' },
  { code: 'BWP', name: 'Botswana Pula' },
  { code: 'MWK', name: 'Malawian Kwacha' },
  { code: 'MZN', name: 'Mozambican Metical' },
  { code: 'AOA', name: 'Angolan Kwanza' },
  { code: 'XAF', name: 'Central African CFA Franc' },
  { code: 'XOF', name: 'West African CFA Franc' },
  { code: 'RWF', name: 'Rwandan Franc' },
  { code: 'SSP', name: 'South Sudanese Pound' },
  { code: 'BIF', name: 'Burundian Franc' },
  { code: 'DJF', name: 'Djiboutian Franc' },
  { code: 'ERN', name: 'Eritrean Nakfa' },
  { code: 'SOS', name: 'Somali Shilling' },
  { code: 'SDG', name: 'Sudanese Pound' },
  { code: 'LYD', name: 'Libyan Dinar' },
  { code: 'MRU', name: 'Mauritanian Ouguiya' },
  { code: 'MGA', name: 'Malagasy Ariary' },
  { code: 'KMF', name: 'Comorian Franc' },
  { code: 'SCR', name: 'Seychellois Rupee' },
  { code: 'MUR', name: 'Mauritian Rupee' },
  { code: 'LSL', name: 'Lesotho Loti' },
  { code: 'SZL', name: 'Swazi Lilangeni' },
  { code: 'NAD', name: 'Namibian Dollar' },
  { code: 'CVE', name: 'Cape Verdean Escudo' },
  { code: 'STN', name: 'São Tomé and Príncipe Dobra' },
  { code: 'GMD', name: 'Gambian Dalasi' },
  { code: 'LRD', name: 'Liberian Dollar' },
  { code: 'SLL', name: 'Sierra Leonean Leone' },
  // Asian Currencies
  { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'KRW', name: 'South Korean Won' },
  { code: 'SGD', name: 'Singapore Dollar' },
  { code: 'HKD', name: 'Hong Kong Dollar' },
  { code: 'THB', name: 'Thai Baht' },
  { code: 'MYR', name: 'Malaysian Ringgit' },
  { code: 'IDR', name: 'Indonesian Rupiah' },
  { code: 'PHP', name: 'Philippine Peso' },
  { code: 'VND', name: 'Vietnamese Dong' },
  { code: 'BDT', name: 'Bangladeshi Taka' },
  { code: 'PKR', name: 'Pakistani Rupee' },
  { code: 'LKR', name: 'Sri Lankan Rupee' },
  { code: 'TWD', name: 'Taiwan Dollar' },
  { code: 'NPR', name: 'Nepalese Rupee' },
  { code: 'AFN', name: 'Afghan Afghani' },
  { code: 'MMK', name: 'Myanmar Kyat' },
  { code: 'KHR', name: 'Cambodian Riel' },
  { code: 'LAK', name: 'Lao Kip' },
  { code: 'BND', name: 'Brunei Dollar' },
  { code: 'BTN', name: 'Bhutanese Ngultrum' },
  { code: 'MVR', name: 'Maldivian Rufiyaa' },
  { code: 'MNT', name: 'Mongolian Tugrik' },
  { code: 'KZT', name: 'Kazakhstani Tenge' },
  { code: 'UZS', name: 'Uzbekistani Som' },
  { code: 'KGS', name: 'Kyrgyzstani Som' },
  { code: 'TJS', name: 'Tajikistani Somoni' },
  { code: 'TMT', name: 'Turkmenistan Manat' },
  { code: 'AZN', name: 'Azerbaijani Manat' },
  { code: 'GEL', name: 'Georgian Lari' },
  { code: 'AMD', name: 'Armenian Dram' },
  // Middle Eastern Currencies
  { code: 'AED', name: 'UAE Dirham' },
  { code: 'SAR', name: 'Saudi Riyal' },
  { code: 'QAR', name: 'Qatari Riyal' },
  { code: 'KWD', name: 'Kuwaiti Dinar' },
  { code: 'BHD', name: 'Bahraini Dinar' },
  { code: 'OMR', name: 'Omani Rial' },
  { code: 'JOD', name: 'Jordanian Dinar' },
  { code: 'ILS', name: 'Israeli New Shekel' },
  { code: 'TRY', name: 'Turkish Lira' },
  { code: 'LBP', name: 'Lebanese Pound' },
  { code: 'SYP', name: 'Syrian Pound' },
  { code: 'IQD', name: 'Iraqi Dinar' },
  { code: 'IRR', name: 'Iranian Rial' },
  { code: 'YER', name: 'Yemeni Rial' },
  // European Currencies (Non-Euro)
  { code: 'SEK', name: 'Swedish Krona' },
  { code: 'NOK', name: 'Norwegian Krone' },
  { code: 'DKK', name: 'Danish Krone' },
  { code: 'PLN', name: 'Polish Złoty' },
  { code: 'CZK', name: 'Czech Koruna' },
  { code: 'HUF', name: 'Hungarian Forint' },
  { code: 'RON', name: 'Romanian Leu' },
  { code: 'BGN', name: 'Bulgarian Lev' },
  { code: 'HRK', name: 'Croatian Kuna' },
  { code: 'RSD', name: 'Serbian Dinar' },
  { code: 'UAH', name: 'Ukrainian Hryvnia' },
  { code: 'RUB', name: 'Russian Ruble' },
  { code: 'ISK', name: 'Icelandic Króna' },
  { code: 'BAM', name: 'Bosnia and Herzegovina Convertible Mark' },
  { code: 'MKD', name: 'Macedonian Denar' },
  { code: 'ALL', name: 'Albanian Lek' },
  { code: 'MDL', name: 'Moldovan Leu' },
  { code: 'BYN', name: 'Belarusian Ruble' },
  // Latin American Currencies
  { code: 'BRL', name: 'Brazilian Real' },
  { code: 'MXN', name: 'Mexican Peso' },
  { code: 'ARS', name: 'Argentine Peso' },
  { code: 'COP', name: 'Colombian Peso' },
  { code: 'PEN', name: 'Peruvian Sol' },
  { code: 'CLP', name: 'Chilean Peso' },
  { code: 'VES', name: 'Venezuelan Bolívar' },
  { code: 'BOB', name: 'Bolivian Boliviano' },
  { code: 'PYG', name: 'Paraguayan Guaraní' },
  { code: 'UYU', name: 'Uruguayan Peso' },
  { code: 'CRC', name: 'Costa Rican Colón' },
  { code: 'GTQ', name: 'Guatemalan Quetzal' },
  { code: 'HNL', name: 'Honduran Lempira' },
  { code: 'NIO', name: 'Nicaraguan Córdoba' },
  { code: 'DOP', name: 'Dominican Peso' },
  { code: 'JMD', name: 'Jamaican Dollar' },
  { code: 'TTD', name: 'Trinidad and Tobago Dollar' },
  { code: 'BSD', name: 'Bahamian Dollar' },
  { code: 'BBD', name: 'Barbadian Dollar' },
  { code: 'BZD', name: 'Belize Dollar' },
  { code: 'PAB', name: 'Panamanian Balboa' },
  { code: 'CUP', name: 'Cuban Peso' },
  { code: 'HTG', name: 'Haitian Gourde' },
  { code: 'GYD', name: 'Guyanese Dollar' },
  { code: 'SRD', name: 'Surinamese Dollar' },
  // Pacific Currencies
  { code: 'FJD', name: 'Fijian Dollar' },
  { code: 'PGK', name: 'Papua New Guinean Kina' },
  { code: 'SBD', name: 'Solomon Islands Dollar' },
  { code: 'VUV', name: 'Vanuatu Vatu' },
  { code: 'WST', name: 'Samoan Tala' },
  { code: 'TOP', name: 'Tongan Paʻanga' },
  { code: 'XPF', name: 'CFP Franc' },
  // Caribbean Currencies
  { code: 'XCD', name: 'East Caribbean Dollar' },
  { code: 'ANG', name: 'Netherlands Antillean Guilder' },
  { code: 'AWG', name: 'Aruban Florin' },
  { code: 'KYD', name: 'Cayman Islands Dollar' },
  { code: 'BMD', name: 'Bermudian Dollar' },
  // Other Currencies
  { code: 'GIP', name: 'Gibraltar Pound' },
  { code: 'FKP', name: 'Falkland Islands Pound' },
  { code: 'SHP', name: 'Saint Helena Pound' }
].sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically by name

const CurrencyPreferencesV2 = () => {
  const { notifySuccess, notifyError } = useNotification();
  const { currency: currentCurrency, updateCurrency: updateGlobalCurrency } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingCurrency, setPendingCurrency] = useState(null);
  const [lastSavedCurrency, setLastSavedCurrency] = useState('USD');
  const [apiStatus, setApiStatus] = useState({ loading: false, error: null, success: false });

  // Load current currency preference on mount
  useEffect(() => {
    console.log('💰 [CurrencyPreferencesV2] === COMPONENT MOUNTED ===');
    loadCurrentCurrency();
  }, []);

  // Update selected currency when global currency changes
  useEffect(() => {
    if (currentCurrency?.code) {
      console.log('💰 [CurrencyPreferencesV2] Global currency changed:', currentCurrency);
      setSelectedCurrency(currentCurrency.code);
      setLastSavedCurrency(currentCurrency.code);
    }
  }, [currentCurrency]);

  const loadCurrentCurrency = async () => {
    console.log('💰 [CurrencyPreferencesV2] === LOADING CURRENT CURRENCY ===');
    setApiStatus({ loading: true, error: null, success: false });
    
    try {
      const response = await fetch('/api/currency/preferences', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        credentials: 'include'
      });
      
      console.log('💰 [CurrencyPreferencesV2] Load response:', {
        status: response.status,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (response.ok) {
        const data = await response.json();
        console.log('💰 [CurrencyPreferencesV2] Loaded data:', data);
        
        if (data.success && data.preferences?.currency_code) {
          setSelectedCurrency(data.preferences.currency_code);
          setLastSavedCurrency(data.preferences.currency_code);
          setApiStatus({ loading: false, error: null, success: true });
        }
      } else {
        console.error('💰 [CurrencyPreferencesV2] Failed to load preferences:', response.status);
        setApiStatus({ loading: false, error: `Failed to load (${response.status})`, success: false });
      }
    } catch (error) {
      console.error('💰 [CurrencyPreferencesV2] Error loading currency preference:', error);
      setApiStatus({ loading: false, error: error.message, success: false });
    }
  };

  const handleCurrencyChange = (e) => {
    const newCurrencyCode = e.target.value;
    const newCurrency = CURRENCIES.find(c => c.code === newCurrencyCode);
    
    if (!newCurrency) return;

    console.log('💰 [CurrencyPreferencesV2] Currency selection changed:', {
      from: selectedCurrency,
      to: newCurrencyCode,
      currency: newCurrency
    });

    // Show confirmation modal
    setPendingCurrency(newCurrency);
    setShowConfirmModal(true);
  };

  const confirmCurrencyChange = async () => {
    if (!pendingCurrency) return;

    console.log('💰 [CurrencyPreferencesV2] === CONFIRMING CURRENCY CHANGE ===');
    console.log('💰 [CurrencyPreferencesV2] Pending currency:', pendingCurrency);

    setLoading(true);
    setApiStatus({ loading: true, error: null, success: false });
    
    try {
      // Get currency symbol from currencyFormatter
      const currencyInfo = getCurrencyInfo(pendingCurrency.code);
      
      const requestBody = {
        currency_code: pendingCurrency.code,
        currency_name: pendingCurrency.name,
        currency_symbol: currencyInfo.symbol,
        previous_currency: selectedCurrency
      };
      
      console.log('💰 [CurrencyPreferencesV2] === SENDING UPDATE REQUEST ===');
      console.log('💰 [CurrencyPreferencesV2] URL: /api/currency/preferences');
      console.log('💰 [CurrencyPreferencesV2] Method: PUT');
      console.log('💰 [CurrencyPreferencesV2] Body:', requestBody);
      console.log('💰 [CurrencyPreferencesV2] Timestamp:', new Date().toISOString());
      
      const response = await fetch('/api/currency/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

      console.log('💰 [CurrencyPreferencesV2] === RESPONSE RECEIVED ===');
      console.log('💰 [CurrencyPreferencesV2] Status:', response.status);
      console.log('💰 [CurrencyPreferencesV2] Status Text:', response.statusText);
      console.log('💰 [CurrencyPreferencesV2] Headers:', Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        const data = await response.json();
        console.log('💰 [CurrencyPreferencesV2] === UPDATE SUCCESS ===');
        console.log('💰 [CurrencyPreferencesV2] Response data:', data);
        console.log('💰 [CurrencyPreferencesV2] Changed from', selectedCurrency, 'to', pendingCurrency.code);
        
        // Update global currency context for immediate UI update
        updateGlobalCurrency({
          currency_code: pendingCurrency.code,
          currency_name: pendingCurrency.name,
          currency_symbol: currencyInfo.symbol,
          code: pendingCurrency.code,
          name: pendingCurrency.name,
          symbol: currencyInfo.symbol
        });

        // Update local state
        setSelectedCurrency(pendingCurrency.code);
        setLastSavedCurrency(pendingCurrency.code);
        setApiStatus({ loading: false, error: null, success: true });
        
        // Close modal and show success
        setShowConfirmModal(false);
        notifySuccess(`Currency changed to ${pendingCurrency.name}`);
        
        // Log final state
        console.log('💰 [CurrencyPreferencesV2] Final state:', {
          selectedCurrency: pendingCurrency.code,
          lastSavedCurrency: pendingCurrency.code,
          globalCurrency: pendingCurrency.code
        });
      } else {
        console.error('💰 [CurrencyPreferencesV2] === UPDATE FAILED ===');
        console.error('💰 [CurrencyPreferencesV2] Status:', response.status);
        
        let errorMessage = 'Failed to update currency';
        try {
          const contentType = response.headers.get('content-type');
          console.error('💰 [CurrencyPreferencesV2] Content-Type:', contentType);
          
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            console.error('💰 [CurrencyPreferencesV2] Error data:', data);
            errorMessage = data.error || data.detail || errorMessage;
          } else {
            const text = await response.text();
            console.error('💰 [CurrencyPreferencesV2] Non-JSON response:', text.substring(0, 500));
            
            if (response.status === 502) {
              errorMessage = 'Backend service unavailable. Please try again in a moment.';
            } else if (response.status === 404) {
              errorMessage = 'Currency API endpoint not found. Please contact support.';
            } else if (response.status === 401) {
              errorMessage = 'Authentication required. Please sign in again.';
            }
          }
        } catch (parseError) {
          console.error('💰 [CurrencyPreferencesV2] Error parsing response:', parseError);
        }
        
        setApiStatus({ loading: false, error: errorMessage, success: false });
        notifyError(errorMessage);
      }
    } catch (error) {
      console.error('💰 [CurrencyPreferencesV2] === NETWORK ERROR ===');
      console.error('💰 [CurrencyPreferencesV2] Error type:', error.name);
      console.error('💰 [CurrencyPreferencesV2] Error message:', error.message);
      console.error('💰 [CurrencyPreferencesV2] Error stack:', error.stack);
      
      const errorMessage = error.message.includes('NetworkError') 
        ? 'Network error. Please check your connection.'
        : 'Failed to update currency. Please try again.';
        
      setApiStatus({ loading: false, error: errorMessage, success: false });
      notifyError(errorMessage);
    } finally {
      setLoading(false);
      setPendingCurrency(null);
      console.log('💰 [CurrencyPreferencesV2] === REQUEST COMPLETE ===');
    }
  };

  const ConfirmationModal = () => {
    if (!showConfirmModal || !pendingCurrency) return null;

    const currentCurrencyName = CURRENCIES.find(c => c.code === selectedCurrency)?.name || selectedCurrency;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center mb-4">
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500 mr-3" />
            <h3 className="text-lg font-semibold">Confirm Currency Change</h3>
          </div>
          
          <p className="text-gray-600 mb-6">
            Change currency from <strong>{currentCurrencyName}</strong> to <strong>{pendingCurrency.name}</strong>?
          </p>

          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setShowConfirmModal(false);
                setPendingCurrency(null);
              }}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={confirmCurrencyChange}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Confirm'}
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
        
        {/* API Status Indicator */}
        <div className="flex items-center text-sm">
          {apiStatus.loading && (
            <span className="text-gray-500">Loading...</span>
          )}
          {apiStatus.success && !apiStatus.loading && (
            <span className="flex items-center text-green-600">
              <CheckCircleIcon className="h-4 w-4 mr-1" />
              Connected
            </span>
          )}
          {apiStatus.error && !apiStatus.loading && (
            <span className="flex items-center text-red-600">
              <XMarkIcon className="h-4 w-4 mr-1" />
              {apiStatus.error}
            </span>
          )}
        </div>
      </div>

      {/* Currency Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Display Currency
        </label>
        <div className="relative">
          <select
            value={selectedCurrency}
            onChange={handleCurrencyChange}
            disabled={loading || apiStatus.loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            {CURRENCIES.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.name} ({currency.code})
              </option>
            ))}
          </select>
          {selectedCurrency !== lastSavedCurrency && (
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
              <span className="text-xs text-yellow-600">Unsaved</span>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Select the currency for displaying amounts throughout your business
        </p>
      </div>

      {/* Debug Info (Remove in production) */}
      <div className="text-xs text-gray-400 mt-4">
        <p>Current: {selectedCurrency} | Saved: {lastSavedCurrency}</p>
        <p>API Status: {JSON.stringify(apiStatus)}</p>
      </div>

      {/* Information Note */}
      <div className="bg-blue-50 rounded-lg p-4">
        <div className="flex items-start">
          <InformationCircleIcon className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-1">
              Display Currency Only
            </h4>
            <p className="text-sm text-blue-700">
              This setting changes how amounts are displayed in your dashboards and reports. 
              All payments are still processed in USD.
            </p>
          </div>
        </div>
      </div>

      <ConfirmationModal />
    </div>
  );
};

export default CurrencyPreferencesV2;