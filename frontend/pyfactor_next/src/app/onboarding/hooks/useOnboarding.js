///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/hooks/useOnboarding.js
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { logger } from '@/utils/logger';
import { axiosInstance } from '@/lib/axiosConfig';
import { persistenceService } from '@/services/persistenceService';
import { APP_CONFIG } from '@/config';

// At the top, add this validation helper
const validateTransition = (fromStep, toStep, transitions) => {
  // Special case for completion
  if (toStep === 'complete') {
    return true;
  }

  const validTransitions = transitions[fromStep];
  if (!validTransitions?.includes(toStep)) {
    throw new Error(APP_CONFIG.errors.messages.transition_error);
  }
  return true;
};

export const useOnboarding = (formMethods) => {
  const { data: session, status } = useSession();
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [initialized, setInitialized] = useState(false);
  const [initAttempts, setInitAttempts] = useState(0);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [initializationState, setInitializationState] = useState({
    initialized: false,
    initializing: false,
  });

  const [progress, setProgress] = useState({
    currentStep: '',
    completedSteps: new Set(),
    lastActiveStep: '',
    stepValidation: {},
  });

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

  const validateStepData = useCallback(
    (step, data) => {
      logger.debug('Starting step data validation:', {
        step,
        dataType: typeof data,
        dataPresent: !!data,
        dataKeys: data ? Object.keys(data) : [],
        currentStep: progress.currentStep,
      });
      if (formMethods?.formState?.isValid === false) {
        throw new Error(APP_CONFIG.errors.messages.validation_error);
      }

      if (!Object.values(APP_CONFIG.onboarding.steps).includes(step)) {
        throw new Error(APP_CONFIG.errors.messages.validation_error);
      }
      // Validate transition
      const currentStep = progress.currentStep || APP_CONFIG.onboarding.steps.INITIAL;
      validateTransition(currentStep, step, APP_CONFIG.onboarding.transitions);

      let validatedData = data;

      if (step === APP_CONFIG.onboarding.steps.PLAN) {
        if (!validatedData?.selectedPlan || !validatedData?.billingCycle) {
          throw new Error(APP_CONFIG.errors.messages.validation_error);
        }

        const validPlans = APP_CONFIG.app?.plans?.validPlans || ['Basic', 'Professional'];
        const validBillingCycles = APP_CONFIG.app?.plans?.validBillingCycles || [
          'monthly',
          'annual',
        ];

        if (!validPlans.includes(validatedData.selectedPlan)) {
          throw new Error(APP_CONFIG.errors.messages.validation_error);
        }

        if (!validBillingCycles.includes(validatedData.billingCycle)) {
          throw new Error(APP_CONFIG.errors.messages.validation_error);
        }

        return {
          selectedPlan: validatedData.selectedPlan,
          billingCycle: validatedData.billingCycle,
        };
      }

      return validatedData;
    },
    [progress.currentStep, formMethods]
  );

  const saveStepMutation = useMutation({
    mutationFn: async ({ step, data }) => {
      if (formMethods) {
        await formMethods.trigger(); // Validate form before saving
      }
      const currentStep = progress.currentStep || APP_CONFIG.onboarding.steps.INITIAL;

      // Validate transition before making request
      validateTransition(currentStep, step, APP_CONFIG.onboarding.transitions);

      const validatedData = validateStepData(step, data);
      const endpoint = APP_CONFIG.api.endpoints.onboarding[step];

      const response = await axiosInstance.post(endpoint, validatedData);
      return response.data;
    },
    onSuccess: (data, { step }) => {
      setFormData((prev) => ({
        ...prev,
        [step]: data,
      }));

      setLastSavedAt(new Date().toISOString());

      // Update progress with new step
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
    },
    onError: (error, { step }) => {
      logger.error(`Failed to save step ${step}:`, {
        error: error.message,
        stack: error.stack,
      });

      setProgress((prev) => ({
        ...prev,
        stepValidation: {
          ...prev.stepValidation,
          [step]: false,
        },
      }));

      setError(error.message);
      setSaveStatus('error');
    },
  });

  const saveStepWithRetry = useCallback(
    async (step, data, retryCount = 0) => {
      logger.debug('Starting save operation:', {
        step,
        data,
        retryCount,
        maxRetries: APP_CONFIG.auth.maxRetries,
      });

      try {
        const validatedData = await validateStepData(step, data);
        const result = await saveStepMutation.mutateAsync({
          step,
          data: validatedData,
        });

        if (step === 'complete') {
          logger.debug('Onboarding completed successfully');
        }

        return result;
      } catch (error) {
        logger.error('Save attempt failed:', {
          error,
          retryCount,
          maxRetries: APP_CONFIG.auth.maxRetries,
          step,
          data,
        });

        if (retryCount < APP_CONFIG.auth.maxRetries) {
          const delay = APP_CONFIG.auth.retryDelay * Math.pow(2, retryCount);
          await new Promise((resolve) => setTimeout(resolve, delay));
          return saveStepWithRetry(step, data, retryCount + 1);
        }

        throw error;
      }
    },
    [saveStepMutation, validateStepData]
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

  // Initialize function with better state management
  const initialize = useCallback(async () => {
    if (initializationState.initializing) {
      logger.debug('Initialization already in progress', {
        status,
        initAttempts,
        sessionId: session?.user?.id,
      });
      return;
    }

    if (!session?.user?.id) {
      logger.warn('No user session for initialization', { status });
      return;
    }

    logger.debug('Starting initialization', {
      userId: session.user.id,
      attempt: initAttempts + 1,
      status,
    });

    try {
      setInitializationState((prev) => ({ ...prev, initializing: true }));
      setLoading(true);
      setError(null);

      // Clean up any stale data first
      await cleanupStaleData();

      // Get saved data from storage
      const savedData = await persistenceService.loadData(APP_CONFIG.storage.keys.onboarding);
      logger.debug('Retrieved storage data', { savedData });

      // Get current status from API
      const response = await axiosInstance.get(APP_CONFIG.api.endpoints.onboarding.status);
      logger.debug('Retrieved API status', {
        statusCode: response.status,
        data: response.data,
      });

      // Update step progress
      const currentStep = response.data.status || APP_CONFIG.onboarding.steps.INITIAL;
      const steps = Object.values(APP_CONFIG.onboarding.steps);
      const currentIndex = steps.indexOf(currentStep);

      // Build step validation state
      const stepValidation = steps.reduce(
        (acc, step, index) => ({
          ...acc,
          [step]: index <= currentIndex,
        }),
        {}
      );

      // Set progress state
      setProgress({
        currentStep,
        completedSteps: new Set(steps.slice(0, currentIndex + 1)),
        lastActiveStep: currentStep,
        stepValidation,
      });

      // Merge and validate data
      const mergedData = {
        ...(savedData?.data || {}),
        ...response.data,
      };

      // Filter out invalid data
      const validatedData = Object.entries(mergedData).reduce((acc, [step, data]) => {
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          acc[step] = data;
        }
        return acc;
      }, {});

      // Update state
      setFormData(validatedData);
      setInitializationState({ initialized: true, initializing: false });
      setInitialized(true);
      setInitAttempts(0);

      logger.info('Initialization completed successfully', {
        userId: session.user.id,
        currentStep,
        dataSize: Object.keys(validatedData).length,
      });

      return validatedData;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      logger.error('Initialization failed', {
        error: errorMessage,
        userId: session?.user?.id,
        attempt: initAttempts + 1,
        status: error.response?.status,
      });

      setError(errorMessage);
      setInitializationState({ initialized: false, initializing: false });
      setInitialized(false);
      setInitAttempts((prev) => prev + 1);

      throw error;
    } finally {
      setLoading(false);
    }
  }, [session, status, initAttempts, cleanupStaleData, initializationState.initializing]);

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
    loading: loading || saveStepMutation.isLoading || initializationState.initializing,
    error,
    initialized: initializationState.initialized,
    initializing: initializationState.initializing,
    initialize,
    initAttempts,
    saveStep: saveStepWithRetry,
    resetOnboarding,
    progress,
    saveStatus,
    lastSavedAt,
    status: queryResult.data?.status,
    currentStep: queryResult.data?.currentStep,
    loading: queryResult.isLoading,
    error: queryResult.error,
  };
};
