'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { fetchUserAttributes, updateUserAttributes, getCurrentUser } from 'aws-amplify/auth';
import { authenticatedRoute } from '@/components/AuthenticatedRoute';
import { logger } from '@/utils/logger';
import { setCache, getCache } from '@/utils/cacheClient';
import LoadingScreen from '@/components/LoadingScreen';
import { businessTypes, legalStructures } from '@/app/utils/businessData';
import { countries } from 'countries-list';

const BusinessInfoPage = () => {
  const router = useRouter();
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
  const [userId, setUserId] = useState(null);

  // Get current user on mount
  useEffect(() => {
    const getUserId = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUserId(currentUser.userId);
      } catch (error) {
        logger.error('[BusinessInfoPage] Error getting current user:', error);
      }
    };
    getUserId();
  }, []);

  // Check if required fields are filled
  const isValid = useMemo(() => {
    const requiredFields = ['legal_name', 'business_type', 'legal_structure', 'country'];
    return requiredFields.every(field => businessInfo[field]?.trim());
  }, [businessInfo]);

  // Convert countries-list object to array for dropdown
  const countryOptions = useMemo(() => {
    return Object.entries(countries).map(([code, country]) => ({
      value: country.name,
      label: country.name,
      code: code // Store the country code as well
    })).sort((a, b) => a.label.localeCompare(b.label));
  }, []);

  // Format businessTypes for dropdown
  const businessTypeOptions = useMemo(() => {
    return businessTypes.map(type => ({
      value: type,
      label: type
    }));
  }, []);

  // Format legalStructures for dropdown
  const legalStructureOptions = useMemo(() => {
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
          // Fallback to Cognito attributes
          try {
            logger.debug('[BusinessInfoPage] Fetching business info from Cognito');
            const attributes = await fetchUserAttributes();
            
            const cognitoData = {
              legal_name: attributes['custom:businessname'] || '',
              business_type: attributes['custom:businesstype'] || '',
              legal_structure: attributes['custom:legalstructure'] || '',
              country: attributes['custom:businesscountry'] || 'United States',
              founded_date: attributes['custom:datefounded'] || new Date().toISOString().split('T')[0]
            };
            
            // Store in app cache for quick access
            setCache('business_info', cognitoData, { ttl: 3600000 }); // 1 hour
            
            setBusinessInfo(prevState => ({
              ...prevState,
              ...cognitoData
            }));
            
            logger.debug('[BusinessInfoPage] Business info loaded from Cognito', { cognitoData });
          } catch (cognitoError) {
            logger.error('[BusinessInfoPage] Failed to fetch business info from Cognito', cognitoError);
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

    fetchBusinessInfo();
  }, []);

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
      logger.debug('[BusinessInfoPage] Saving business info to Cognito and AppCache', businessInfo);
      
      // Get the country code for the selected country
      const selectedCountry = countryOptions.find(option => option.value === businessInfo.country);
      const countryCode = selectedCountry?.code || 'US'; // Default to US if not found
      
      // Generate a business ID that is exactly 36 characters
      const timestamp = Date.now().toString();
      const randomString = Math.random().toString(36).substring(2, 10);
      const paddedId = `bus_${timestamp}_${randomString}`.padEnd(36, '0').substring(0, 36);
      
      // Format the data for Cognito attributes
      const userAttributes = {
        'custom:businessname': businessInfo.legal_name,
        'custom:businesstype': businessInfo.business_type,
        'custom:legalstructure': businessInfo.legal_structure,
        'custom:businesscountry': countryCode, // Use the country code (2-3 chars) instead of full name
        'custom:datefounded': businessInfo.founded_date,
        'custom:businessid': paddedId, // Ensure it's exactly 36 chars
        'custom:onboarding': 'subscription', // Track progress in onboarding flow
        'custom:updated_at': new Date().toISOString(),
        'custom:setupdone': 'false', // Setup isn't done until onboarding is complete
        'custom:attrversion': '1.0.0' // Ensure at least 5 characters
      };
      
      // Update Cognito attributes directly
      await updateUserAttributes({
        userAttributes
      });
      
      logger.debug('[BusinessInfoPage] Business info saved to Cognito successfully');
      
      // Save business ID in app cache
      setCache('businessId', paddedId, { ttl: 86400000 * 30 }); // 30 days
      
      // Store the complete business info object in cache with the updated fields
      const updatedBusinessInfo = {
        ...businessInfo,
        business_id: paddedId,
        country_code: countryCode
      };
      
      // Update app cache with new data
      setCache('business_info', updatedBusinessInfo, { ttl: 3600000 }); // 1 hour
      
      // Cache user attributes if we have a userId
      if (userId) {
        const userSpecificInfo = {
          businessId: paddedId,
          businessName: businessInfo.legal_name,
          businessType: businessInfo.business_type,
          legalStructure: businessInfo.legal_structure,
          countryCode: countryCode,
          foundedDate: businessInfo.founded_date
        };
        
        setCache(`user_${userId}_businessInfo`, userSpecificInfo, { ttl: 86400000 }); // 24 hours
      }
      
      // Update onboarding state in app cache
      const onboardingStatus = {
        businessInfoCompleted: true,
        currentStep: 'subscription',
        lastUpdated: new Date().toISOString()
      };
      
      setCache('onboarding_status', onboardingStatus, { ttl: 86400000 }); // 24 hours
      
      logger.debug('[BusinessInfoPage] Business info updated successfully, redirecting to subscription page');
      
      // Force redirection with a small delay to ensure state is properly updated
      setTimeout(() => {
        // Use the Next.js router push with specific options for more reliable navigation
        router.push('/onboarding/subscription?source=business-info&ts=' + Date.now(), { 
          forceOptimisticNavigation: true 
        });
        
        // Fallback with direct window.location for problematic cases
        setTimeout(() => {
          if (window.location.pathname.includes('/business-info')) {
            logger.warn('[BusinessInfoPage] Router navigation failed, using direct location change');
            window.location.href = '/onboarding/subscription?source=business-info&fallback=true&ts=' + Date.now();
          }
        }, 1000);
      }, 300);
    } catch (error) {
      logger.error('[BusinessInfoPage] Failed to update business info', error);
      setError('Failed to save business information. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
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

export default authenticatedRoute(BusinessInfoPage);
