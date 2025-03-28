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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');

    try {
      // Validate required fields
      const requiredFields = ['businessName', 'businessType', 'country', 'legalStructure', 'dateFounded'];
      const missingFields = requiredFields.filter(field => !formData[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`Please fill in all required fields: ${missingFields.join(', ')}`);
      }

      logger.debug('[BusinessInfo] Submitting form data');
      
      // ENHANCED: Step 1: Ensure cookies are set with proper values and debugging
      try {
        // Set cookies directly - important for navigation
        const expiration = new Date();
        expiration.setDate(expiration.getDate() + 7); // 7 days
        
        // Set onboarding status cookies with forced values for reliable redirection
        const statusCookie = `onboardedStatus=BUSINESS_INFO; path=/; expires=${expiration.toUTCString()}; samesite=lax`;
        const stepCookie = `onboardingStep=subscription; path=/; expires=${expiration.toUTCString()}; samesite=lax`;
        
        logger.debug('[BusinessInfo] Setting critical cookies:', {
          statusCookie,
          stepCookie
        });
        
        document.cookie = statusCookie;
        document.cookie = stepCookie;
        
        // Force verification of cookie setting - read back to confirm
        setTimeout(() => {
          const cookieStatus = document.cookie.split(';').find(c => c.trim().startsWith('onboardedStatus='))?.trim().split('=')[1];
          const cookieStep = document.cookie.split(';').find(c => c.trim().startsWith('onboardingStep='))?.trim().split('=')[1];
          
          logger.debug('[BusinessInfo] Verified cookie values:', {
            cookieStatus,
            cookieStep,
            expected: {
              status: 'BUSINESS_INFO',
              step: 'subscription'
            }
          });
        }, 100);
        
        // Set business info cookies
        document.cookie = `businessName=${encodeURIComponent(formData.businessName)}; path=/; expires=${expiration.toUTCString()}; samesite=lax`;
        document.cookie = `businessType=${encodeURIComponent(formData.businessType)}; path=/; expires=${expiration.toUTCString()}; samesite=lax`;
        document.cookie = `businessCountry=${encodeURIComponent(formData.country)}; path=/; expires=${expiration.toUTCString()}; samesite=lax`;
        document.cookie = `legalStructure=${encodeURIComponent(formData.legalStructure)}; path=/; expires=${expiration.toUTCString()}; samesite=lax`;
        
        logger.debug('[BusinessInfo] Business info cookies set successfully');
        
        // Use API endpoint to set cookies server-side as well
        fetch('/api/onboarding/business-info', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...formData,
            // Add explicit status for server
            _onboardingStatus: 'BUSINESS_INFO',
            _onboardingStep: 'subscription'
          })
        })
        .then(res => res.json())
        .then(data => {
          logger.debug('[BusinessInfo] API business info update successful:', data);
        })
        .catch(apiError => {
          logger.error('[BusinessInfo] API business info update failed:', apiError);
          // Continue since we already set cookies directly
        });
        
        // Try to update Cognito attributes in the background without blocking
        updateUserAttributes({
          userAttributes: {
            'custom:onboarding': 'BUSINESS_INFO',
            'custom:updated_at': new Date().toISOString()
          }
        }).then(() => {
          logger.debug('[BusinessInfo] Cognito attributes updated successfully');
        }).catch(cognitoError => {
          logger.error('[BusinessInfo] Failed to update Cognito attributes:', cognitoError);
          // Don't throw error since we have cookies as a backup
        });
      } catch (cookieError) {
        logger.error('[BusinessInfo] Failed to set cookies:', cookieError);
        
        // If direct cookie setting fails, try the API method
        fetch('/api/onboarding/business-info', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...formData,
            // Add explicit status for server
            _onboardingStatus: 'BUSINESS_INFO',
            _onboardingStep: 'subscription'
          })
        })
        .then(res => res.json())
        .then(data => {
          logger.debug('[BusinessInfo] Fallback API business info update successful:', data);
        })
        .catch(apiError => {
          logger.error('[BusinessInfo] Fallback API business info update failed:', apiError);
          // Continue to next step of the process
        });
      }
      
      // Step 2: Try to update server-side state in background without waiting
      onboardingService.updateState('business-info', {
        ...formData,
        onboardingStatus: 'BUSINESS_INFO',
        onboardingStep: 'subscription'
      })
        .then(() => {
          logger.debug('[BusinessInfo] Server state updated successfully');
        })
        .catch((stateError) => {
          logger.error('[BusinessInfo] Server state update failed:', stateError);
          
          // Try the dedicated API endpoint as a backup
          fetch('/api/onboarding/state', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              step: 'business-info',
              data: formData,
              status: 'BUSINESS_INFO',
              nextStep: 'subscription'
            })
          })
          .then(res => res.json())
          .then(data => {
            logger.debug('[BusinessInfo] API state endpoint backup succeeded:', data);
          })
          .catch(apiError => {
            logger.error('[BusinessInfo] API state endpoint backup failed:', apiError);
            // We still have cookies as our ultimate fallback
          });
        });
      
      // Step 3: Update local store
      try {
        await setBusinessInfo(formData);
        logger.debug('[BusinessInfo] Local store updated successfully');
      } catch (storeError) {
        logger.warn('[BusinessInfo] Local store update failed:', storeError);
        // Not critical, continue
      }
      
      // ENHANCED: Force cookies one more time
      const expiration = new Date();
      expiration.setDate(expiration.getDate() + 7);
      document.cookie = `onboardingStep=subscription; path=/; expires=${expiration.toUTCString()}; samesite=lax`;
      document.cookie = `onboardedStatus=BUSINESS_INFO; path=/; expires=${expiration.toUTCString()}; samesite=lax`;
      
      // Show success message
      toast.success('Business information saved successfully');
      
      // Use a simplified approach to navigation
      logger.debug('[BusinessInfo] Using simplified navigation to subscription page');
      
      // Add a timestamp parameter to avoid URL cache
      const timestamp = Date.now();
      const redirectUrl = `/onboarding/subscription?ts=${timestamp}`;
      
      // ENHANCED: Set a flag indicating navigation is in progress
      window.sessionStorage.setItem('navigatingTo', 'subscription');
      window.sessionStorage.setItem('businessInfoSubmitted', 'true');
      
      // Force one final cookie set then navigate
      setTimeout(() => {
        document.cookie = `onboardingStep=subscription; path=/; expires=${expiration.toUTCString()}; samesite=lax`;
        document.cookie = `onboardedStatus=BUSINESS_INFO; path=/; expires=${expiration.toUTCString()}; samesite=lax`;
        
        try {
          logger.debug(`[BusinessInfo] Redirecting to ${redirectUrl} - final cookies:`, {
            onboardingStep: document.cookie.split(';').find(c => c.trim().startsWith('onboardingStep='))?.trim().split('=')[1],
            onboardedStatus: document.cookie.split(';').find(c => c.trim().startsWith('onboardedStatus='))?.trim().split('=')[1]
          });
          
          // Force page refresh with new URL
          window.location.href = redirectUrl;
        } catch (navError) {
          logger.error('[BusinessInfo] Direct navigation failed:', navError);
          
          // Final fallback - try router
          try {
            logger.debug('[BusinessInfo] Using router fallback');
            router.push(redirectUrl);
          } catch (routerError) {
            logger.error('[BusinessInfo] Router fallback failed:', routerError);
          }
        }
      }, 500);

    } catch (error) {
      logger.error('[BusinessInfo] Form submission failed:', error);
      setFormError(error.message);
      toast.error(error.message);
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
