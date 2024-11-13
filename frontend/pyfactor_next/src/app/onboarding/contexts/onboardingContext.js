'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession, signOut } from 'next-auth/react';
import { toast } from 'react-toastify';
import { logger } from '@/utils/logger';
import { useOnboardingQueries } from '@/hooks/useOnboardingQueries';
import { APP_CONFIG } from '@/config';
import PropTypes from 'prop-types';


const OnboardingContext = createContext(null);

const STEP_VALIDATION = {
  step1: (data) => !!data?.businessName && !!data?.industry,
  step2: (data) => !!data?.selectedPlan,
  step3: (data) => data?.selectedPlan !== 'Professional' || !!data?.paymentMethod,
  step4: (data) => true
};

// Add step mapping for better navigation
const STEP_ROUTES = {
  step1: '/onboarding/step1',
  step2: '/onboarding/step2',
  step3: '/onboarding/step3',
  step4: '/onboarding/step4',
  complete: '/dashboard'
};

export function OnboardingProvider({ children }) {
  // Hooks
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, status } = useSession();
  
  // State
  const [formData, setFormData] = useState({});
  const [isInitialized, setIsInitialized] = useState(false);
  const [localError, setLocalError] = useState(null);

  // Get onboarding queries and mutations
  const {
    status: onboardingStatus,
    mutations,
    isLoading: queriesLoading,
    error: queriesError
  } = useOnboardingQueries();

   // Status query
   const { 
    data: onboardingData, 
    isLoading: statusLoading,
    error: statusError,
    refetch: refetchStatus
  } = useQuery({
    queryKey: [APP_CONFIG.onboarding.queryKeys.status],
    queryFn: mutations.getStatus, // Use the function from mutations
    enabled: status === 'authenticated' && !!session?.user?.accessToken && isInitialized,
    staleTime: 30000,
    cacheTime: 1000 * 60 * 5,
    retry: 2,
    onSuccess: (data) => {
      logger.info('Onboarding status updated:', data);
      setLocalError(null);
    },
    onError: (error) => {
      handleApiError(error, 'status');
    }
  });

  // Validation
  const validateStep = useCallback((step, data = formData) => {
    try {
      const validationFn = STEP_VALIDATION[step];
      if (!validationFn) return true;
      return validationFn(data);
    } catch (error) {
      logger.error(`Step validation error for ${step}:`, error);
      return false;
    }
  }, [formData]);

  // Navigation
  const handleOnboardingRedirect = useCallback(async (status) => {
    try {
      if (!status) {
        status = APP_CONFIG.onboarding.steps.INITIAL;
      }

      if (!validateStep(status)) {
        logger.warn(`Invalid step access: ${status}, redirecting to initial step`);
        status = APP_CONFIG.onboarding.steps.INITIAL;
      }

      const route = STEP_ROUTES[status] || STEP_ROUTES.step1;
      
      logger.info(`Redirecting to: ${route}`);
      await router.replace(route);
    } catch (error) {
      logger.error('Navigation error:', error);
      toast.error('Failed to navigate to next step');
    }
  }, [router, validateStep]);

  // Data persistence
  const persistProgress = useCallback((data) => {
    try {
      localStorage.setItem(APP_CONFIG.onboarding.storage.key, JSON.stringify(data));
    } catch (error) {
      logger.error('Failed to persist progress:', error);
    }
  }, []);

 // Improved form data update with validation
 const updateFormData = useCallback((data) => {
  if (!data || typeof data !== 'object') {
    logger.error('Invalid form data update:', data);
    return;
  }

  setFormData(prevData => {
    const updatedData = { ...prevData, ...data };
    try {
      persistProgress(updatedData);
    } catch (error) {
      logger.error('Failed to persist form data:', error);
    }
    return updatedData;
  });
}, [persistProgress]);

  // Session management
  const handleSessionExpired = useCallback(async () => {
    toast.error('Session expired. Please sign in again.');
    await signOut({ redirect: true, callbackUrl: '/auth/signin' });
  }, []);

  const resetOnboardingData = useCallback(() => {
    try {
      localStorage.removeItem(APP_CONFIG.onboarding.storage.key);
      setFormData({});
      setLocalError(null);
      queryClient.invalidateQueries([APP_CONFIG.onboarding.queryKeys.status]);
    } catch (error) {
      logger.error('Error resetting data:', error);
    }
  }, [queryClient]);

  // Error handling
// Improved error handling
  const handleApiError = useCallback(async (error, endpoint) => {
    logger.error(`API Error in ${endpoint}:`, error);
    
    const errorMessage = error?.response?.data?.message 
      || error?.message 
      || 'An unexpected error occurred';
    
    setLocalError(errorMessage);
    toast.error(errorMessage);

    if (error?.response?.status === 401) {
      await handleSessionExpired();
    }
    
    throw error;
  }, [handleSessionExpired]);

  // Effects
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
        logger.error('Error loading persisted data:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    loadPersistedData();

    return () => setIsInitialized(false);
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      resetOnboardingData();
    }
  }, [status, resetOnboardingData]);

  // Prevent accidental navigation
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

 // Context value - keep this name consistent
 const contextValue = useMemo(() => ({
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
  session: session || null
}), [
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
  session
]);

// Use contextValue here, not value
return (
  <OnboardingContext.Provider value={contextValue}>
    {children}
  </OnboardingContext.Provider>
);
}

// Add better PropTypes
if (process.env.NODE_ENV !== 'production') {
  OnboardingProvider.propTypes = {
    children: PropTypes.oneOfType([
      PropTypes.arrayOf(PropTypes.node),
      PropTypes.node
    ]).isRequired,
  };
}

// Add better error context check
export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === null || context === undefined) {
    throw new Error(
      'useOnboarding must be used within an OnboardingProvider. ' +
      'Make sure you have wrapped your component tree with OnboardingProvider ' +
      'and that you are calling useOnboarding within a child component.'
    );
  }
  return context;
}

export { OnboardingContext };
