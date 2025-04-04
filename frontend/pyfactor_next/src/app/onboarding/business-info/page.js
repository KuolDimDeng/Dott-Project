'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import useOnboardingStore from '@/store/onboardingStore';
import {
  businessTypes,
  legalStructures
} from '@/app/utils/businessData';
import { logger } from '@/utils/logger';
import { onboardingService } from '@/services/onboardingService';
import { updateUserAttributes } from '@/config/amplifyUnified';
import { fetchAuthSession } from 'aws-amplify/auth';
import countryList from 'react-select-country-list';
import { Box, Container, Paper, Typography, TextField, Button, Alert, CircularProgress, Select, FormControl, InputLabel } from '@/components/ui/TailwindComponents';
import { setAuthCookies } from '@/utils/cookieManager';
import { 
  COGNITO_ATTRIBUTES,
  COOKIE_NAMES, 
  STORAGE_KEYS,
  ONBOARDING_STATUS,
  ONBOARDING_STEPS
} from '@/constants/onboarding';

// Create a safe version of useToast
const useSafeToast = () => {
  try {
    const { useToast } = require('@/components/Toast/ToastProvider');
    return useToast();
  } catch (error) {
    return {
      success: (message) => console.log('[Toast Success]', message),
      error: (message) => console.error('[Toast Error]', message),
      info: (message) => console.info('[Toast Info]', message),
      warning: (message) => console.warn('[Toast Warning]', message),
    };
  }
};

export default function BusinessInfoPage() {
  const router = useRouter();
  const toast = useSafeToast();
  const [formData, setFormData] = useState({
    businessName: '',
    businessType: '',
    country: '',
    legalStructure: '',
    dateFounded: new Date().toISOString().split('T')[0],
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(true);
  const [localBusinessInfo, setLocalBusinessInfo] = useState(null);
  
  // Options for form
  const countries = useMemo(() => countryList().getData(), []);
  const businessTypeOptions = useMemo(() => businessTypes.map(type => ({ value: type, label: type })), []);
  const legalStructureOptions = useMemo(() => legalStructures.map(structure => ({ value: structure, label: structure })), []);

  useEffect(() => {
    // Fetch business info
    async function fetchBusinessInfo() {
      try {
        setLoading(true);
        
        // Check local storage first as a fallback
        try {
          const storedInfo = localStorage.getItem('businessInfo');
          if (storedInfo) {
            const parsedInfo = JSON.parse(storedInfo);
            logger.debug('[BusinessInfo] Loaded backup data from localStorage');
            setFormData(prev => ({
              ...prev,
              ...parsedInfo
            }));
          }
        } catch (e) {
          // Ignore localStorage errors
        }

        // Add retry logic for fetching
        let response = null;
        let maxRetries = 3;
        let retryCount = 0;
        let fetchError = null;

        while (retryCount <= maxRetries) {
          try {
            // Add timestamp to prevent caching
            response = await fetch(`/api/onboarding/business-info?t=${Date.now()}-${retryCount}`, {
              headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
              }
            });
            
            // If response is received (even with error status), break the retry loop
            break;
          } catch (error) {
            fetchError = error;
            retryCount++;
            
            logger.warn(`[BusinessInfo] API fetch attempt ${retryCount} failed:`, error);
            
            if (retryCount <= maxRetries) {
              // Wait before retrying (exponential backoff)
              const delay = 1000 * Math.pow(2, retryCount - 1);
              logger.debug(`[BusinessInfo] Retrying in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        }

        if (!response) {
          throw fetchError || new Error('Failed to fetch business info after multiple attempts');
        }
        
        // Check for token expiration or auth errors
        if (response.status === 401 || response.status === 403) {
          // Mark that we are in onboarding to avoid redirect loops
          try {
            localStorage.setItem('onboardingInProgress', 'true');
            localStorage.setItem('onboardingStep', 'business-info');
            document.cookie = `onboardingInProgress=true;path=/;max-age=${60*60*24}`;
            document.cookie = `onboardingStep=business-info;path=/;max-age=${60*60*24}`;
          } catch (e) {
            // Ignore storage errors
          }
          
          // Show notice but don't redirect immediately
          toast.warning('Please sign in to continue with onboarding');
          // Use replace to avoid navigation history issues
          setTimeout(() => {
            router.replace('/auth/signin?from=business-info&ts=' + Date.now());
          }, 1500);
          return;
        }
        
        // For server errors, we'll just use the data we have from localStorage
        if (response.status >= 500) {
          logger.warn('[BusinessInfo] Server error when fetching business info:', response.status);
          toast.warning('Unable to load your saved information. Please fill out the form again or try refreshing the page.');
          setLoading(false);
          return;
        }
        
        if (!response.ok) {
          throw new Error(`Failed to fetch business info (status: ${response.status})`);
        }
        
        // Safely parse response JSON
        let data;
        try {
          const responseText = await response.text();
          
          // Check if the response is empty
          if (!responseText.trim()) {
            logger.warn('[BusinessInfo] Server returned empty response');
            data = { businessInfo: {} };
          } else {
            // Try to parse JSON
            data = JSON.parse(responseText);
          }
        } catch (jsonError) {
          logger.error('[BusinessInfo] Error parsing server response:', jsonError);
          throw new Error('Server returned an invalid response');
        }
        
        // Check for token expiration notice in the response
        if (data.tokenExpired || data.shouldRefresh) {
          logger.warn('[BusinessInfo] Token expired detected in API response');
          try {
            localStorage.setItem('tokenExpired', 'true');
            document.cookie = `tokenExpired=true;path=/;max-age=${60*5}`; // 5 minutes
          } catch (e) {
            // Ignore storage errors
          }
          // Continue loading the page with the data we have
        }
        
        setLocalBusinessInfo(data);
        
        // Pre-populate form with received data
        if (data && data.businessInfo) {
          setFormData(prev => ({
            businessName: data.businessInfo.businessName || prev.businessName,
            businessType: data.businessInfo.businessType || prev.businessType,
            country: data.businessInfo.country || prev.country,
            legalStructure: data.businessInfo.legalStructure || prev.legalStructure,
            dateFounded: data.businessInfo.dateFounded || prev.dateFounded
          }));
        }
      } catch (err) {
        logger.error('[BusinessInfo] Error fetching business info:', err);
        toast.error('There was a problem loading your business information. You can still continue with the form.');
        // Don't block the form on fetch errors
      } finally {
        setLoading(false);
      }
    }

    fetchBusinessInfo();
  }, [router, toast]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSelectChange = (name, selectedOption) => {
    setFormData(prev => ({ ...prev, [name]: selectedOption.value }));
  };

  const validateBusinessInfo = (data) => {
    // Required fields
    if (!data.businessName) return { valid: false, message: 'Business name is required' };
    if (!data.businessType) return { valid: false, message: 'Business type is required' };
    if (!data.country) return { valid: false, message: 'Country is required' };
    if (!data.legalStructure) return { valid: false, message: 'Legal structure is required' };
    
    return { valid: true }; // No errors
  };

  const handleSubmit = async () => {
    if (
      !formData.businessName ||
      !formData.businessType ||
      !formData.country ||
      !formData.legalStructure ||
      !formData.dateFounded
    ) {
      setFormError('Please fill in all required fields.');
      return;
    }
    
    // Store in localStorage as a backup
    try {
      localStorage.setItem('businessInfo', JSON.stringify(formData));
      localStorage.setItem('businessName', formData.businessName);
      logger.info('Saved business info to localStorage');
    } catch (e) {
      logger.warn('Failed to save business info to localStorage:', e);
    }
    
    // Store business name in cookies with various formats for compatibility
    try {
      document.cookie = `businessName=${encodeURIComponent(formData.businessName)}; path=/; max-age=31536000`;
      document.cookie = `business_name=${encodeURIComponent(formData.businessName)}; path=/; max-age=31536000`;
      document.cookie = `custom:businessname=${encodeURIComponent(formData.businessName)}; path=/; max-age=31536000`;
      
      // Set onboarding status cookies to complete (lowercase)
      document.cookie = `onboardingStatus=complete; path=/; max-age=31536000`;
      document.cookie = `onboardedStatus=complete; path=/; max-age=31536000`;
      document.cookie = `onboardingStep=complete; path=/; max-age=31536000`;
      document.cookie = `setupCompleted=true; path=/; max-age=31536000`;
      document.cookie = `ONBOARDING_STEP=complete; path=/; max-age=31536000`;
      
      logger.info('Set business name and onboarding status cookies');
    } catch (e) {
      logger.warn('Failed to set cookies:', e);
    }
    
    try {
      setLoading(true);
      setSubmitting(true);
      
      // Development mode check before Cognito session
      if (process.env.NODE_ENV === 'development' && localStorage.getItem('bypassAuthValidation') === 'true') {
        logger.debug('[BusinessInfo] Development mode: bypassing session check and updating user attributes');
        
        // Store these values in localStorage for development mode
        localStorage.setItem('custom:businessname', formData.businessName);
        localStorage.setItem('custom:businesstype', formData.businessType);
        localStorage.setItem('custom:businesscountry', formData.country);
        localStorage.setItem('custom:legalstructure', formData.legalStructure);
        localStorage.setItem('custom:datefounded', formData.dateFounded);
        localStorage.setItem('custom:onboarding', 'business-info');
        
        // Redirect to subscription page in development mode
        logger.info('Business info submitted successfully (dev mode), navigating to subscription page');
        const timestamp = new Date().getTime();
        router.push(`/onboarding/subscription?t=${timestamp}`);
        return;
      }
      
      // Store onboarding progress marker
      localStorage.setItem('onboardingInProgress', 'true');
      localStorage.setItem('onboardingStep', 'business-info-complete');
      localStorage.setItem('businessInfoSubmitted', 'true');
      
      // Production code - check for real session
      let resp;
      try {
        resp = await fetchAuthSession();
      } catch (sessionError) {
        logger.warn('Error fetching auth session:', sessionError);
        
        // Forced redirect to subscription page even if session check fails
        // This ensures the flow continues even with session issues
        logger.info('Redirecting to subscription page despite session check failure');
        const timestamp = new Date().getTime();
        router.push(`/onboarding/subscription?t=${timestamp}`);
        return;
      }
      
      const session = resp?.session;
      
      if (!session) {
        logger.warn('No active session found, but continuing onboarding flow');
        
        // Instead of redirecting to login, continue the flow
        // This prevents losing the user's input and breaking the onboarding flow
        const timestamp = new Date().getTime();
        router.push(`/onboarding/subscription?t=${timestamp}`);
        return;
      }
      
      // Add user attributes for Cognito
      const userAttributes = {
        'custom:businessname': formData.businessName,
        'custom:businesstype': formData.businessType,
        'custom:businesscountry': formData.country,
        'custom:legalstructure': formData.legalStructure,
        'custom:datefounded': formData.dateFounded,
        'custom:onboarding': 'business-info',
        'custom:setupdone': 'true',
        'custom:updated_at': new Date().toISOString()
      };
      
      // Try to update user attributes, but don't block the flow if it fails
      try {
        const requestData = {
          idToken: session.idToken.value,
          attributes: userAttributes
        };
        
        // Call the API to update user attributes
        const response = await fetch('/api/user/update_attributes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
          logger.warn('Failed to update user attributes:', await response.json());
          // But continue with the flow
        } else {
          logger.info('Successfully updated user attributes with business info');
        }
      } catch (attributeError) {
        logger.warn('Error updating user attributes:', attributeError);
        // Continue with the flow despite attribute update errors
      }
      
      // Navigate to subscription page after successful submission
      logger.info('Business info submitted successfully, navigating to subscription page');
      const timestamp = new Date().getTime();
      router.push(`/onboarding/subscription?t=${timestamp}`);
      
    } catch (error) {
      logger.error('Error saving business info:', error);
      setFormError('Failed to save business information. Please try again.');
      
      // Still try to redirect to the next step despite errors
      setTimeout(() => {
        const timestamp = new Date().getTime();
        router.push(`/onboarding/subscription?t=${timestamp}`);
      }, 1000);
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  // Form submission
  const onFormSubmit = (e) => {
    e.preventDefault();
    // Pass the component's formData state to the submit handler
    handleSubmit();
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 md:hidden">Let's set up your business profile</h1>
        <p className="mt-2 text-gray-600 md:hidden">Tell us about your business to customize your experience</p>
      </div>
      
      {formError && (
        <Alert severity="error" className="mb-6">
          {formError}
        </Alert>
      )}
      
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <CircularProgress size="md" />
          <span className="ml-3 text-gray-600">Loading your information...</span>
        </div>
      ) : (
        <form onSubmit={onFormSubmit} className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
            <div className="border-b border-gray-200 pb-4 mb-4">
              <h2 className="text-lg font-medium text-gray-900">Basic Information</h2>
              <p className="text-sm text-gray-500">Tell us about your business</p>
            </div>
            
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="businessName"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Enter your business name"
                  required
                />
              </div>
              
              <div className="sm:col-span-2">
                <label htmlFor="businessType" className="block text-sm font-medium text-gray-700 mb-1">
                  Business Type <span className="text-red-500">*</span>
                </label>
                <select
                  id="businessType"
                  name="businessType"
                  value={formData.businessType}
                  onChange={handleChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  required
                >
                  <option value="">Select a business type</option>
                  {businessTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Select the category that best describes your business
                </p>
              </div>
              
              <div>
                <label htmlFor="legalStructure" className="block text-sm font-medium text-gray-700 mb-1">
                  Legal Structure <span className="text-red-500">*</span>
                </label>
                <select
                  id="legalStructure"
                  name="legalStructure"
                  value={formData.legalStructure}
                  onChange={handleChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  required
                >
                  <option value="">Select legal structure</option>
                  {legalStructures.map(structure => (
                    <option key={structure} value={structure}>{structure}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                  Country <span className="text-red-500">*</span>
                </label>
                <select
                  id="country"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  required
                >
                  <option value="">Select country</option>
                  {countries.map(country => (
                    <option key={country.value} value={country.value}>{country.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="dateFounded" className="block text-sm font-medium text-gray-700 mb-1">
                  Date Founded
                </label>
                <input
                  type="date"
                  id="dateFounded"
                  name="dateFounded"
                  value={formData.dateFounded}
                  onChange={handleChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              className="inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <CircularProgress size="sm" color="inherit" className="mr-2" />
                  Saving...
                </>
              ) : (
                'Continue to Subscription'
              )}
            </button>
          </div>
          
          <div className="mt-4 text-sm text-gray-500 text-center">
            <p>Fields marked with <span className="text-red-500">*</span> are required</p>
          </div>
        </form>
      )}
    </div>
  );
}
