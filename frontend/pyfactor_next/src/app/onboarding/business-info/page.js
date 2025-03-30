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
import { updateUserAttributes } from '@/utils/auth';
import countryList from 'react-select-country-list';
import { Box, Container, Paper, Typography, TextField, Button, Alert, CircularProgress, Select, FormControl, InputLabel } from '@/components/ui/TailwindComponents';

// Create a safe version of useToast that doesn't throw if ToastProvider is not available
const useSafeToast = () => {
  try {
    // Try to import and use the real useToast
    const { useToast } = require('@/components/Toast/ToastProvider');
    return useToast();
  } catch (error) {
    // Return a dummy implementation if ToastProvider is not available
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
  const { businessInfo, setBusinessInfo, isLoading, error } = useOnboardingStore();
  const countries = useMemo(() => countryList().getData(), []);
  
  const [formData, setFormData] = useState({
    businessName: '',
    businessType: '',
    country: '',
    legalStructure: '',
    dateFounded: new Date().toISOString().split('T')[0],
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [pageState, setPageState] = useState('loading');

  // Initialize page and verify state
  useEffect(() => {
    async function initPage() {
      try {
        logger.debug('[BusinessInfo] Initializing page');
        
        let retryCount = 0;
        const maxRetries = 3;
        
        // Function to handle state verification with retries
        const verifyStateWithRetry = async () => {
          try {
            // For business-info, we want to allow partial state handling
            const stateVerification = await onboardingService.verifyState('business-info')
              .catch(err => {
                logger.warn('[BusinessInfo] State verification failed on attempt ' + (retryCount + 1), err);
                // Return a fallback verification that allows business-info
                return {
                  isValid: true,
                  isPartial: true,
                  userData: {
                    email: '',
                    onboardingStatus: 'NOT_STARTED',
                    businessName: '',
                    businessType: ''
                  }
                };
              });
            
            if (!stateVerification) {
              // For failed verification, if we have retries left, wait and try again
              if (retryCount < maxRetries) {
                retryCount++;
                const delay = 1000 * Math.pow(1.5, retryCount);
                logger.debug(`[BusinessInfo] Retrying state verification after ${delay}ms (attempt ${retryCount}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return verifyStateWithRetry();
              } else {
                // After max retries, just return a default verification that allows business-info
                logger.warn('[BusinessInfo] Max retries reached for state verification, using default');
                return { isValid: true, isPartial: true, userData: {} };
              }
            }
            
            // Special handling for partial responses
            if (stateVerification.isPartial) {
              logger.debug('[BusinessInfo] Using partial state verification');
              return { isValid: true, isPartial: true, userData: {} };
            }
            
            // Normal case
            return stateVerification;
          } catch (error) {
            logger.error('[BusinessInfo] Error in verification retry:', error);
            
            // After error, if we have retries left, wait and try again
            if (retryCount < maxRetries) {
              retryCount++;
              const delay = 1000 * Math.pow(1.5, retryCount);
              logger.debug(`[BusinessInfo] Retrying after error with ${delay}ms delay (attempt ${retryCount}/${maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, delay));
              return verifyStateWithRetry();
            } else {
              // After max retries, just return a default verification that allows business-info
              logger.warn('[BusinessInfo] Max retries reached, using default verification');
              return { isValid: true, isPartial: true, userData: {} };
            }
          }
        };
        
        // Start verification process
        const stateVerification = await verifyStateWithRetry();
        
        if (stateVerification && !stateVerification.isValid) {
          logger.warn('[BusinessInfo] Invalid state, redirecting to:', stateVerification.redirectUrl);
          router.replace(stateVerification.redirectUrl);
          return;
        }
        
        // Reset retry counter for state fetch
        retryCount = 0;
        
        // Function to get state with retries
        const getStateWithRetry = async () => {
          try {
            // For business-info, explicitly set forBusinessInfo=true
            const state = await onboardingService.getState({ 
              allowPartial: true, 
              forBusinessInfo: true 
            });
            return state;
          } catch (error) {
            logger.error('[BusinessInfo] Error fetching state on attempt ' + (retryCount + 1), error);
            
            // If we have retries left, wait and try again
            if (retryCount < maxRetries) {
              retryCount++;
              const delay = 1000 * Math.pow(1.5, retryCount);
              logger.debug(`[BusinessInfo] Retrying state fetch after ${delay}ms (attempt ${retryCount}/${maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, delay));
              return getStateWithRetry();
            } else {
              // After max retries, just return an empty state for business-info
              logger.warn('[BusinessInfo] Max retries reached for state fetch, using empty state');
              return { 
                userData: {
                  email: '',
                  businessName: '',
                  businessType: '',
                  onboardingStatus: 'NOT_STARTED'
                }, 
                isPartial: true,
                status: 'NOT_STARTED',
                currentStep: 'business-info'
              };
            }
          }
        };
        
        // Fetch existing business info data from server with retries
        const state = await getStateWithRetry();
        
        if (state && state.userData) {
          // Use server data if available
          setFormData({
            businessName: state.userData.businessName || '',
            businessType: state.userData.businessType || '',
            country: state.userData.country || '',
            legalStructure: state.userData.legalStructure || '',
            dateFounded: state.userData.dateFounded || new Date().toISOString().split('T')[0],
          });
          logger.debug('[BusinessInfo] Loaded data from server', state.userData);
        } else if (businessInfo) {
          // Fall back to local store
          setFormData({
            businessName: businessInfo.businessName || '',
            businessType: businessInfo.businessType || '',
            country: businessInfo.country || '',
            legalStructure: businessInfo.legalStructure || '',
            dateFounded: businessInfo.dateFounded || new Date().toISOString().split('T')[0],
          });
          logger.debug('[BusinessInfo] Loaded data from local store');
        }
        
        setPageState('ready');
      } catch (error) {
        logger.error('[BusinessInfo] Error initializing page:', error);
        setPageState('error');
        setFormError('Failed to initialize page. Please try refreshing.');
      }
    }
    
    initPage();
  }, [businessInfo, router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (formError) setFormError('');
  };

  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return '';
  };

  // Validate business info fields
  const validateBusinessInfo = async (data) => {
    // Check for required fields
    if (!data.businessName || data.businessName.trim() === '') {
      return false;
    }
    
    if (!data.businessType || data.businessType === '') {
      return false;
    }
    
    // Additional validation can be added here
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');

    try {
      logger.debug('[BusinessInfo] Submitting form data');

      // Validate the form data
      const isValid = await validateBusinessInfo(formData);
      if (!isValid) {
        setFormError('Please fill in all required fields.');
        setSubmitting(false);
        return;
      }

      // First, set critical cookies immediately - this is crucial for navigation
      const now = new Date();
      const expiresDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
      const statusCookie = `onboardedStatus=BUSINESS_INFO; path=/; expires=${expiresDate.toUTCString()}; samesite=lax`;
      const stepCookie = `onboardingStep=subscription; path=/; expires=${expiresDate.toUTCString()}; samesite=lax`;
      
      document.cookie = statusCookie;
      document.cookie = stepCookie;
      
      logger.debug('[BusinessInfo] Setting critical cookies: ', { statusCookie, stepCookie });

      // Set business name and type cookies
      document.cookie = `businessName=${encodeURIComponent(formData.businessName)}; path=/; expires=${expiresDate.toUTCString()}; samesite=lax`;
      document.cookie = `businessType=${encodeURIComponent(formData.businessType)}; path=/; expires=${expiresDate.toUTCString()}; samesite=lax`;
      
      // Update Cognito user attributes with business info
      const userAttributeUpdates = {
        'custom:onboarding': 'BUSINESS_INFO',
        'custom:attrversion': 'v1.0.0'
      };
      
      if (formData.businessName) {
        userAttributeUpdates['custom:businessname'] = formData.businessName;
      }
      
      if (formData.businessType) {
        userAttributeUpdates['custom:businesstype'] = formData.businessType;
      }
      
      if (formData.country) {
        userAttributeUpdates['custom:businesscountry'] = formData.country;
      }
      
      if (formData.legalStructure) {
        userAttributeUpdates['custom:legalstructure'] = formData.legalStructure;
      }
      
      if (formData.dateFounded) {
        userAttributeUpdates['custom:datefounded'] = formData.dateFounded;
      }
      
      // Add business ID if we have one
      const uuid = crypto.randomUUID();
      userAttributeUpdates['custom:businessid'] = uuid;
      
      logger.debug('[Auth] Updating user attributes', { attributes: Object.keys(userAttributeUpdates) });
      
      // Do the update in the background to not block navigation
      updateUserAttributes({ userAttributes: userAttributeUpdates })
        .then(() => {
          logger.debug('[Auth] User attributes updated successfully');
          logger.debug('[BusinessInfo] Cognito attributes updated successfully');
        })
        .catch(error => {
          logger.error('[Auth] Error updating user attributes:', error);
          
          // If the update fails, try again with a fallback endpoint
          fetch('/api/onboarding/fix-attributes', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              attributes: userAttributeUpdates
            })
          })
          .then(response => {
            if (response.ok) {
              logger.debug('[BusinessInfo] Fallback attribute update succeeded');
            } else {
              logger.error('[BusinessInfo] Fallback attribute update failed:', response.status);
            }
          })
          .catch(fallbackError => {
            logger.error('[BusinessInfo] Fallback attribute update error:', fallbackError);
          });
        });

      // Update the local store
      setBusinessInfo(formData);
      logger.debug('[OnboardingStore] Business info updated successfully');
      
      // Update the server state in the background
      Promise.resolve().then(async () => {
        try {
          await onboardingService.updateState('business-info', {
            businessName: formData.businessName,
            businessType: formData.businessType,
            country: formData.country,
            legalStructure: formData.legalStructure,
            dateFounded: formData.dateFounded,
            businessId: crypto.randomUUID()
          });
          logger.debug('[BusinessInfo] Server state updated successfully');
        } catch (serverError) {
          logger.error('[BusinessInfo] Error updating server state (non-blocking):', serverError);
        }
      });

      // Verify the cookie values before navigation
      const cookieStatus = getCookie('onboardedStatus');
      const cookieStep = getCookie('onboardingStep');
      logger.debug('[BusinessInfo] Verified cookie values: ', {
        cookieStatus,
        cookieStep,
        expected: {
          status: 'BUSINESS_INFO',
          step: 'subscription'
        }
      });

      // Update local store
      logger.debug('[BusinessInfo] Local store updated successfully');
      
      // GUARANTEED NAVIGATION TO SUBSCRIPTION PAGE
      // Use both the router.push method AND a fallback for reliability
      const timestamp = Date.now();
      const targetUrl = `/onboarding/subscription?ts=${timestamp}`;
      
      logger.debug(`[BusinessInfo] Navigating to subscription page: ${targetUrl}`);
      
      // Primary navigation method
      router.push(targetUrl);
      
      // Backup navigation method after a short delay
      // This ensures that if the router.push has issues, we still get to the subscription page
      setTimeout(() => {
        // Double-check we're not already on the subscription page
        if (window.location.pathname !== '/onboarding/subscription') {
          logger.debug('[BusinessInfo] Using fallback navigation to subscription page');
          // Use direct browser navigation as ultimate fallback
          window.location.href = targetUrl + '&fallback=true';
        }
      }, 800);
    } catch (error) {
      logger.error('[BusinessInfo] Error submitting form:', error);
      setFormError('An error occurred while saving your business information. Please try again.');
      setSubmitting(false);
    }
  };

  if (pageState === 'loading' || isLoading) {
    return (
      <Container maxWidth="sm">
        <Box className="min-h-screen flex items-center justify-center">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Paper className="p-6 sm:p-10 flex flex-col gap-6 rounded-lg shadow-md bg-white">
        {(error || formError) && (
          <Alert severity="error" className="mb-4">
            {error || formError}
          </Alert>
        )}

        <div className="text-center mb-2">
          <Typography variant="h4" component="h1" className="mb-2">
            Business Information
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Tell us about your business so we can customize your experience
          </Typography>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <TextField
            label="Business Name"
            name="businessName"
            value={formData.businessName}
            onChange={handleChange}
            required
            fullWidth
            disabled={submitting}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormControl fullWidth>
              <Select
                label="Business Type"
                name="businessType"
                value={formData.businessType}
                onChange={handleChange}
                required
                disabled={submitting}
              >
                <option value="">Select a business type</option>
                {businessTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <Select
                label="Country"
                name="country"
                value={formData.country}
                onChange={handleChange}
                required
                disabled={submitting}
              >
                <option value="">Select your country</option>
                {countries.map((country) => (
                  <option key={country.value} value={country.value}>
                    {country.label}
                  </option>
                ))}
              </Select>
            </FormControl>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormControl fullWidth>
              <Select
                label="Legal Structure"
                name="legalStructure"
                value={formData.legalStructure}
                onChange={handleChange}
                required
                disabled={submitting}
              >
                <option value="">Select legal structure</option>
                {legalStructures.map((structure) => (
                  <option key={structure} value={structure}>
                    {structure}
                  </option>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Date Founded"
              name="dateFounded"
              type="date"
              value={formData.dateFounded}
              onChange={handleChange}
              required
              fullWidth
              disabled={submitting}
            />
          </div>

          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={submitting}
              className="w-full md:w-auto"
            >
              {submitting ? (
                <div className="flex items-center justify-center">
                  <CircularProgress size="small" className="mr-2" />
                  <span>Saving...</span>
                </div>
              ) : (
                'Continue to Subscription'
              )}
            </Button>
          </div>
        </form>
      </Paper>
    </Container>
  );
}
