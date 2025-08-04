'use client';

import React, { useState, useEffect } from 'react';
import { 
  MagnifyingGlassIcon, 
  GlobeAltIcon, 
  ClockIcon, 
  DocumentTextIcon, 
  CreditCardIcon, 
  LanguageIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

const CountryRequirements = () => {
  const [countries, setCountries] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [countryInfo, setCountryInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCountries();
  }, []);

  useEffect(() => {
    if (selectedCountry) {
      fetchCountryInfo(selectedCountry);
    }
  }, [selectedCountry]);

  const fetchCountries = async () => {
    try {
      const response = await fetch('/api/taxes/countries', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setCountries(data.countries || []);
      }
    } catch (error) {
      console.error('Error fetching countries:', error);
    }
  };

  const fetchCountryInfo = async (countryCode) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/taxes/countries/${countryCode}/requirements`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setCountryInfo(data.info);
      }
    } catch (error) {
      console.error('Error fetching country info:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getFilingFrequencyColor = (frequency) => {
    switch (frequency) {
      case 'monthly':
        return 'bg-red-100 text-red-800';
      case 'quarterly':
        return 'bg-yellow-100 text-yellow-800';
      case 'annual':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredCountries = countries.filter(country =>
    country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    country.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        Global Tax Filing Requirements
      </h1>
      <p className="text-gray-600 mb-8">
        View tax filing requirements, deadlines, and fees for all supported countries
      </p>

      {/* Country Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Search countries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div>
          <select
            className="block w-full px-3 py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
          >
            <option value="">Select Country</option>
            {filteredCountries.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name} ({country.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Country Information */}
      {loading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : countryInfo ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <GlobeAltIcon className="h-6 w-6 text-blue-600 mr-2" />
              <h2 className="text-xl font-semibold">Basic Information</h2>
            </div>
            
            <div className="space-y-3">
              <div className="border-b pb-3">
                <p className="text-sm text-gray-600">Tax Authority</p>
                <p className="font-medium">{countryInfo.tax_authority_name || 'Not specified'}</p>
              </div>
              
              <div className="border-b pb-3">
                <p className="text-sm text-gray-600">Tax Type</p>
                <p className="font-medium">{countryInfo.tax_type?.toUpperCase() || 'N/A'}</p>
              </div>
              
              <div className="border-b pb-3">
                <p className="text-sm text-gray-600">Standard Tax Rate</p>
                <p className="font-medium">{(countryInfo.rate * 100).toFixed(2)}%</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Main Form</p>
                <p className="font-medium">{countryInfo.main_form_name || 'Not specified'}</p>
              </div>
            </div>
          </div>

          {/* Filing Requirements */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <ClockIcon className="h-6 w-6 text-blue-600 mr-2" />
              <h2 className="text-xl font-semibold">Filing Requirements</h2>
            </div>
            
            <div className="space-y-3">
              <div className="border-b pb-3">
                <p className="text-sm text-gray-600">Filing Frequency</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getFilingFrequencyColor(countryInfo.filing_frequency)}`}>
                  {countryInfo.filing_frequency || 'Not specified'}
                </span>
              </div>
              
              <div className="border-b pb-3">
                <p className="text-sm text-gray-600">Filing Deadline</p>
                <p className="font-medium">
                  {countryInfo.filing_day_of_month 
                    ? `${countryInfo.filing_day_of_month}th of each month`
                    : 'Varies'}
                </p>
              </div>
              
              <div className="border-b pb-3">
                <p className="text-sm text-gray-600">Online Filing</p>
                <div className="flex items-center">
                  {countryInfo.online_filing_available ? (
                    <>
                      <CheckCircleIcon className="h-5 w-5 text-green-500 mr-1" />
                      <span className="text-green-700">Available</span>
                    </>
                  ) : (
                    <>
                      <XCircleIcon className="h-5 w-5 text-red-500 mr-1" />
                      <span className="text-red-700">Not Available</span>
                    </>
                  )}
                </div>
              </div>
              
              {countryInfo.online_portal_name && (
                <div>
                  <p className="text-sm text-gray-600">Online Portal</p>
                  {countryInfo.online_portal_url ? (
                    <a 
                      href={countryInfo.online_portal_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      {countryInfo.online_portal_name}
                    </a>
                  ) : (
                    <p className="font-medium">{countryInfo.online_portal_name}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Service Pricing */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <CreditCardIcon className="h-6 w-6 text-blue-600 mr-2" />
              <h2 className="text-xl font-semibold">Our Service Pricing</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <DocumentTextIcon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-1">Manual Filing</p>
                <p className="text-xl font-bold text-blue-600">
                  {formatCurrency(countryInfo.manual_filing_fee)}
                </p>
                <p className="text-xs text-gray-500">We prepare, you file</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <LanguageIcon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-1">Online Filing</p>
                <p className="text-xl font-bold text-blue-600">
                  {formatCurrency(countryInfo.online_filing_fee)}
                </p>
                <p className="text-xs text-gray-500">Complete service</p>
              </div>
            </div>
            
            {!countryInfo.online_filing_available && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-800">
                  Online filing is not available for this country. 
                  Only manual filing service is offered.
                </p>
              </div>
            )}
          </div>

          {/* Filing Instructions */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <DocumentTextIcon className="h-6 w-6 text-blue-600 mr-2" />
              <h2 className="text-xl font-semibold">Filing Instructions</h2>
            </div>
            
            {countryInfo.filing_instructions ? (
              <p className="text-gray-700 leading-relaxed">
                {countryInfo.filing_instructions}
              </p>
            ) : (
              <p className="text-gray-500">
                Detailed filing instructions will be provided with your tax report.
              </p>
            )}
          </div>

          {/* Data Source Information */}
          <div className="md:col-span-2">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <p className="text-sm text-blue-900">
                <strong>Data Accuracy:</strong> This information is sourced from official government 
                websites and updated regularly. However, tax requirements can change frequently. 
                Always verify current requirements with the local tax authority before filing.
                
                {countryInfo.ai_confidence_score && (
                  <>
                    <br />
                    <strong>Confidence Score:</strong> {(countryInfo.ai_confidence_score * 100).toFixed(0)}%
                  </>
                )}
                
                {countryInfo.ai_last_verified && (
                  <>
                    <br />
                    <strong>Last Verified:</strong> {new Date(countryInfo.ai_last_verified).toLocaleDateString()}
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      ) : selectedCountry ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <p className="text-yellow-800">
            No information available for the selected country.
          </p>
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <p className="text-blue-800">
            Please select a country to view its tax filing requirements.
          </p>
        </div>
      )}
    </div>
  );
};

export default CountryRequirements;
