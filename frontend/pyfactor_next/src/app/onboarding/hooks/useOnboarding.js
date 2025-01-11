///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/hooks/useOnboarding.js
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';  // Not 'next/router'
import { useMutation, useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { logger } from '@/utils/logger';
import { axiosInstance } from '@/lib/axiosConfig';
import { persistenceService } from '@/services/persistenceService';
import { APP_CONFIG } from '@/config';
import { 
  validateUserState, 
  validateOnboardingTransition,
  validateOnboardingStep,
  saveOnboardingStep,
  handleAuthError,
  isTokenExpired,
  AUTH_ERRORS,
  makeRequest,
  generateRequestId,  // Add this
  TIMEOUT            // Add this
} from '@/lib/authUtils';


import { 
  validateStep,
  canTransitionToStep, 
  validateTierAccess,
  STEP_VALIDATION,
  STEP_PROGRESSION,
  VALIDATION_DIRECTION 
} from '@/app/onboarding/components/registry';


export const useOnboarding = (formMethods) => {
  const { data: session, status } = useSession();
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [initialized, setInitialized] = useState(false);
  const [initAttempts, setInitAttempts] = useState(0);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [requestId] = useState(() => generateRequestId());
  const steps = Object.values(APP_CONFIG.onboarding.steps);
  const currentIndex = steps.indexOf(currentStep);

  const [initializationState, setInitializationState] = useState({
    initialized: false,
    initializing: false,
    requestId: generateRequestId()
  });

  const [progress, setProgress] = useState({
    currentStep: '',
    completedSteps: new Set(),
    lastActiveStep: '',
    stepValidation: {},
    selectedTier: null  // Add this
  });

  const router = useRouter();

  if (!formMethods) {
    logger.warn('formMethods not provided to useOnboarding hook');
  }

  const queryResult = useQuery({
    queryKey: ['onboardingStatus'],
    queryFn: async () => {
      const response = await axiosInstance.get('/api/onboarding/status/');
      return response.data;
    },
    enabled: status === 'authenticated' && !!session?.user?.id,
    staleTime: 30000,
    retry: (failureCount, error) => {
      if (error?.response?.status === 401) return false;
      return failureCount < 3;
    },
    onError: (error) => {
      logger.error('Failed to fetch onboarding status:', error);
    },
  });

  const updateProgress = useCallback((step, isComplete, isValid = true) => {
    setProgress((prev) => {
      const completedSteps = new Set(prev.completedSteps);
      if (isComplete) {
        completedSteps.add(step);
      } else {
        completedSteps.delete(step);
      }

      return {
        ...prev,
        currentStep: step,
        completedSteps,
        lastActiveStep: step,
        stepValidation: {
          ...prev.stepValidation,
          [step]: isValid,
        },
      };
    });
  }, []);

  const validateStepData = useCallback(async (step, data) => {
    logger.debug('Starting step data validation:', {
      step,
      dataType: typeof data,
      dataPresent: !!data,
      dataKeys: data ? Object.keys(data) : [],
      currentStep: progress.currentStep,
      tier: data?.selectedPlan,
      requestId
    });
  
    try {
      // First check step transition
      const canTransition = canTransitionToStep(
        progress.currentStep, 
        step, 
        data?.selectedPlan
      );
  
      if (!canTransition) {
        throw new Error('Invalid step transition');
      }
  
      // Then validate tier access
      const tierValidation = validateTierAccess(step, data?.selectedPlan);
      if (!tierValidation.valid) {
        throw new Error(tierValidation.message);
      }
  
      // Finally validate step data
      const validationResult = await validateOnboardingStep(
        session,
        step,
        data,
        requestId
      );
  
      if (!validationResult.isValid) {
        throw new Error(validationResult.reason);
      }
  
      // Update progress with tier if it's subscription step
      if (step === 'subscription' && data?.selectedPlan) {
        setProgress(prev => ({
          ...prev,
          selectedTier: data.selectedPlan
        }));
      }
  
      return validationResult.data;
    } catch (error) {
      const errorResult = handleAuthError(error);
      logger.error('Step validation failed:', {
        error: errorResult,
        step,
        tier: data?.selectedPlan, 
        requestId
      });
      throw error;
    }
  }, [session, progress.currentStep, requestId]);


  const saveStepMutation = useMutation({
    mutationFn: async ({ step, data }) => {
      try {
        // Special handling for business-info step
        if (step === 'business-info') {
          logger.debug('Processing business-info submission', {
            requestId,
            hasData: !!data
          });
  
          // Skip token validation for business-info
          const response = await saveOnboardingStep(
            {
              user: {
                ...session?.user,
                onboardingStatus: 'business-info'
              }
            },
            step,
            data,
            requestId
          );
  
          logger.debug('Business info saved successfully', {
            requestId,
            hasResponse: !!response?.data
          });
  
          // Force immediate navigation to subscription
          router.push('/onboarding/subscription');
          return response.data;
        }
  
        // For other steps, perform full validation
        if (formMethods) {
          await formMethods.trigger();
        }
  
        // Check step transition
        if (!canTransitionToStep(progress.currentStep, step, data?.selectedPlan)) {
          throw new Error('Invalid step transition');
        }
  
        // Validate tier access
        const tierValidation = validateTierAccess(step, data?.selectedPlan);
        if (!tierValidation.valid) {
          throw new Error(tierValidation.message);
        }
      
        // Validate transition
        const transitionResult = await validateOnboardingTransition(
          progress.currentStep || APP_CONFIG.onboarding.steps.INITIAL,
          step,
          APP_CONFIG.onboarding.transitions,
          data?.selectedPlan
        );
  
        if (!transitionResult.isValid) {
          throw new Error(transitionResult.reason);
        }
  
        // Validate and save step
        const response = await saveOnboardingStep(
          session,
          step,
          data,
          requestId
        );
  
        logger.debug('Step saved successfully:', {
          step,
          requestId,
          hasResponse: !!response?.data
        });
  
        return response.data;
      } catch (error) {
        const errorResult = handleAuthError(error);
        logger.error('Step save failed:', {
          error: errorResult,
          step,
          requestId
        });
        throw errorResult;
      }
    },
  
    onSuccess: (data, { step }) => {
      logger.debug('Handling successful step save:', {
        step,
        requestId,
        hasData: !!data
      });
  
      // Update form data
      setFormData((prev) => ({
        ...prev,
        [step]: data,
      }));
  
      setLastSavedAt(new Date().toISOString());
  
      // Update progress state
      setProgress((prev) => {
        const completedSteps = new Set(prev.completedSteps);
        completedSteps.add(step);
  
        return {
          currentStep: step,
          completedSteps,
          lastActiveStep: step,
          stepValidation: {
            ...prev.stepValidation,
            [step]: true,
          },
        };
      });
  
      setSaveStatus('success');
  
      // Handle business-info success
      if (step === 'business-info') {
        router.push('/onboarding/subscription');
        return;
      }
  
      // Handle other step redirects
      if (data?.redirect_url) {
        router.push(data.redirect_url);
      }
    },
  
    onError: (error, { step }) => {
      const errorResult = handleAuthError(error);
      
      logger.error('Step save error:', {
        error: errorResult,
        step,
        requestId,
        stack: error.stack
      });
  
      // Only update progress for non-business-info steps
      if (step !== 'business-info') {
        setProgress((prev) => ({
          ...prev,
          stepValidation: {
            ...prev.stepValidation,
            [step]: false,
          },
        }));
  
        setError(errorResult.message);
        setSaveStatus('error');
  
        if (errorResult.redirectTo) {
          router.push(errorResult.redirectTo);
        }
      }
    },
  
    retry: (failureCount, error) => {
      // Don't retry for business-info
      if (error?.step === 'business-info') {
        return false;
      }
  
      // Don't retry for auth errors
      if (error?.type === AUTH_ERRORS.AUTH_ERROR || 
          error?.type === AUTH_ERRORS.TOKEN_EXPIRED) {
        return false;
      }
  
      return failureCount < APP_CONFIG.auth.maxRetries;
    },
  });

  const saveStepWithRetry = useCallback(
    async (step, data, retryCount = 0) => {
      logger.debug('Starting save operation:', {
        step,
        data,
        retryCount,
        requestId
      });
  
      try {
        // Special handling for business-info step
        if (step === 'business-info') {
          logger.debug('Processing business-info step', {
            requestId,
            hasSession: !!session?.user
          });
  
          const validationResult = await validateOnboardingStep(
            session,
            step,
            data,
            requestId
          );
  
          if (!validationResult.isValid) {
            throw new Error(validationResult.reason);
          }
  
          const response = await saveOnboardingStep(
            session, 
            step, 
            validationResult.data,
            requestId
          );
  
          logger.debug('Business info saved, redirecting to subscription', {
            requestId
          });
  
          router.push('/onboarding/subscription');
          return response.data;
        }
  
        // For other steps, perform full validation
        if (isTokenExpired(session?.user)) {
          router.push('/auth/signin');
          throw new Error(AUTH_ERRORS.TOKEN_EXPIRED);
        }
  
        // Validate step transition
        const transitionResult = validateOnboardingTransition(
          progress.currentStep || APP_CONFIG.onboarding.steps.INITIAL,
          step,
          APP_CONFIG.onboarding.transitions
        );
  
        if (!transitionResult.isValid) {
          router.push(transitionResult.redirectTo);
          throw new Error(transitionResult.reason);
        }
  
        // Validate step data
        const validationResult = await validateOnboardingStep(
          session,
          step,
          data,
          requestId
        );
  
        if (!validationResult.isValid) {
          router.push(validationResult.redirectTo);
          throw new Error(validationResult.reason);
        }
  
        // Save step
        const response = await saveOnboardingStep(
          session, 
          step, 
          validationResult.data,
          requestId
        );
  
        // Handle redirects
        if (response.data?.redirect_url) {
          router.push(response.data.redirect_url);
        } else if (step === 'complete') {
          router.push('/dashboard');
        }
  
        return response.data;
  
      } catch (error) {
        const errorResult = handleAuthError(error);
        logger.error('Save attempt failed:', {
          error: errorResult,
          step,
          retryCount,
          requestId
        });
  
        // Only handle redirects for non-business-info steps
        if (step !== 'business-info' && errorResult.redirectTo) {
          router.push(errorResult.redirectTo);
        }
  
        // Only retry for non-business-info steps
        if (step !== 'business-info' && retryCount < APP_CONFIG.auth.maxRetries) {
          const delay = APP_CONFIG.auth.retryDelay * Math.pow(2, retryCount);
          logger.debug('Retrying after delay:', {
            delay,
            retryCount,
            requestId
          });
          await new Promise(resolve => setTimeout(resolve, delay));
          return saveStepWithRetry(step, data, retryCount + 1);
        }
  
        throw error;
      }
    },
    [session, router, progress.currentStep, requestId]
  );

  const cleanupStaleData = useCallback(async () => {
    const now = Date.now();
    const keys = await persistenceService.getAllKeys();

    for (const key of keys) {
      if (key.includes(APP_CONFIG.storage.keys.onboarding)) {
        const data = await persistenceService.loadData(key);
        if (data && now - data.timestamp > APP_CONFIG.storage.draftExpiration) {
          await persistenceService.clearData(key);
          logger.debug('Cleaned up stale draft:', key);
        }
      }
    }
  }, []);

  const updateInitializationState = useCallback((initializing, error = null) => {
    setInitializationState(prev => ({ ...prev, initializing }));
    setLoading(initializing);
    setError(error);
  }, []);

  const handleNavigation = useCallback((url) => {
    if (!url) return;
    try {
      logger.debug('Navigating to:', url);
      router.push(url);
    } catch (error) {
      logger.error('Navigation failed:', error);
    }
  }, [router]);



  const initialize = useCallback(async () => {
    const requestId = generateRequestId();


    logger.debug('Starting initialization', {
      requestId,
      userId: session.user.id,
      attempt: initAttempts + 1,
      status,
    });
  
    // Special handling for business-info page
    if (window.location.pathname === '/onboarding/business-info') {
      logger.debug('Direct business-info access initialization', {
        requestId,
        pathname: window.location.pathname
      });
      
      return {
        status: 'business-info',
        data: {},
        progress: {
          currentStep: 'business-info',
          completedSteps: new Set(['business-info']),
          lastActiveStep: 'business-info',
          stepValidation: {
            'business-info': true
          },
          selectedTier: null
        }
      };
    }
  
    if (initializationState.initializing) {
      logger.debug('Initialization already in progress', {
        requestId,
        status,
        initAttempts,
        sessionId: session?.user?.id,
      });
      return;
    }
  
    if (!session?.user?.id) {
      logger.warn('No user session for initialization', { requestId, status });
      return;
    }
  
  
    updateInitializationState(true);
  
    try {
      // First validate user state using authUtils
      const userState = await validateUserState(session, requestId);
      if (!userState.isValid) {
        handleNavigation(userState.redirectTo);
        return;
      }
  
      // Clean up any stale data first
      await cleanupStaleData();
  
      // Get saved data from storage
      const savedData = await persistenceService.loadData(APP_CONFIG.storage.keys.onboarding);
      logger.debug('Retrieved storage data', { requestId, savedData });
  
      // Get current status using makeRequest from authUtils
      const response = await makeRequest(() => 
        axiosInstance.get(APP_CONFIG.api.endpoints.onboarding.status, {
          headers: { Authorization: `Bearer ${session.user.accessToken}` },
          timeout: TIMEOUT
        })
      );
  
      logger.debug('Retrieved API status', {
        requestId,
        statusCode: response.status,
        data: response.data,
      });
  
      if (!response.data?.status) {
        throw new Error(AUTH_ERRORS.VALIDATION_FAILED);
      }
  
      const currentStep = response.data.status;
  
      if (currentStep === 'complete') {
        logger.info('Onboarding is complete, redirecting to dashboard', { requestId });
        const redirectUrl = response.data?.redirect_url || '/dashboard';
        handleNavigation(redirectUrl);
        return;
      }
  
      // Process onboarding steps
      const steps = Object.values(APP_CONFIG.onboarding.steps);
      const currentIndex = steps.indexOf(currentStep);
      
      if (currentIndex === -1) {
        throw new Error(AUTH_ERRORS.INVALID_STEP);
      }

      // Build step validation state using new validation system
      const stepValidation = steps.reduce((acc, step) => {
        const canTransition = canTransitionToStep(currentStep, step, response.data?.selectedPlan);
        return {
          ...acc,
          [step]: canTransition
        };
      }, {});
  
      // Set progress state
      const newProgress = {
        currentStep,
        completedSteps: new Set(steps.slice(0, currentIndex + 1)),
        lastActiveStep: currentStep,
        stepValidation,
      };
  
      logger.debug('Setting new progress state:', { requestId, newProgress });
      setProgress(newProgress);
  
      // Merge and validate data
      const mergedData = {
        ...(savedData?.data || {}),
        ...response.data,
      };
  
      // Validate each step using validateOnboardingStep from authUtils
      const validatedData = await Object.entries(mergedData).reduce(async (promiseAcc, [step, data]) => {
        const acc = await promiseAcc;
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          try {
            const validationResult = await validateOnboardingStep(
              session, 
              step, 
              data,
              requestId
            );
            if (validationResult.isValid) {
              acc[step] = validationResult.data;
              // Update tier if subscription data is valid
              if (step === 'subscription' && data.selectedPlan) {
                setProgress(prev => ({
                  ...prev,
                  selectedTier: data.selectedPlan
                }));
              }
            }
          } catch (error) {
            const errorResult = handleAuthError(error);
            logger.warn(`Invalid data for step ${step}:`, {
              requestId,
              error: errorResult.message
            });
          }
        }
        return acc;
      }, Promise.resolve({}));
  
      // Update state
      setFormData(validatedData);
      setInitialized(true);
      setInitAttempts(0);
  
      logger.info('Initialization completed successfully', {
        requestId,
        userId: session.user.id,
        currentStep,
        dataSize: Object.keys(validatedData).length,
        completedSteps: Array.from(newProgress.completedSteps),
      });
  
      return {
        status: currentStep,
        data: validatedData,
        progress: newProgress,
      };
  
    } catch (error) {
      const errorResult = handleAuthError(error);
      logger.error('Initialization failed', {
        requestId,
        error: errorResult.message,
        userId: session?.user?.id,
        attempt: initAttempts + 1,
        status: error.response?.status,
      });
  
      setInitialized(false);
      setInitAttempts((prev) => prev + 1);
      updateInitializationState(false, errorResult.message);
  
      if (errorResult.redirectTo) {
        handleNavigation(errorResult.redirectTo);
      }
  
      throw error;
    } finally {
      updateInitializationState(false);
    }
  }, [
    session,
    status, 
    initAttempts,
    cleanupStaleData,
    initializationState.initializing,
    updateInitializationState,
    handleNavigation
  ]);

  const resetOnboarding = useCallback(async () => {
    logger.debug('Starting onboarding reset', {
      currentState: { initialized, loading, hasError: !!error },
    });
    try {
      logger.debug('Clearing persistence storage');
      await persistenceService.clearData(new RegExp(`^${APP_CONFIG.storage.prefix}onboarding_`));

      setFormData({});
      setLoading(false);
      setError(null);
      setInitialized(false);
      setProgress({
        currentStep: '',
        completedSteps: new Set(),
        lastActiveStep: '',
        stepValidation: {},
      });

      logger.info('Onboarding state reset', {
        userId: session?.user?.id,
      });
    } catch (error) {
      logger.error('Failed to reset onboarding:', error);
      throw error;
    }
  }, [session]);

  useEffect(() => {
    return () => {
      // Clean up any pending operations
      if (saveStepMutation.isLoading) {
        saveStepMutation.reset();
      }

      // Reset error state
      setError(null);

      // Clear initialization state
      setInitializationState({
        initialized: false,
        initializing: false,
      });
    };
  }, []);

  return {
    formData,
    isLoading: loading || saveStepMutation.isLoading || initializationState.initializing || queryResult.isLoading,
    error: error || queryResult.error,
    router,
    initialized: initializationState.initialized,
    initializing: initializationState.initializing,
    initialize,
    initAttempts,
    saveStep: saveStepWithRetry,
    resetOnboarding,
    progress,
    selectedTier: progress.selectedTier,
    saveStatus,
    lastSavedAt,
    onboardingStatus: queryResult.data?.status,
    currentStep: queryResult.data?.currentStep,
  };
};
