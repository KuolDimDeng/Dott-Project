'use client';

import { useRouter, usePathname } from 'next/navigation';
import React, { memo, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import PropTypes from 'prop-types';
import { 
  Container, 
  Grid, 
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  Box
} from '@mui/material';
import Image from 'next/image';

import { StepHeader } from '@/app/onboarding/components/shared/StepHeader';
import { StepNavigation } from '@/app/onboarding/components/shared/StepNavigation';
import { StepProgress } from '@/app/onboarding/components/shared/StepProgress'; 
import { useBusinessInfoForm } from './useBusinessInfoForm';
import { FormContainer } from './BusinessInfo.styles';
import { businessTypes, legalStructures } from '@/app/utils/businessData';
import { countries } from '@/app/countryList/page';
import { logger } from '@/utils/logger';
import { useToast } from '@/components/Toast/ToastProvider';
import { useOnboarding } from '@/app/onboarding/contexts/OnboardingContext';
import { LoadingStateWithProgress } from '@/components/LoadingState';
import { persistenceService, STORAGE_KEYS } from '@/services/persistenceService';
import { validateSessionState } from '@/lib/authUtils';
import { ErrorBoundary } from '@/components/ErrorBoundary';



const defaultMetadata = {
  title: 'Business Information',
  description: 'Tell us about your business to get started',
  nextStep: '/onboarding/subscription',
  prevStep: null
};

const ErrorFallback = ({ error, resetErrorBoundary }) => (
  <div className="flex flex-col items-center justify-center min-h-screen p-4">
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md">
      <h2 className="text-red-800 font-semibold mb-2">Something went wrong</h2>
      <p className="text-red-600 mb-4">{error.message}</p>
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-red-100 text-red-800 rounded hover:bg-red-200"
      >
        Try Again
      </button>
    </div>
  </div>
);

const BusinessInfo = ({ metadata = defaultMetadata }) => {
  const { canNavigateToStep } = useOnboarding();
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const [isInitialized, setIsInitialized] = useState(false);
  

  const {
    methods,
    handleSubmit,
    isLoading,
    requestId
  } = useBusinessInfoForm();

  const COMPONENT_NAME = 'BusinessInfo';
  const CURRENT_STEP = 'business-info';
  const DRAFT_KEY = STORAGE_KEYS.BUSINESS_INFO_DRAFT;

  useEffect(() => {
    return () => {
      if (window.location.pathname !== '/onboarding/subscription') {
        persistenceService.saveData(DRAFT_KEY, {
          formData: {},
          metadata: {
            lastModified: new Date().toISOString(),
            hasFormData: false,
            cleared: true
          }
        });
      }
    };
  }, []);

  // Component mount logger
  useEffect(() => {
    let mounted = true;

    if (mounted) {
      logger.debug('BusinessInfo component mounted:', {
        requestId,
        authStatus: status,
        hasSession: !!session,
        formValid: methods.formState.isValid
      });
    }

    return () => {
      mounted = false;
    };
  }, [requestId, status, session, methods.formState.isValid]);

  // Session state logger
  useEffect(() => {
    let mounted = true;

    if (mounted) {
      logger.debug('BusinessInfo component session state:', {
        requestId,
        status,
        isAuthenticated: !!session?.user,
        hasToken: !!session?.user?.accessToken,
        pathname
      });
    }

    return () => {
      mounted = false;
    };
  }, [session, status, pathname, requestId]);

  // Form state logger
  useEffect(() => {
    let mounted = true;

    if (mounted) {
      logger.debug('Form validation state:', {
        requestId,
        isValid: methods.formState.isValid,
        isDirty: methods.formState.isDirty,
        errors: methods.formState.errors,
        values: methods.getValues()
      });
    }

    return () => {
      mounted = false;
    };
  }, [methods.formState, requestId, methods]);

  // Navigation state logger
  useEffect(() => {
    let mounted = true;

    if (mounted) {
      logger.debug('Navigation state check:', {
        requestId,
        canNavigateToNext: canNavigateToStep('subscription'),
        formValid: methods.formState.isValid,
        currentStep: CURRENT_STEP,
        isAuthenticated: !!session?.user
      });
    }

    return () => {
      mounted = false;
    };
  }, [methods.formState.isValid, session, requestId, canNavigateToStep]);

  // Component state logger
  useEffect(() => {
    let mounted = true;

    if (mounted) {
      logger.debug('Business info component state:', {
        isLoading,
        formValid: methods.formState.isValid,
        hasSession: !!session?.user,
        navigationEnabled: canNavigateToStep('subscription')
      });
    }

    return () => {
      mounted = false;
    };
  }, [isLoading, methods.formState.isValid, session, canNavigateToStep]);

  // Draft data loader and form change subscription
  useEffect(() => {
    let mounted = true;

    const loadAndSetupDraft = async () => {
      if (!mounted) return;

      logger.debug('Initializing form data:', {
        requestId,
        status,
        isInitialized,
        hasSession: !!session
      });

      if (status === 'loading') return;

      if (status === 'authenticated' && !isInitialized) {
        try {
          const draft = await persistenceService.getData(DRAFT_KEY);
          if (draft?.formData) {
            methods.reset(draft.formData, {
              keepDefaultValues: true // Add this option
            });
          }
          setIsInitialized(true);
        } catch (error) {
          logger.error('Failed to load draft:', {
            requestId,
            error: error.message
          });
        }
      }
    };

    loadAndSetupDraft();

    const subscription = methods.watch((formData) => {
      if (isInitialized && mounted && formData) {  // Add formData check
        persistenceService.saveData(DRAFT_KEY, {
          formData,
          metadata: {
            lastModified: new Date().toISOString(),
            hasFormData: true
          }
        });
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [status, isInitialized, methods, requestId, session]);

  // Session validator
  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      if (!mounted) return;

      logger.debug('Session check started:', {
        status,
        hasSession: !!session,
        hasUser: !!session?.user,
        hasToken: !!session?.user?.accessToken,
        tokenExpiry: session?.user?.accessTokenExpires,
        currentTime: Date.now()
      });

      if (status === 'loading') {
        logger.debug('Session still loading');
        return;
      }

      if (status === 'unauthenticated') {
        logger.debug('User not authenticated, redirecting to signin');
        const callbackUrl = encodeURIComponent(pathname);
        router.replace(`/auth/signin?callbackUrl=${callbackUrl}`);
        return;
      }

      try {
        const sessionValidation = await validateSessionState(session, crypto.randomUUID());
        logger.debug('Session validation result:', {
          isValid: sessionValidation.isValid,
          reason: sessionValidation.reason,
          redirectTo: sessionValidation.redirectTo
        });

        if (sessionValidation.isValid === false && sessionValidation.redirectTo && mounted) {
          router.replace(sessionValidation.redirectTo);
        }
      } catch (error) {
        logger.error('Session validation failed:', {
          error: error.message,
          sessionState: {
            status,
            hasUser: !!session?.user,
            hasToken: !!session?.user?.accessToken
          }
        });
      }
    };

    checkSession();

    return () => {
      mounted = false;
    };
  }, [status, session, router, pathname]);

  if (status === 'loading' || !isInitialized) {
    return <LoadingStateWithProgress message="Loading..." />;
  }

  const steps = [
    { label: 'Business Info', current: true, completed: false },
    { label: 'Subscription', current: false, completed: false },
    { label: 'Payment', current: false, completed: false },
    { label: 'Setup', current: false, completed: false }
  ];

  const handleFormSubmit = async (formData) => {
    const requestId = crypto.randomUUID();
    let toastId = null;
  
    logger.debug('Starting business info submission:', {
      requestId,
      hasFormData: !!formData,
      currentStep: 'business-info'
    });
  
    try {
      toastId = toast.loading('Saving your information...');
  
      // Save business info
      logger.debug('Making save-business-info API call:', {
        requestId,
        formData
      });
  
      const response = await fetch('/api/onboarding/save-business-info', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.user?.accessToken}`,
          'X-Request-ID': requestId
        },
        body: JSON.stringify({
          ...formData,
          requestId,
          lastUpdated: new Date().toISOString()
        })
      });
  
      logger.debug('Received API response:', {
        requestId,
        status: response.status,
        ok: response.ok
      });
  
      if (!response.ok) {
        throw new Error('Failed to save business information');
      }
  
      const responseData = await response.json();
  
      logger.debug('API response data:', {
        requestId,
        responseData,
        onboardingStatus: responseData?.data?.onboardingStatus,
        nextStep: responseData?.data?.currentStep
      });
  
      // Update session with more complete data
      logger.debug('Updating session:', {
        requestId,
        sessionUpdatePayload: {
          onboardingStatus: 'subscription',
          currentStep: 'subscription',
          completedSteps: ['business-info'],
          businessInfo: formData,
          stepValidation: {
            'business-info': true
          }
        }
      });
  
      const sessionResponse = await fetch('/api/auth/update-session', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.user?.accessToken}`
        },
        body: JSON.stringify({
          onboardingStatus: 'subscription',
          currentStep: 'subscription',
          completedSteps: ['business-info'],
          businessInfo: formData,
          stepValidation: {
            'business-info': true
          }
        })
      });
  
      logger.debug('Session update response:', {
        requestId,
        status: sessionResponse.status,
        ok: sessionResponse.ok
      });
  
      if (!sessionResponse.ok) {
        throw new Error('Failed to update session');
      }
  
      // Delay to ensure session propagation
      await new Promise(resolve => setTimeout(resolve, 1000));
  
      toast.success('Information saved successfully');
  
      logger.debug('Attempting navigation to subscription page', {
        requestId,
        target: '/onboarding/subscription'
      });
  
      // Force page navigation
      window.location.href = '/onboarding/subscription';
  
    } catch (error) {
      logger.error('Form submission failed:', {
        requestId,
        error: error.message,
        stack: error.stack
      });
      toast.error(error.message || 'Unable to proceed. Please try again.');
    } finally {
      if (toastId) {
        toast.dismiss(toastId);
      }
    }
  };

  const validateSessionUpdate = (session) => {
    if (!session?.user) {
      return {
        isValid: false,
        reason: 'No user data in session'
      };
    }
  
    if (!session.user.onboardingStatus) {
      return {
        isValid: false,
        reason: 'Missing onboarding status'
      };
    }
  
    return {
      isValid: true,
      status: session.user.onboardingStatus
    };
  };

  const handleOnboardingRedirect = async (nextStep) => {
    const requestId = crypto.randomUUID();
    
    try {
      logger.debug('Handling onboarding redirect:', {
        requestId,
        from: CURRENT_STEP,
        to: nextStep,
        hasSession: !!session?.user,
        sessionState: {
          hasToken: !!session?.user?.accessToken,
          tokenExpiry: session?.user?.accessTokenExpires
        }
      });
  
      // Validate session before navigation
      if (!session?.user?.accessToken) {
        throw new Error('Invalid session state');
      }
      
      await router.push(`/onboarding/${nextStep}`);
  
    } catch (error) {
      logger.error('Navigation failed:', {
        requestId,
        error: error.message,
        nextStep,
        currentPath: pathname
      });
      
      if (error.message.includes('session')) {
        const callbackUrl = encodeURIComponent('/onboarding/business-info');
        router.replace(`/auth/signin?callbackUrl=${callbackUrl}`);
      } else {
        toast.error('Failed to navigate to next step');
      }
    }
  };

  const renderTextField = (name, label, options = {}) => (
    <TextField
      fullWidth
      label={label}
      {...methods.register(name)}
      error={!!methods.formState.errors[name]}
      helperText={methods.formState.errors[name]?.message}
      onChange={methods.register(name).onChange}
      disabled={isLoading}
      {...options}
    />
  );

  return (
    <Container maxWidth="md">
       <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        window.location.reload();
      }}
    >
       {/* Add logo and spacing */}
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'center',
      mt: 4, // margin top
      mb: 4  // margin bottom
    }}>
      <Image
        src="/static/images/Pyfactor.png"
        alt="Pyfactor Logo"
        width={150} // adjust size as needed
        height={120} // adjust size as needed
        priority
      />
    </Box>
      <StepProgress steps={steps} />
      <StepHeader 
        title={metadata.title}
        description={metadata.description}
        currentStep={1}
        totalSteps={4}
        stepName="Business Information"
      />
      <FormContainer>
      <form 
          onSubmit={(e) => {
            e.preventDefault();
            methods.handleSubmit(handleFormSubmit)(e);
          }} 
          noValidate
        >          
          <Grid container spacing={3}>
            <Grid item xs={12}>
              {renderTextField('businessName', 'Business Name')}
            </Grid>
            <Grid item xs={12}>
              <FormControl 
                fullWidth 
                error={!!methods.formState.errors.industry}
                disabled={isLoading}
              >
                <InputLabel id="industry-label">Industry</InputLabel>
                <Select
                  labelId="industry-label"
                  label="Industry"
                  {...methods.register('industry')}
                  onChange={methods.register('industry').onChange}
                >
                  {businessTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
                {methods.formState.errors.industry && (
                  <FormHelperText>
                    {methods.formState.errors.industry.message}
                  </FormHelperText>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl 
                fullWidth 
                error={!!methods.formState.errors.country}
                disabled={isLoading}
              >
                <InputLabel id="country-label">Country</InputLabel>
                <Select
                  labelId="country-label"
                  label="Country"
                  {...methods.register('country')}
                  onChange={methods.register('country').onChange}
                >
                  {countries.map((country) => (
                    <MenuItem key={country.code} value={country.name}>
                      {country.name}
                    </MenuItem>
                  ))}
                </Select>
                {methods.formState.errors.country && (
                  <FormHelperText>
                    {methods.formState.errors.country.message}
                  </FormHelperText>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl 
                fullWidth 
                error={!!methods.formState.errors.legalStructure}
                disabled={isLoading}
              >
                <InputLabel id="legal-structure-label">Legal Structure</InputLabel>
                <Select
                  labelId="legal-structure-label"
                  label="Legal Structure"
                  {...methods.register('legalStructure')}
                  onChange={methods.register('legalStructure').onChange}
                >
                  {legalStructures.map((structure) => (
                    <MenuItem key={structure} value={structure}>
                      {structure}
                    </MenuItem>
                  ))}
                </Select>
                {methods.formState.errors.legalStructure && (
                  <FormHelperText>
                    {methods.formState.errors.legalStructure.message}
                  </FormHelperText>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              {renderTextField('dateFounded', 'Date Founded', {
                type: 'date',
                InputLabelProps: { shrink: true }
              })}
            </Grid>
            <Grid item xs={12} md={6}>
              {renderTextField('firstName', 'First Name')}
            </Grid>
            <Grid item xs={12} md={6}>
              {renderTextField('lastName', 'Last Name')}
            </Grid>
          </Grid>
          <StepNavigation
              onNext={methods.handleSubmit(handleFormSubmit)} // Keep this
              loading={isLoading}
              disableNext={!methods.formState.isValid || isLoading}
              currentStep={CURRENT_STEP}
              nextStep="subscription"
              session={session}
            />
        </form>
      </FormContainer>
      </ErrorBoundary>

    </Container>
  );
};

BusinessInfo.propTypes = {
  metadata: PropTypes.shape({
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    nextStep: PropTypes.string,
    prevStep: PropTypes.string
  })
};

export default memo(BusinessInfo);