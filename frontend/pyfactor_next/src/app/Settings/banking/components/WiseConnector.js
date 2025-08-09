'use client';

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { ButtonSpinner } from '@/components/ui/StandardSpinner';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

// Comprehensive country code to name mapping
const COUNTRY_NAMES = {
  // Africa
  'DZ': 'Algeria',
  'AO': 'Angola',
  'BJ': 'Benin',
  'BW': 'Botswana',
  'BF': 'Burkina Faso',
  'BI': 'Burundi',
  'CV': 'Cape Verde',
  'CM': 'Cameroon',
  'CF': 'Central African Republic',
  'TD': 'Chad',
  'KM': 'Comoros',
  'CG': 'Congo',
  'CD': 'Democratic Republic of Congo',
  'CI': 'Côte d\'Ivoire',
  'DJ': 'Djibouti',
  'EG': 'Egypt',
  'GQ': 'Equatorial Guinea',
  'ER': 'Eritrea',
  'SZ': 'Eswatini',
  'ET': 'Ethiopia',
  'GA': 'Gabon',
  'GM': 'Gambia',
  'GH': 'Ghana',
  'GN': 'Guinea',
  'GW': 'Guinea-Bissau',
  'KE': 'Kenya',
  'LS': 'Lesotho',
  'LR': 'Liberia',
  'LY': 'Libya',
  'MG': 'Madagascar',
  'MW': 'Malawi',
  'ML': 'Mali',
  'MR': 'Mauritania',
  'MU': 'Mauritius',
  'MA': 'Morocco',
  'MZ': 'Mozambique',
  'NA': 'Namibia',
  'NE': 'Niger',
  'NG': 'Nigeria',
  'RW': 'Rwanda',
  'ST': 'São Tomé and Príncipe',
  'SN': 'Senegal',
  'SC': 'Seychelles',
  'SL': 'Sierra Leone',
  'SO': 'Somalia',
  'ZA': 'South Africa',
  'SS': 'South Sudan',
  'SD': 'Sudan',
  'TZ': 'Tanzania',
  'TG': 'Togo',
  'TN': 'Tunisia',
  'UG': 'Uganda',
  'ZM': 'Zambia',
  'ZW': 'Zimbabwe',
  
  // Asia
  'AF': 'Afghanistan',
  'AM': 'Armenia',
  'AZ': 'Azerbaijan',
  'BH': 'Bahrain',
  'BD': 'Bangladesh',
  'BT': 'Bhutan',
  'BN': 'Brunei',
  'KH': 'Cambodia',
  'CN': 'China',
  'CY': 'Cyprus',
  'GE': 'Georgia',
  'IN': 'India',
  'ID': 'Indonesia',
  'IR': 'Iran',
  'IQ': 'Iraq',
  'IL': 'Israel',
  'JP': 'Japan',
  'JO': 'Jordan',
  'KZ': 'Kazakhstan',
  'KW': 'Kuwait',
  'KG': 'Kyrgyzstan',
  'LA': 'Laos',
  'LB': 'Lebanon',
  'MY': 'Malaysia',
  'MV': 'Maldives',
  'MN': 'Mongolia',
  'MM': 'Myanmar',
  'NP': 'Nepal',
  'KP': 'North Korea',
  'OM': 'Oman',
  'PK': 'Pakistan',
  'PS': 'Palestine',
  'PH': 'Philippines',
  'QA': 'Qatar',
  'SA': 'Saudi Arabia',
  'SG': 'Singapore',
  'KR': 'South Korea',
  'LK': 'Sri Lanka',
  'SY': 'Syria',
  'TW': 'Taiwan',
  'TJ': 'Tajikistan',
  'TH': 'Thailand',
  'TL': 'Timor-Leste',
  'TR': 'Turkey',
  'TM': 'Turkmenistan',
  'AE': 'United Arab Emirates',
  'UZ': 'Uzbekistan',
  'VN': 'Vietnam',
  'YE': 'Yemen',
  
  // Europe
  'AL': 'Albania',
  'AD': 'Andorra',
  'AT': 'Austria',
  'BY': 'Belarus',
  'BE': 'Belgium',
  'BA': 'Bosnia and Herzegovina',
  'BG': 'Bulgaria',
  'HR': 'Croatia',
  'CZ': 'Czech Republic',
  'DK': 'Denmark',
  'EE': 'Estonia',
  'FI': 'Finland',
  'FR': 'France',
  'DE': 'Germany',
  'GR': 'Greece',
  'HU': 'Hungary',
  'IS': 'Iceland',
  'IE': 'Ireland',
  'IT': 'Italy',
  'XK': 'Kosovo',
  'LV': 'Latvia',
  'LI': 'Liechtenstein',
  'LT': 'Lithuania',
  'LU': 'Luxembourg',
  'MT': 'Malta',
  'MD': 'Moldova',
  'MC': 'Monaco',
  'ME': 'Montenegro',
  'NL': 'Netherlands',
  'MK': 'North Macedonia',
  'NO': 'Norway',
  'PL': 'Poland',
  'PT': 'Portugal',
  'RO': 'Romania',
  'RU': 'Russia',
  'SM': 'San Marino',
  'RS': 'Serbia',
  'SK': 'Slovakia',
  'SI': 'Slovenia',
  'ES': 'Spain',
  'SE': 'Sweden',
  'CH': 'Switzerland',
  'UA': 'Ukraine',
  'GB': 'United Kingdom',
  'VA': 'Vatican City',
  
  // North America
  'AG': 'Antigua and Barbuda',
  'BS': 'Bahamas',
  'BB': 'Barbados',
  'BZ': 'Belize',
  'CA': 'Canada',
  'CR': 'Costa Rica',
  'CU': 'Cuba',
  'DM': 'Dominica',
  'DO': 'Dominican Republic',
  'SV': 'El Salvador',
  'GD': 'Grenada',
  'GT': 'Guatemala',
  'HT': 'Haiti',
  'HN': 'Honduras',
  'JM': 'Jamaica',
  'MX': 'Mexico',
  'NI': 'Nicaragua',
  'PA': 'Panama',
  'KN': 'Saint Kitts and Nevis',
  'LC': 'Saint Lucia',
  'VC': 'Saint Vincent and the Grenadines',
  'TT': 'Trinidad and Tobago',
  'US': 'United States',
  
  // South America
  'AR': 'Argentina',
  'BO': 'Bolivia',
  'BR': 'Brazil',
  'CL': 'Chile',
  'CO': 'Colombia',
  'EC': 'Ecuador',
  'GY': 'Guyana',
  'PY': 'Paraguay',
  'PE': 'Peru',
  'SR': 'Suriname',
  'UY': 'Uruguay',
  'VE': 'Venezuela',
  
  // Oceania
  'AU': 'Australia',
  'FJ': 'Fiji',
  'KI': 'Kiribati',
  'MH': 'Marshall Islands',
  'FM': 'Micronesia',
  'NR': 'Nauru',
  'NZ': 'New Zealand',
  'PW': 'Palau',
  'PG': 'Papua New Guinea',
  'WS': 'Samoa',
  'SB': 'Solomon Islands',
  'TO': 'Tonga',
  'TV': 'Tuvalu',
  'VU': 'Vanuatu',
  
  // Special regions
  'HK': 'Hong Kong',
  'MO': 'Macau',
  'PR': 'Puerto Rico',
  'GU': 'Guam',
  'VI': 'U.S. Virgin Islands',
  'AS': 'American Samoa',
  'MP': 'Northern Mariana Islands'
};

// Common currencies by region
const CURRENCIES_BY_REGION = {
  'AF': ['USD', 'EUR', 'GBP', 'ZAR', 'NGN', 'KES', 'GHS', 'EGP', 'MAD', 'ETB'],
  'AS': ['USD', 'EUR', 'CNY', 'JPY', 'INR', 'SGD', 'HKD', 'KRW', 'THB', 'MYR'],
  'EU': ['EUR', 'GBP', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'RON'],
  'NA': ['USD', 'CAD', 'MXN'],
  'SA': ['USD', 'BRL', 'ARS', 'COP', 'CLP', 'PEN', 'UYU'],
  'OC': ['AUD', 'NZD', 'FJD'],
  'DEFAULT': ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'INR', 'MXN']
};

/**
 * Get region from country code
 */
function getRegionFromCountry(country) {
  const regions = {
    // Africa
    'DZ': 'AF', 'AO': 'AF', 'BJ': 'AF', 'BW': 'AF', 'BF': 'AF', 'BI': 'AF', 'CV': 'AF', 'CM': 'AF', 
    'CF': 'AF', 'TD': 'AF', 'KM': 'AF', 'CG': 'AF', 'CD': 'AF', 'CI': 'AF', 'DJ': 'AF', 'EG': 'AF', 
    'GQ': 'AF', 'ER': 'AF', 'SZ': 'AF', 'ET': 'AF', 'GA': 'AF', 'GM': 'AF', 'GH': 'AF', 'GN': 'AF', 
    'GW': 'AF', 'KE': 'AF', 'LS': 'AF', 'LR': 'AF', 'LY': 'AF', 'MG': 'AF', 'MW': 'AF', 'ML': 'AF', 
    'MR': 'AF', 'MU': 'AF', 'MA': 'AF', 'MZ': 'AF', 'NA': 'AF', 'NE': 'AF', 'NG': 'AF', 'RW': 'AF', 
    'ST': 'AF', 'SN': 'AF', 'SC': 'AF', 'SL': 'AF', 'SO': 'AF', 'ZA': 'AF', 'SS': 'AF', 'SD': 'AF', 
    'TZ': 'AF', 'TG': 'AF', 'TN': 'AF', 'UG': 'AF', 'ZM': 'AF', 'ZW': 'AF',
    
    // Asia
    'AF': 'AS', 'AM': 'AS', 'AZ': 'AS', 'BH': 'AS', 'BD': 'AS', 'BT': 'AS', 'BN': 'AS', 'KH': 'AS',
    'CN': 'AS', 'CY': 'AS', 'GE': 'AS', 'IN': 'AS', 'ID': 'AS', 'IR': 'AS', 'IQ': 'AS', 'IL': 'AS',
    'JP': 'AS', 'JO': 'AS', 'KZ': 'AS', 'KW': 'AS', 'KG': 'AS', 'LA': 'AS', 'LB': 'AS', 'MY': 'AS',
    'MV': 'AS', 'MN': 'AS', 'MM': 'AS', 'NP': 'AS', 'KP': 'AS', 'OM': 'AS', 'PK': 'AS', 'PS': 'AS',
    'PH': 'AS', 'QA': 'AS', 'SA': 'AS', 'SG': 'AS', 'KR': 'AS', 'LK': 'AS', 'SY': 'AS', 'TW': 'AS',
    'TJ': 'AS', 'TH': 'AS', 'TL': 'AS', 'TR': 'AS', 'TM': 'AS', 'AE': 'AS', 'UZ': 'AS', 'VN': 'AS',
    'YE': 'AS', 'HK': 'AS', 'MO': 'AS',
    
    // Europe
    'AL': 'EU', 'AD': 'EU', 'AT': 'EU', 'BY': 'EU', 'BE': 'EU', 'BA': 'EU', 'BG': 'EU', 'HR': 'EU',
    'CZ': 'EU', 'DK': 'EU', 'EE': 'EU', 'FI': 'EU', 'FR': 'EU', 'DE': 'EU', 'GR': 'EU', 'HU': 'EU',
    'IS': 'EU', 'IE': 'EU', 'IT': 'EU', 'XK': 'EU', 'LV': 'EU', 'LI': 'EU', 'LT': 'EU', 'LU': 'EU',
    'MT': 'EU', 'MD': 'EU', 'MC': 'EU', 'ME': 'EU', 'NL': 'EU', 'MK': 'EU', 'NO': 'EU', 'PL': 'EU',
    'PT': 'EU', 'RO': 'EU', 'RU': 'EU', 'SM': 'EU', 'RS': 'EU', 'SK': 'EU', 'SI': 'EU', 'ES': 'EU',
    'SE': 'EU', 'CH': 'EU', 'UA': 'EU', 'GB': 'EU', 'VA': 'EU',
    
    // North America
    'AG': 'NA', 'BS': 'NA', 'BB': 'NA', 'BZ': 'NA', 'CA': 'NA', 'CR': 'NA', 'CU': 'NA', 'DM': 'NA',
    'DO': 'NA', 'SV': 'NA', 'GD': 'NA', 'GT': 'NA', 'HT': 'NA', 'HN': 'NA', 'JM': 'NA', 'MX': 'NA',
    'NI': 'NA', 'PA': 'NA', 'KN': 'NA', 'LC': 'NA', 'VC': 'NA', 'TT': 'NA', 'US': 'NA', 'PR': 'NA',
    'GU': 'NA', 'VI': 'NA', 'AS': 'NA', 'MP': 'NA',
    
    // South America
    'AR': 'SA', 'BO': 'SA', 'BR': 'SA', 'CL': 'SA', 'CO': 'SA', 'EC': 'SA', 'GY': 'SA', 'PY': 'SA',
    'PE': 'SA', 'SR': 'SA', 'UY': 'SA', 'VE': 'SA',
    
    // Oceania
    'AU': 'OC', 'FJ': 'OC', 'KI': 'OC', 'MH': 'OC', 'FM': 'OC', 'NR': 'OC', 'NZ': 'OC', 'PW': 'OC',
    'PG': 'OC', 'WS': 'OC', 'SB': 'OC', 'TO': 'OC', 'TV': 'OC', 'VU': 'OC'
  };
  return regions[country] || 'DEFAULT';
}

/**
 * Wise Bank Connection Component
 * Handles international bank connections via Stripe Connect
 */
export default function WiseConnector({ userCountry, onSuccess, onCancel, isConnecting, setIsConnecting }) {
  const region = getRegionFromCountry(userCountry);
  const currencies = CURRENCIES_BY_REGION[region];
  
  const [formData, setFormData] = useState({
    account_nickname: '',
    bank_name: '',
    account_holder_name: '',
    account_holder_type: 'individual', // or 'company'
    account_type: 'checking', // checking, savings, business
    currency: currencies[0] || 'USD',
    country: COUNTRY_NAMES[userCountry] || userCountry || '',
    
    // Bank details (varies by country)
    account_number: '',
    routing_number: '', // US
    sort_code: '', // UK
    iban: '', // EU
    swift_code: '', // International
    ifsc_code: '', // India
    bank_code: '', // Various countries
    branch_code: '', // Various countries
  });

  const [errors, setErrors] = useState({});

  /**
   * Handle form input changes
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  /**
   * Validate form based on country
   */
  const validateForm = () => {
    const newErrors = {};
    
    // Common validations
    if (!formData.account_nickname) {
      newErrors.account_nickname = 'Account nickname is required';
    }
    if (!formData.bank_name) {
      newErrors.bank_name = 'Bank name is required';
    }
    if (!formData.account_holder_name) {
      newErrors.account_holder_name = 'Account holder name is required';
    }
    if (!formData.country) {
      newErrors.country = 'Country is required';
    }
    
    // Country-specific validations
    const country = formData.country.toUpperCase();
    
    if (country === 'US') {
      if (!formData.account_number) {
        newErrors.account_number = 'Account number is required';
      }
      if (!formData.routing_number || formData.routing_number.length !== 9) {
        newErrors.routing_number = 'Valid 9-digit routing number is required';
      }
    } else if (country === 'GB') {
      if (!formData.account_number) {
        newErrors.account_number = 'Account number is required';
      }
      if (!formData.sort_code || !formData.sort_code.match(/^\d{6}$/)) {
        newErrors.sort_code = 'Valid 6-digit sort code is required';
      }
    } else if (country === 'IN') {
      if (!formData.account_number) {
        newErrors.account_number = 'Account number is required';
      }
      if (!formData.ifsc_code) {
        newErrors.ifsc_code = 'IFSC code is required';
      }
    } else {
      // For other countries, require either IBAN or account number
      if (!formData.iban && !formData.account_number) {
        newErrors.account_number = 'Account number or IBAN is required';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsConnecting(true);
    
    try {
      const response = await fetch('/api/banking/wise/connect/', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Bank account connected successfully!');
        onSuccess(data.connection);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to connect bank account');
      }
    } catch (error) {
      console.error('Error connecting bank:', error);
      toast.error('Failed to connect bank account');
    } finally {
      setIsConnecting(false);
    }
  };

  /**
   * Render country-specific fields
   */
  const renderCountryFields = () => {
    const country = formData.country.toUpperCase();
    
    if (country === 'US') {
      return (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Account Number *
            </label>
            <input
              type="text"
              name="account_number"
              value={formData.account_number}
              onChange={handleChange}
              className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                errors.account_number ? 'border-red-300' : ''
              }`}
            />
            {errors.account_number && (
              <p className="mt-1 text-sm text-red-600">{errors.account_number}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Routing Number (9 digits) *
            </label>
            <input
              type="text"
              name="routing_number"
              value={formData.routing_number}
              onChange={handleChange}
              maxLength="9"
              className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                errors.routing_number ? 'border-red-300' : ''
              }`}
            />
            {errors.routing_number && (
              <p className="mt-1 text-sm text-red-600">{errors.routing_number}</p>
            )}
          </div>
        </>
      );
    } else if (country === 'GB') {
      return (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Account Number *
            </label>
            <input
              type="text"
              name="account_number"
              value={formData.account_number}
              onChange={handleChange}
              className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                errors.account_number ? 'border-red-300' : ''
              }`}
            />
            {errors.account_number && (
              <p className="mt-1 text-sm text-red-600">{errors.account_number}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Sort Code (6 digits) *
            </label>
            <input
              type="text"
              name="sort_code"
              value={formData.sort_code}
              onChange={handleChange}
              placeholder="123456"
              maxLength="6"
              className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                errors.sort_code ? 'border-red-300' : ''
              }`}
            />
            {errors.sort_code && (
              <p className="mt-1 text-sm text-red-600">{errors.sort_code}</p>
            )}
          </div>
        </>
      );
    } else if (country === 'IN') {
      return (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Account Number *
            </label>
            <input
              type="text"
              name="account_number"
              value={formData.account_number}
              onChange={handleChange}
              className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                errors.account_number ? 'border-red-300' : ''
              }`}
            />
            {errors.account_number && (
              <p className="mt-1 text-sm text-red-600">{errors.account_number}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              IFSC Code *
            </label>
            <input
              type="text"
              name="ifsc_code"
              value={formData.ifsc_code}
              onChange={handleChange}
              className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                errors.ifsc_code ? 'border-red-300' : ''
              }`}
            />
            {errors.ifsc_code && (
              <p className="mt-1 text-sm text-red-600">{errors.ifsc_code}</p>
            )}
          </div>
        </>
      );
    } else {
      // International/Other countries
      return (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              IBAN (if available)
            </label>
            <input
              type="text"
              name="iban"
              value={formData.iban}
              onChange={handleChange}
              placeholder="DE89 3704 0044 0532 0130 00"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Account Number {!formData.iban && '*'}
            </label>
            <input
              type="text"
              name="account_number"
              value={formData.account_number}
              onChange={handleChange}
              className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                errors.account_number ? 'border-red-300' : ''
              }`}
            />
            {errors.account_number && (
              <p className="mt-1 text-sm text-red-600">{errors.account_number}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              SWIFT/BIC Code
            </label>
            <input
              type="text"
              name="swift_code"
              value={formData.swift_code}
              onChange={handleChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </>
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <div className="flex">
          <InformationCircleIcon className="h-5 w-5 text-yellow-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              International Banking via Wise
            </h3>
            <p className="mt-1 text-sm text-yellow-700">
              Transfer fees will apply when receiving payments. Your bank details are securely 
              stored with Stripe, our payment processor.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Account Nickname *
          </label>
          <input
            type="text"
            name="account_nickname"
            value={formData.account_nickname}
            onChange={handleChange}
            placeholder="e.g., Business Checking"
            className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
              errors.account_nickname ? 'border-red-300' : ''
            }`}
          />
          {errors.account_nickname && (
            <p className="mt-1 text-sm text-red-600">{errors.account_nickname}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Bank Name *
          </label>
          <input
            type="text"
            name="bank_name"
            value={formData.bank_name}
            onChange={handleChange}
            placeholder="e.g., Chase Bank, Bank of America"
            className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
              errors.bank_name ? 'border-red-300' : ''
            }`}
          />
          {errors.bank_name && (
            <p className="mt-1 text-sm text-red-600">{errors.bank_name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Account Holder Name *
          </label>
          <input
            type="text"
            name="account_holder_name"
            value={formData.account_holder_name}
            onChange={handleChange}
            className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
              errors.account_holder_name ? 'border-red-300' : ''
            }`}
          />
          {errors.account_holder_name && (
            <p className="mt-1 text-sm text-red-600">{errors.account_holder_name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Account Holder Type *
          </label>
          <select
            name="account_holder_type"
            value={formData.account_holder_type}
            onChange={handleChange}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="individual">Individual</option>
            <option value="company">Company</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Account Type *
          </label>
          <select
            name="account_type"
            value={formData.account_type}
            onChange={handleChange}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="checking">Checking</option>
            <option value="savings">Savings</option>
            <option value="business">Business</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Currency *
          </label>
          <select
            name="currency"
            value={formData.currency}
            onChange={handleChange}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            {currencies.map(curr => (
              <option key={curr} value={curr}>{curr}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Bank Country *
          </label>
          <input
            type="text"
            name="country"
            value={formData.country}
            onChange={handleChange}
            placeholder="e.g., US, GB, IN, NG"
            maxLength="2"
            className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
              errors.country ? 'border-red-300' : ''
            }`}
          />
          {errors.country && (
            <p className="mt-1 text-sm text-red-600">{errors.country}</p>
          )}
        </div>

        {formData.country && renderCountryFields()}
      </div>

      <div className="flex space-x-3">
        <button
          type="submit"
          disabled={isConnecting}
          className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isConnecting ? (
            <>
              <ButtonSpinner />
              <span className="ml-2">Connecting...</span>
            </>
          ) : (
            'Connect Bank Account'
          )}
        </button>
        
        <button
          type="button"
          onClick={onCancel}
          disabled={isConnecting}
          className="inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
      </div>

      <p className="text-xs text-gray-500 mt-4">
        By connecting your bank account, you agree to our Terms of Service and authorize 
        us to debit your account for approved transactions. Bank details are securely stored 
        with our PCI-compliant payment processor.
      </p>
    </form>
  );
}