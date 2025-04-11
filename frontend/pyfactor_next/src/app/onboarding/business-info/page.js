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
import { Box, Container, Paper, Typography, TextField, Button, Alert, CircularProgress, Select, FormControl } from '@/components/ui/TailwindComponents';
import { setAuthCookies } from '@/utils/cookieManager';
import { 
  COGNITO_ATTRIBUTES,
  COOKIE_NAMES, 
  STORAGE_KEYS,
  ONBOARDING_STATUS,
  ONBOARDING_STEPS,
  ONBOARDING_STATES
} from '@/constants/onboarding';
import { safeUpdateUserAttributes, mockUpdateUserAttributes } from '@/utils/safeAttributes';
import { safeParseJson, safeParseJsonText } from '@/utils/redirectUtils';
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress';
import { ErrorBoundary } from '@/components/ErrorBoundary/ErrorBoundary';

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

// Business info form component
function BusinessInfoForm() {
  const router = useRouter();
  const toast = useSafeToast();
  const { updateOnboardingStep, STEPS } = useOnboardingProgress();
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
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [localBusinessInfo, setLocalBusinessInfo] = useState(null);
  const [apiRetryExhausted, setApiRetryExhausted] = useState(false);
  
  // Options for form
  const countries = useMemo(() => countryList().getData(), []);
  const businessTypeOptions = useMemo(() => businessTypes.map(type => ({ value: type, label: type })), []);
  const legalStructureOptions = useMemo(() => legalStructures.map(structure => ({ value: structure, label: structure })), []);

  // Set a timeout to show form even if API never responds
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        logger.warn('[BusinessInfo] Loading timeout reached, showing form anyway');
        setLoadingTimeout(true);
        setLoading(false);
      }
    }, 5000); // 5 second timeout

    return () => clearTimeout(timeout);
  }, [loading]);

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
        let maxRetries = 2; // Reduce retries to make page load faster
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
              // Wait before retrying (shorter delay to make page load faster)
              const delay = 800 * Math.pow(1.5, retryCount - 1);
              logger.debug(`[BusinessInfo] Retrying in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            } else {
              // All retries exhausted
              setApiRetryExhausted(true);
            }
          }
        }

        // If all retries failed or loading timeout was reached, continue with default empty data
        // This ensures new users can still fill out the form even if API is down
        if ((!response && apiRetryExhausted) || loadingTimeout) {
          logger.error('[BusinessInfo] API fetch failed or timed out, proceeding with empty form');
          setLoading(false);
          return;
        }

        if (!response) {
          throw fetchError || new Error('Failed to fetch business info after multiple attempts');
        }
        
        // Check for token expiration or auth errors
        if (response.status === 401 || response.status === 403) {
          // Continue with empty form for new users
          logger.info('[BusinessInfo] Authentication error but continuing for new users');
          setLoading(false);
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
          logger.warn(`[BusinessInfo] API response not OK: ${response.status}`);
          setLoading(false);
          return;
        }
        
        // Use the safe parse utility
        const data = await safeParseJson(response, {
          context: 'BusinessInfo_Fetch',
          defaultValue: { businessInfo: {} },
          throwOnHtml: false
        });
        
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
        // Don't block the form on fetch errors
      } finally {
        setLoading(false);
      }
    }

    fetchBusinessInfo();
  }, [router, toast, apiRetryExhausted, loadingTimeout]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Save to localStorage as a backup
    try {
      const updatedData = { ...formData, [name]: value };
      localStorage.setItem('businessInfo', JSON.stringify(updatedData));
    } catch (e) {
      // Ignore localStorage errors
    }
  };
  
  const handleSelectChange = (name, selectedOption) => {
    setFormData(prev => ({ ...prev, [name]: selectedOption.value }));
    
    // Save to localStorage as a backup
    try {
      const updatedData = { ...formData, [name]: selectedOption.value };
      localStorage.setItem('businessInfo', JSON.stringify(updatedData));
    } catch (e) {
      // Ignore localStorage errors
    }
  };

  const validateBusinessInfo = (data) => {
    // Required fields
    if (!data.businessName) return { valid: false, message: 'Business name is required' };
    if (!data.businessType) return { valid: false, message: 'Business type is required' };
    if (!data.country) return { valid: false, message: 'Country is required' };
    if (!data.legalStructure) return { valid: false, message: 'Legal structure is required' };
    
    return { valid: true }; // No errors
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      logger.debug('[BusinessInfo] Form submitted, sending data:', formData);
      
      // Save to localStorage as a backup before submitting
      try {
        localStorage.setItem('businessInfo', JSON.stringify(formData));
        localStorage.setItem('businessInfoSubmitted', 'true');
        document.cookie = `businessInfoSubmitted=true;path=/;max-age=${60*60*24*7}`;
      } catch (e) {
        // Ignore localStorage errors
      }
      
      // Try submitting to API
      let apiSuccess = false;
      let apiAttempts = 0;
      const maxApiAttempts = 2;
      
      while (!apiSuccess && apiAttempts < maxApiAttempts) {
        try {
          const response = await fetch('/api/onboarding/business-info', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
          });
          
          // Check for redirect responses that might indicate session timeout
          if ([302, 307, 308].includes(response.status)) {
            logger.warn('[BusinessInfo] Received redirect response from API, redirecting to login');
            toast.warning('Your session has expired. Redirecting to login...');
            window.location.href = '/login?redirect=/onboarding/business-info';
            return;
          }

          if (response.ok) {
            apiSuccess = true;
          } else {
            apiAttempts++;
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          apiAttempts++;
          logger.error(`[BusinessInfo] API submission attempt ${apiAttempts} failed:`, error);
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // Whether API call succeeded or not, continue to next step
      // This allows users to progress even when API is having issues
      logger.info(`[BusinessInfo] Proceeding to next step (API success: ${apiSuccess})`);
      
      // Update onboarding progress
      if (typeof updateOnboardingStep === 'function') {
        updateOnboardingStep(STEPS.SUBSCRIPTION);
      }
      
      // Explicit timeout to ensure async state updates complete
      setTimeout(() => {
        // Navigate to the next step
        router.push('/onboarding/subscription');
      }, 500);
      
    } catch (error) {
      logger.error('[BusinessInfo] Error submitting form:', error);
      setFormError('There was a problem submitting your information. Please try again.');
      toast.error('There was a problem submitting your information. Please try again.');
      setSubmitting(false);
    }
  };

  function generateUUID(seed) {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  const onFormSubmit = (e) => {
    e.preventDefault();
    const validation = validateBusinessInfo(formData);
    
    if (!validation.valid) {
      setFormError(validation.message);
      toast.error(validation.message);
      return;
    }
    
    setFormError('');
    handleSubmit(e);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <CircularProgress color="primary" />
      </div>
    );
  }

  // The form UI component and the rest of the code remains the same...
  return (
    <Container maxWidth="md" className="pt-8 pb-12">
      <Paper className="px-6 py-6 shadow-md rounded-lg">
        <Typography variant="h5" className="mb-4 font-semibold">Business Information</Typography>
        
        {formError && (
          <Alert severity="error" className="mb-4">{formError}</Alert>
        )}
        
        <form onSubmit={onFormSubmit} className="space-y-6">
          <TextField
            fullWidth
            label="Business Name"
            name="businessName"
            value={formData.businessName}
            onChange={handleChange}
            required
            helperText="Enter the legal name of your business"
          />
          
          <FormControl fullWidth>
            <label htmlFor="business-type-label">Business Type</label>
            <Select
              id="business-type-label"
              name="businessType"
              value={formData.businessType}
              onChange={handleChange}
              required
            >
              {businessTypeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </FormControl>
          
          <FormControl fullWidth>
            <label htmlFor="country-label">Country</label>
            <Select
              id="country-label"
              name="country"
              value={formData.country}
              onChange={handleChange}
              required
            >
              {countries.map(country => (
                <option key={country.value} value={country.value}>
                  {country.label}
                </option>
              ))}
            </Select>
          </FormControl>
          
          <FormControl fullWidth>
            <label htmlFor="legal-structure-label">Legal Structure</label>
            <Select
              id="legal-structure-label"
              name="legalStructure"
              value={formData.legalStructure}
              onChange={handleChange}
              required
            >
              {legalStructureOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </FormControl>
          
          <TextField
            fullWidth
            label="Date Founded"
            name="dateFounded"
            type="date"
            value={formData.dateFounded}
            onChange={handleChange}
          />
          
          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={submitting}
            >
              {submitting ? (
                <div className="flex items-center">
                  <CircularProgress size={20} color="inherit" className="mr-2" />
                  Processing...
                </div>
              ) : (
                'Continue'
              )}
            </Button>
          </div>
        </form>
      </Paper>
    </Container>
  );
}

// Main component with error boundary
export default function BusinessInfoPage() {
  return (
    <ErrorBoundary 
      componentName="BusinessInfoForm"
      FallbackComponent={({ error, resetErrorBoundary }) => (
        <Container maxWidth="md" className="pt-8 pb-12">
          <Paper className="px-6 py-6 shadow-md rounded-lg bg-red-50">
            <Typography variant="h5" className="mb-4 font-semibold text-red-700">
              Error Loading Business Information
            </Typography>
            <Typography className="mb-4 text-red-700">
              {error?.message || "An error occurred while loading this page."}
            </Typography>
            <div className="flex space-x-4">
              <Button
                variant="outlined"
                color="secondary"
                onClick={() => window.location.href = '/onboarding'}
              >
                Back to Onboarding
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={resetErrorBoundary}
              >
                Try Again
              </Button>
            </div>
          </Paper>
        </Container>
      )}
    >
      <BusinessInfoForm />
    </ErrorBoundary>
  );
}
