'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@auth0/nextjs-auth0';
import { logger } from '@/utils/logger';
import { setCache, getCache } from '@/utils/cacheClient';
import LoadingScreen from '@/components/LoadingScreen';
import ErrorBoundary from '@/components/ErrorBoundary';
import { businessTypes, legalStructures } from '@/app/utils/businessData';

// Safe import with fallback for countries
let countries = {};
try {
  const countriesModule = require('countries-list');
  countries = countriesModule.countries || {};
} catch (error) {
  logger.error('[BusinessInfoPage] Failed to import countries-list', error);
  // Fallback country list
  countries = {
    US: { name: 'United States' },
    CA: { name: 'Canada' },
    GB: { name: 'United Kingdom' },
    AU: { name: 'Australia' },
    DE: { name: 'Germany' },
    FR: { name: 'France' },
    JP: { name: 'Japan' },
    IN: { name: 'India' },
    BR: { name: 'Brazil' },
    MX: { name: 'Mexico' }
  };
}

// Safe import for API function with fallback
let submitBusinessInfo;
try {
  const apiModule = require('@/services/api/onboarding');
  // Wrap the original function to use frontend API instead of backend API
  const originalSubmitBusinessInfo = apiModule.submitBusinessInfo;
  submitBusinessInfo = async (data) => {
    logger.debug('[BusinessInfoPage] Using frontend API wrapper to avoid 403 errors', data);
    
    // Always use the frontend NextJS API route to avoid backend authentication issues
    const response = await fetch('/api/onboarding/business-info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  };
} catch (error) {
  logger.error('[BusinessInfoPage] Failed to import submitBusinessInfo', error);
  submitBusinessInfo = async (data) => {
    logger.debug('[BusinessInfoPage] Using fallback submitBusinessInfo - calling frontend API', data);
    
    // Use the frontend NextJS API route instead of backend API to avoid 403 errors
    const response = await fetch('/api/onboarding/business-info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  };
}

const BusinessInfoPageContent = () => {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [businessInfo, setBusinessInfo] = useState({
    legal_name: '',
    business_type: '',
    legal_structure: '',
    country: 'United States',
    founded_date: new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD format
  });

  // Check if required fields are filled
  const isValid = useMemo(() => {
    const requiredFields = ['legal_name', 'business_type', 'legal_structure', 'country'];
    return requiredFields.every(field => businessInfo[field]?.trim());
  }, [businessInfo]);

  // Convert countries object to array for dropdown with safety check
  const countryOptions = useMemo(() => {
    if (!countries || typeof countries !== 'object') {
      logger.warn('[BusinessInfoPage] Countries data not available, using fallback');
      return [{ value: 'United States', label: 'United States', code: 'US' }];
    }
    
    return Object.entries(countries).map(([code, country]) => ({
      value: country.name,
      label: country.name,
      code: code // Store the country code as well
    })).sort((a, b) => a.label.localeCompare(b.label));
  }, []);

  // Format businessTypes for dropdown with safety check
  const businessTypeOptions = useMemo(() => {
    if (!businessTypes || !Array.isArray(businessTypes)) {
      logger.warn('[BusinessInfoPage] businessTypes not available, using fallback');
      return [
        { value: 'General Business', label: 'General Business' },
        { value: 'Consulting', label: 'Consulting' },
        { value: 'Technology', label: 'Technology' },
        { value: 'Retail', label: 'Retail' },
        { value: 'Other', label: 'Other' }
      ];
    }
    
    return businessTypes.map(type => ({
      value: type,
      label: type
    }));
  }, []);

  // Format legalStructures for dropdown with safety check
  const legalStructureOptions = useMemo(() => {
    if (!legalStructures || !Array.isArray(legalStructures)) {
      logger.warn('[BusinessInfoPage] legalStructures not available, using fallback');
      return [
        { value: 'LLC', label: 'LLC' },
        { value: 'Corporation', label: 'Corporation' },
        { value: 'Sole Proprietorship', label: 'Sole Proprietorship' },
        { value: 'Partnership', label: 'Partnership' },
        { value: 'Other', label: 'Other' }
      ];
    }
    
    return legalStructures.map(structure => ({
      value: structure,
      label: structure
    }));
  }, []);

  // Fetch business info on component mount
  useEffect(() => {
    const fetchBusinessInfo = async () => {
      try {
        setLoading(true);
        
        // Try to get from app cache first
        const cachedData = getCache('business_info');
        
        if (cachedData) {
          logger.debug('[BusinessInfoPage] Using cached business info', { cachedData });
          setBusinessInfo(prevState => ({
            ...prevState,
            ...cachedData
          }));
        } else {
          // Try to get from API
          try {
            logger.debug('[BusinessInfoPage] Fetching business info from API');
            const response = await fetch('/api/onboarding/business-info');
            
            if (response.ok) {
              const data = await response.json();
              
              if (data.businessInfo) {
                const apiData = {
                  legal_name: data.businessInfo.businessName || '',
                  business_type: data.businessInfo.businessType || '',
                  legal_structure: data.businessInfo.legalStructure || '',
                  country: data.businessInfo.country || 'United States',
                  founded_date: data.businessInfo.dateFounded || new Date().toISOString().split('T')[0]
                };
                
                // Store in app cache for quick access
                setCache('business_info', apiData, { ttl: 3600000 }); // 1 hour
                
                setBusinessInfo(prevState => ({
                  ...prevState,
                  ...apiData
                }));
                
                logger.debug('[BusinessInfoPage] Business info loaded from API', { apiData });
              }
            }
          } catch (apiError) {
            logger.error('[BusinessInfoPage] Failed to fetch business info from API', apiError);
            // Keep default values already set in state
          }
        }
      } catch (error) {
        logger.error('[BusinessInfoPage] Failed to fetch business info', error);
        setError('Failed to load business information. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    // Only fetch data when user auth state is resolved
    if (!userLoading) {
      fetchBusinessInfo();
    }
  }, [userLoading]);

  // Handle field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setBusinessInfo(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isValid) {
      setError('Please fill in all required fields');
      return;
    }
    
    setError(null);
    setSubmitting(true);
    
    try {
      logger.debug('[BusinessInfoPage] Saving business info via API', businessInfo);
      
      // Get the country code for the selected country
      const selectedCountry = countryOptions.find(option => option.value === businessInfo.country);
      const countryCode = selectedCountry?.code || 'US'; // Default to US if not found
      
      // Prepare data for API submission
      const submissionData = {
        businessName: businessInfo.legal_name,
        businessType: businessInfo.business_type,
        legalStructure: businessInfo.legal_structure,
        country: countryCode, // Use the country code (2-3 chars) instead of full name
        dateFounded: businessInfo.founded_date,
        firstName: user?.given_name || user?.name?.split(' ')[0] || '',
        lastName: user?.family_name || user?.name?.split(' ').slice(1).join(' ') || ''
      };
      
      // Submit via API
      const response = await submitBusinessInfo(submissionData);
      
      logger.debug('[BusinessInfoPage] Business info saved via API successfully', response);
      
      // Update app cache with new data
      const updatedBusinessInfo = {
        ...businessInfo,
        business_id: response?.tenant_id || response?.businessId
      };
      
      setCache('business_info', updatedBusinessInfo, { ttl: 3600000 }); // 1 hour
      
      // Update onboarding state in app cache
      const onboardingStatus = {
        businessInfoCompleted: true,
        currentStep: 'subscription',
        lastUpdated: new Date().toISOString()
      };
      
      setCache('onboarding_status', onboardingStatus, { ttl: 86400000 }); // 24 hours
      
      logger.debug('[BusinessInfoPage] Business info updated successfully, redirecting to subscription page');
      
      // Navigate to subscription page
      router.push('/onboarding/subscription');
    } catch (error) {
      logger.error('[BusinessInfoPage] Failed to update business info', error);
      setError('Failed to save business information. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (userLoading || loading) {
    return <LoadingScreen message="Loading your business information..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-6 sm:p-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Business Information</h1>
              <p className="mt-2 text-gray-600">
                Please provide your business details to continue.
              </p>
            </div>
            
            {error && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="bg-gray-50 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Business Details</h2>
                <div className="space-y-4">
                  {/* Business Name */}
                  <div>
                    <label htmlFor="legal_name" className="block text-sm font-medium text-gray-700 mb-1">
                      Business Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="legal_name"
                      name="legal_name"
                      value={businessInfo.legal_name}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      required
                    />
                  </div>
                  
                  {/* Business Type */}
                  <div>
                    <label htmlFor="business_type" className="block text-sm font-medium text-gray-700 mb-1">
                      Business Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="business_type"
                      name="business_type"
                      value={businessInfo.business_type}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      required
                    >
                      <option value="">Select Business Type</option>
                      {businessTypeOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Legal Structure */}
                  <div>
                    <label htmlFor="legal_structure" className="block text-sm font-medium text-gray-700 mb-1">
                      Legal Structure <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="legal_structure"
                      name="legal_structure"
                      value={businessInfo.legal_structure}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      required
                    >
                      <option value="">Select Legal Structure</option>
                      {legalStructureOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Country */}
                  <div>
                    <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                      Country <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="country"
                      name="country"
                      value={businessInfo.country}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      required
                    >
                      <option value="">Select Country</option>
                      {countryOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Founded Date */}
                  <div>
                    <label htmlFor="founded_date" className="block text-sm font-medium text-gray-700 mb-1">
                      Date Founded
                    </label>
                    <input
                      type="date"
                      id="founded_date"
                      name="founded_date"
                      value={businessInfo.founded_date}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between pt-6">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm"
                >
                  Back
                </button>
                
                <button
                  type="submit"
                  disabled={submitting || !isValid}
                  className={`px-6 py-3 rounded-lg shadow-sm transition-colors ${
                    isValid
                      ? 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {submitting ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </div>
                  ) : (
                    'Continue'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

const BusinessInfoPage = () => {
  return (
    <ErrorBoundary>
      <BusinessInfoPageContent />
    </ErrorBoundary>
  );
};

export default BusinessInfoPage;
