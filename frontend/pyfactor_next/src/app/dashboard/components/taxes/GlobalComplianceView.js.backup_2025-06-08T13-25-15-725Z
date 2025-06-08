// src/app/dashboard/components/taxes/GlobalComplianceView.js
import React, { useState, useEffect } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';
import countries from 'i18n-iso-countries';

const GlobalComplianceView = () => {
  const [selectedCountry, setSelectedCountry] = useState('');
  const [countryData, setCountryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  // Get list of all countries
  const countryList = Object.entries(countries.getNames('en')).map(([code, name]) => ({
    code,
    name
  }));

  useEffect(() => {
    if (selectedCountry) {
      fetchCountryData(selectedCountry);
    }
  }, [selectedCountry]);

  const fetchCountryData = async (countryCode) => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(`/api/taxes/global-compliance/${countryCode}/`);
      setCountryData(response.data);
    } catch (error) {
      console.error('Error fetching country data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
        Global Tax Compliance
      </h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
            Select Country
          </h2>
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="w-full sm:w-80 rounded-md border border-gray-300 dark:border-gray-600 shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary-main focus:border-primary-main"
          >
            <option value="">Select a country</option>
            {countryList.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {countryData && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
          {/* Tabs Navigation */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex space-x-4">
              <button
                onClick={(e) => handleTabChange(e, 0)}
                className={`pb-2 px-1 ${
                  tabValue === 0
                    ? 'border-b-2 border-primary-main text-primary-main dark:text-primary-light font-medium'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Compliance Overview
              </button>
              <button
                onClick={(e) => handleTabChange(e, 1)}
                className={`pb-2 px-1 ${
                  tabValue === 1
                    ? 'border-b-2 border-primary-main text-primary-main dark:text-primary-light font-medium'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Tax Rates
              </button>
              <button
                onClick={(e) => handleTabChange(e, 2)}
                className={`pb-2 px-1 ${
                  tabValue === 2
                    ? 'border-b-2 border-primary-main text-primary-main dark:text-primary-light font-medium'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Filing Requirements
              </button>
            </div>
          </div>
          
          {/* Tab 1: Compliance Overview */}
          {tabValue === 0 && (
            <div className="p-4">
              <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                {countryData.country} - {countryData.service_level === 'full' ? 'Full-Service' : 'Self-Service'} 
              </h2>
              
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4 shadow-sm">
                <h3 className="text-base font-medium mb-2 text-gray-900 dark:text-white">Service Level</h3>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  countryData.service_level === 'full' 
                    ? 'bg-primary-main text-white' 
                    : 'bg-secondary-main text-white'
                }`}>
                  {countryData.service_level === 'full' ? 'Full-Service' : 'Self-Service'}
                </span>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  {countryData.service_level_description}
                </p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
                <h3 className="text-base font-medium mb-2 text-gray-900 dark:text-white">Special Considerations</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {countryData.special_considerations || 'None'}
                </p>
              </div>
            </div>
          )}
          
          {/* Tab 2: Tax Rates */}
          {tabValue === 1 && (
            <div className="p-4">
              <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                Tax Rates for {countryData.country}
              </h2>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tax Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Filing Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Income Range</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Rate</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {countryData.tax_rates.map((rate, index) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{rate.type}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{rate.filing_status || 'All'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {rate.min !== undefined ? 
                            rate.max ? 
                              `${rate.min.toLocaleString()} - ${rate.max.toLocaleString()}` : 
                              `${rate.min.toLocaleString()}+` 
                            : 'All Income'
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{(rate.rate * 100).toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* Tab 3: Filing Requirements */}
          {tabValue === 2 && (
            <div className="p-4">
              <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                Filing Requirements for {countryData.country}
              </h2>
              
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4 shadow-sm">
                <h3 className="text-base font-medium mb-3 text-gray-900 dark:text-white">Tax Authorities</h3>
                <ul className="space-y-2">
                  {countryData.tax_authorities.map((authority, index) => (
                    <li key={index} className="py-2">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{authority.name}</div>
                      {authority.website && (
                        <a 
                          href={authority.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-primary-main hover:text-primary-dark dark:text-primary-light hover:underline"
                        >
                          {authority.website}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
                <h3 className="text-base font-medium mb-2 text-gray-900 dark:text-white">Filing Schedule</h3>
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                  Frequency: {countryData.filing_frequency}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {countryData.filing_description}
                </p>
              </div>
            </div>
          )}

          {/* Currency Information Section - Always visible */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 mt-4">
            <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
              Currency Information
            </h2>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Currency: {countryData.currency_symbol} ({countryData.currency_code})
              </p>
              {countryData.currency_code !== 'USD' && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Exchange Rate: 1 USD = {countryData.exchange_rate} {countryData.currency_code}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalComplianceView;