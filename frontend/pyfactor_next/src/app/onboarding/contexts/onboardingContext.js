///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/contexts/onboardingContext.js
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession, signOut } from 'next-auth/react';
import { useToast } from '@/components/Toast/ToastProvider';
import { logger } from '@/utils/logger';
import { useOnboardingQueries } from '@/hooks/useOnboardingQueries';
import { APP_CONFIG } from '@/config';
import PropTypes from 'prop-types';
import { OnboardingErrorBoundary } from '@/components/ErrorBoundary/OnboardingErrorBoundary';

const OnboardingContext = createContext(null);

const STEP_VALIDATION = {
  [APP_CONFIG.onboarding.steps.INITIAL]: (data) => !!data?.businessName && !!data?.industry,
  [APP_CONFIG.onboarding.steps.PLAN]: (data) => !!data?.selectedPlan,
  [APP_CONFIG.onboarding.steps.PAYMENT]: (data) => {
    if (data?.selectedPlan === 'Basic') return false;
    return data?.selectedPlan === 'Professional' && !data?.paymentMethod;
  },
  [APP_CONFIG.onboarding.steps.SETUP]: (data) => {
    return (
      data?.selectedPlan === 'Basic' ||
      (data?.selectedPlan === 'Professional' && !!data?.paymentMethod)
    );
  },
};

const STEP_ROUTES = {
  [APP_CONFIG.onboarding.steps.INITIAL]: APP_CONFIG.routes.onboarding.steps.step1,
  [APP_CONFIG.onboarding.steps.PLAN]: APP_CONFIG.routes.onboarding.steps.step2,
  [APP_CONFIG.onboarding.steps.PAYMENT]: APP_CONFIG.routes.onboarding.steps.step3,
  [APP_CONFIG.onboarding.steps.SETUP]: APP_CONFIG.routes.onboarding.steps.step4,
  [APP_CONFIG.onboarding.steps.COMPLETE]: '/dashboard',
};

const TOAST_MESSAGES = {
  SESSION_EXPIRED: APP_CONFIG.errors.messages.session,
  NAVIGATION_ERROR: APP_CONFIG.errors.messages.network,
  PERSIST_ERROR: APP_CONFIG.errors.messages.default,
  VALIDATION_ERROR: APP_CONFIG.errors.messages.validation_error,
  RESET_SUCCESS: 'Progress reset successfully',
  RESET_ERROR: APP_CONFIG.errors.messages.default,
  API_ERROR: APP_CONFIG.errors.messages.default,
  LOADING: 'Loading your information...',
  SUCCESS: 'Changes saved successfully',
};

const createQueryConfig = (handleApiError) => ({
  defaultOptions: {
    queries: {
      retry: APP_CONFIG.auth.maxRetries,
      staleTime: APP_CONFIG.auth.refreshInterval * 1000,
      cacheTime: APP_CONFIG.auth.sessionMaxAge * 1000,
      refetchOnWindowFocus: false,
      onError: (error) => handleApiError(error, 'query'),
    },
  },
});

export function OnboardingProvider({ children }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, status } = useSession();
  const toast = useToast();

  const [formData, setFormData] = useState({});
  const [isInitialized, setIsInitialized] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleError = useCallback(
    (error, context = '') => {
      logger.error(`Onboarding error [${context}]:`, error);

      if (typeof window !== 'undefined' && toast) {
        toast.error(error.message || TOAST_MESSAGES.API_ERROR, {
          duration: APP_CONFIG.ui.toast.duration,
        });
      }

      return error;
    },
    [toast]
  );

  const handleSessionExpired = useCallback(async () => {
    if (toast) {
      toast.error(TOAST_MESSAGES.SESSION_EXPIRED);
    }
    await signOut({ redirect: true, callbackUrl: '/auth/signin' });
  }, [toast]);

  // Then create handleApiError after handleSessionExpired
  const handleApiError = useCallback(
    async (error, endpoint) => {
      const baseError = handleError(error, `API-${endpoint}`);

      if (error?.response?.status === 401) {
        await handleSessionExpired();
      }

      throw baseError;
    },
    [handleError, handleSessionExpired]
  );

  const queryConfig = useMemo(() => createQueryConfig(handleApiError), [handleApiError]);

  const {
    status: onboardingStatus,
    mutations,
    isLoading: queriesLoading,
    error: queriesError,
  } = useOnboardingQueries();

  const {
    data: onboardingData,
    isLoading: statusLoading,
    error: statusError,
    refetch: refetchStatus,
  } = useQuery({
    ...queryConfig.defaultOptions.queries,
    queryKey: [APP_CONFIG.onboarding.queryKeys.status],
    queryFn: mutations.getStatus,
    enabled: status === 'authenticated' && !!session?.user?.accessToken && isInitialized,
    staleTime: APP_CONFIG.auth.refreshInterval * 1000,
    cacheTime: APP_CONFIG.auth.sessionMaxAge * 1000,
    retry: APP_CONFIG.auth.maxRetries,
    onSuccess: (data) => {
      logger.info('Onboarding status updated:', data);
      setLocalError(null);
    },
    onError: (error) => handleApiError(error, 'status'),
  });

  const validateStep = useCallback(
    (step, data = formData) => {
      try {
        const validationFn = STEP_VALIDATION[step];
        if (!validationFn) return true;
        const isValid = validationFn(data);
        if (!isValid && toast) {
          toast.error(TOAST_MESSAGES.VALIDATION_ERROR);
        }
        return isValid;
      } catch (error) {
        handleError(error, 'validation');
        return false;
      }
    },
    [formData, toast, handleError]
  );

  const validateFormData = useCallback(
    (data) => {
      try {
        if (!data || typeof data !== 'object') {
          logger.warn('Invalid form data structure', {
            receivedType: typeof data,
            validationContext: 'structure-check',
          });
          return false;
        }

        // Map step numbers to step keys
        const stepMap = {
          1: APP_CONFIG.onboarding.steps.INITIAL,
          2: APP_CONFIG.onboarding.steps.PLAN,
          3: APP_CONFIG.onboarding.steps.PAYMENT,
          4: APP_CONFIG.onboarding.steps.SETUP,
        };

        const currentStep = onboardingData?.step || 1;
        const stepKey = stepMap[currentStep] || APP_CONFIG.onboarding.steps.INITIAL;

        const validationContext = {
          step: stepKey,
          currentData: data,
          existingData: formData,
          isInitialized,
          sessionStatus: status,
        };

        const validationFn = STEP_VALIDATION[stepKey];
        if (!validationFn) {
          logger.warn('No validation function found', validationContext);
          return true;
        }

        const isValid = validationFn(data);
        if (!isValid) {
          logger.warn('Validation failed', {
            ...validationContext,
            validationFunction: validationFn.toString(),
          });
        }

        return isValid;
      } catch (error) {
        handleError(error, 'form-validation');
        return false;
      }
    },
    [onboardingData?.step, handleError, formData, isInitialized, status]
  );

  const handleOnboardingRedirect = useCallback(
    async (status) => {
      if (isSaving) {
        toast?.warning('Please wait while your changes are being saved...');
        return;
      }

      try {
        if (!status) {
          status = APP_CONFIG.onboarding.steps.INITIAL;
        }

        // Validate current step before allowing navigation
        if (!validateStep(status)) {
          status = APP_CONFIG.onboarding.steps.INITIAL;
        }
        // To this
        if (status === APP_CONFIG.onboarding.steps.PAYMENT && formData?.selectedPlan === 'Basic') {
          status = APP_CONFIG.onboarding.steps.SETUP;
        }

        const route = STEP_ROUTES[status] || STEP_ROUTES[APP_CONFIG.onboarding.steps.INITIAL];

        await router.replace(route);
      } catch (error) {
        handleError(error, 'navigation');
        toast?.error(TOAST_MESSAGES.NAVIGATION_ERROR);
      }
    },
    [router, validateStep, formData, toast, handleError, isSaving]
  );

  const persistProgress = useCallback(
    async (data) => {
      if (isSaving) return;

      try {
        setIsSaving(true);
        localStorage.setItem(APP_CONFIG.storage.keys.onboarding, JSON.stringify(data));
        toast?.success(TOAST_MESSAGES.SUCCESS, {
          duration: APP_CONFIG.ui.toast.duration,
        });
      } catch (error) {
        handleError(error, 'persistence');
        toast?.error(TOAST_MESSAGES.PERSIST_ERROR, {
          duration: APP_CONFIG.ui.toast.duration,
        });
      } finally {
        setIsSaving(false);
      }
    },
    [isSaving, toast, handleError]
  );

  const updateFormData = useCallback(
    (data) => {
      if (!data || typeof data !== 'object') {
        handleError(new Error('Invalid form data'), 'update');
        return;
      }

      // Store previous state for rollback
      const previousData = { ...formData };

      setFormData((prevData) => {
        const updatedData = { ...prevData, ...data };

        // Attempt to persist with rollback on failure
        persistProgress(updatedData).catch((error) => {
          handleError(error, 'update-persistence');
          // Rollback to previous state
          setFormData(previousData);
        });

        return updatedData;
      });
    },
    [formData, persistProgress, handleError]
  );

  const resetOnboardingData = useCallback(async () => {
    try {
      localStorage.removeItem(APP_CONFIG.onboarding.storage.key);
      setFormData({});
      setLocalError(null);
      await queryClient.invalidateQueries([APP_CONFIG.onboarding.queryKeys.status]);
      toast?.success(TOAST_MESSAGES.RESET_SUCCESS);
    } catch (error) {
      handleError(error, 'reset');
      toast?.error(TOAST_MESSAGES.RESET_ERROR);
    }
  }, [queryClient, toast, handleError]);

  useEffect(() => {
    const loadPersistedData = async () => {
      try {
        const persistedData = localStorage.getItem(APP_CONFIG.onboarding.storage.key);
        if (persistedData) {
          const parsedData = JSON.parse(persistedData);
          if (parsedData && typeof parsedData === 'object') {
            setFormData(parsedData);
          }
        }
      } catch (error) {
        handleError(error, 'load-persisted');
      } finally {
        setIsInitialized(true);
      }
    };

    loadPersistedData();
    return () => setIsInitialized(false);
  }, [handleError]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      resetOnboardingData();
    }
  }, [status, resetOnboardingData]);

  useEffect(() => {
    return () => {
      // Clear queries
      queryClient.removeQueries([APP_CONFIG.onboarding.queryKeys.status]);

      // Clear state
      setLocalError(null);
      setFormData({});
      setIsInitialized(false);
      setIsSaving(false);

      // Clear local storage if needed
      if (status === 'unauthenticated') {
        localStorage.removeItem(APP_CONFIG.onboarding.storage.key);
      }

      // Log cleanup
      logger.info('OnboardingProvider cleanup completed');
    };
  }, [queryClient, status]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (onboardingStatus?.data?.status !== APP_CONFIG.onboarding.steps.COMPLETE) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [onboardingStatus?.data?.status]);

  useEffect(() => {
    const navigationState = {
      isSaving,
      hasUnsavedChanges: Object.keys(formData).length > 0,
      isComplete: onboardingStatus?.data?.status === APP_CONFIG.onboarding.steps.COMPLETE,
      currentPath: window.location.pathname,
    };

    const handlePopState = (event) => {
      if (
        navigationState.isSaving ||
        (navigationState.hasUnsavedChanges && !navigationState.isComplete)
      ) {
        event.preventDefault();
        window.history.pushState({ ...navigationState }, '', navigationState.currentPath);
        toast?.warning('Please save or discard your changes before navigating away');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isSaving, formData, onboardingStatus?.data?.status, toast]);

  const contextValue = useMemo(
    () => ({
      onboardingStatus: onboardingData?.status || APP_CONFIG.onboarding.steps.INITIAL,
      currentStep: onboardingData?.step || 1,
      formData: formData || {},
      loading: !isInitialized || statusLoading || queriesLoading,
      error: localError || statusError || queriesError,
      saveStep1Data: mutations?.step1?.mutate,
      saveStep2Data: mutations?.step2?.mutate,
      saveStep3Data: mutations?.step3?.mutate,
      saveStep4Data: mutations?.step4?.mutate,
      completeOnboarding: mutations?.complete?.mutate,
      getStatus: mutations?.getStatus,
      updateFormData,
      resetOnboardingData,
      handleOnboardingRedirect,
      refetchStatus,
      validateStep,
      isAuthenticated: status === 'authenticated' && !!session?.user?.accessToken,
      session: session || null,
      isSaving,
    }),
    [
      onboardingData,
      formData,
      isInitialized,
      statusLoading,
      queriesLoading,
      localError,
      statusError,
      queriesError,
      mutations,
      updateFormData,
      resetOnboardingData,
      handleOnboardingRedirect,
      refetchStatus,
      validateStep,
      status,
      session,
      isSaving,
    ]
  );

  // Usage in provider
  return (
    <OnboardingErrorBoundary
      fallbackComponent={({ error }) => (
        <div className="error-container">
          <h2>{APP_CONFIG.errors.messages.default}</h2>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            Reload Page
          </button>
        </div>
      )}
    >
      <OnboardingContext.Provider value={contextValue}>{children}</OnboardingContext.Provider>
    </OnboardingErrorBoundary>
  );
}

OnboardingProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}

export { OnboardingContext };
