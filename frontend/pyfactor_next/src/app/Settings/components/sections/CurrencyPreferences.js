import React, { useState, useEffect } from 'react';
import { 
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
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

const CurrencyPreferences = () => {
  const { notifySuccess, notifyError } = useNotification();
  const { currency: currentCurrency, updateCurrency: updateGlobalCurrency } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingCurrency, setPendingCurrency] = useState(null);

  // Load current currency preference on mount
  useEffect(() => {
    loadCurrentCurrency();
  }, []);

  // Update selected currency when global currency changes
  useEffect(() => {
    if (currentCurrency?.code) {
      setSelectedCurrency(currentCurrency.code);
    }
  }, [currentCurrency]);

  const loadCurrentCurrency = async () => {
    try {
      const response = await fetch('/api/currency/preferences/');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.preferences?.currency_code) {
          setSelectedCurrency(data.preferences.currency_code);
        }
      }
    } catch (error) {
      console.error('Error loading currency preference:', error);
    }
  };

  const handleCurrencyChange = (e) => {
    const newCurrencyCode = e.target.value;
    const newCurrency = CURRENCIES.find(c => c.code === newCurrencyCode);
    
    if (!newCurrency) return;

    // Show confirmation modal
    setPendingCurrency(newCurrency);
    setShowConfirmModal(true);
  };

  const confirmCurrencyChange = async () => {
    if (!pendingCurrency) return;

    setLoading(true);
    try {
      // Get currency symbol from currencyFormatter
      const currencyInfo = getCurrencyInfo(pendingCurrency.code);
      
      // Save to database
      const response = await fetch('/api/currency/preferences/', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currency_code: pendingCurrency.code,
          currency_name: pendingCurrency.name,
          currency_symbol: currencyInfo.symbol
        }),
      });

      if (response.ok) {
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
        
        // Close modal and show success
        setShowConfirmModal(false);
        notifySuccess(`Currency changed to ${pendingCurrency.name}`);
      } else {
        const data = await response.json();
        notifyError(data.error || 'Failed to update currency');
      }
    } catch (error) {
      console.error('Error updating currency:', error);
      notifyError('Failed to update currency. Please try again.');
    } finally {
      setLoading(false);
      setPendingCurrency(null);
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
      <div className="flex items-center mb-6">
        <CurrencyDollarIcon className="h-6 w-6 text-blue-600 mr-3" />
        <h3 className="text-lg font-semibold">Currency Preferences</h3>
      </div>

      {/* Currency Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Display Currency
        </label>
        <select
          value={selectedCurrency}
          onChange={handleCurrencyChange}
          disabled={loading}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {CURRENCIES.map((currency) => (
            <option key={currency.code} value={currency.code}>
              {currency.name} ({currency.code})
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Select the currency for displaying amounts throughout your business
        </p>
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

export default CurrencyPreferences;