'use client';

import React, { createContext, useContext, useCallback, useMemo, useRef, useReducer, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/Toast/ToastProvider';
import { logger } from '@/utils/logger';
import { useOnboardingQueries } from '@/hooks/useOnboardingQueries';
import { APP_CONFIG } from '@/config';
import PropTypes from 'prop-types';
import { OnboardingErrorBoundary } from '@/components/ErrorBoundary/OnboardingErrorBoundary';
import { onboardingApi, makeRequest } from '@/services/api/onboarding';
import { useStepTransition } from '@/app/onboarding/hooks/useStepTransition';
import { validateAndRouteUser, generateRequestId } from '@/lib/authUtils';
import { OnboardingStateManager } from '@/app/onboarding/state/OnboardingStateManager';

const OnboardingContext = createContext(null);

// Validation rules for each step
const STEP_VALIDATION = {
  'business-info': (data) => (
    !!data?.business_name && 
    !!data?.business_type && 
    !!data?.country && 
    !!data?.legal_structure && 
    !!data?.date_founded &&
    !!data?.first_name &&
    !!data?.last_name
  ),
  'subscription': (data) => {
    const plan = data.selected_plan || data.selected_plan;
    return (
      !!plan &&
      ['free', 'professional'].includes(plan) &&
      (plan === 'free' || !!data.billing_cycle)
    );
  },
  'setup': (data) => {
    const plan = data.selected_plan || data.selected_plan;
    return (
      !!plan && (
        plan === 'free' ||
        (plan === 'professional' && data.payment_completed)
      )
    );
  }
 };
// Initial state
const initialState = {
  current_step: 'business-info',
  formData: {
    business_name: '',
    business_type: '',
    country: '',
    legal_structure: '',
    date_founded: new Date().toISOString().split('T')[0],
    first_name: '',
    last_name: ''
  },
  isLoading: false,
  error: null
};

// Reducer
function onboardingReducer(state, action) {
  switch (action.type) {
    case 'SET_FORM_DATA':
      return {
        ...state,
        formData: {
          ...state.formData,
          ...action.payload
        }
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_STEP':
      return { ...state, current_step: action.payload };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

export function OnboardingProvider({ children }) {
  const mountedRef = useRef(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, status: authStatus } = useSession();
  const toast = useToast();
  const [state, dispatch] = useReducer(onboardingReducer, initialState);
  const { transition, isTransitioning } = useStepTransition();
  const onboardingManager = useMemo(() => new OnboardingStateManager('onboarding'), []);

  const {
    status: onboarding_status,
    mutations,
    isLoading: queriesLoading,
    error: queriesError,
  } = useOnboardingQueries();

  // Status query
  const { data: onboardingData, isLoading: statusLoading } = useQuery({
    queryKey: [APP_CONFIG.onboarding.queryKeys.status, session?.user?.id],
    queryFn: async () => {
      if (!mutations?.getStatus) return null;
      return await mutations.getStatus();
    },
    enabled: Boolean(
      authStatus === 'authenticated' &&
      session?.user?.accessToken &&
      mutations?.getStatus
    ),
    staleTime: 30000,
    cacheTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        return false;
      }
      return failureCount < 2;
    }
  });

// Simplified validateStep
const validateStep = useCallback((current_step, targetStep, formData) => {
  if (targetStep === 'business-info') return { isValid: true };
  
  const validator = STEP_VALIDATION[targetStep];
  if (!validator?.(formData)) {
    return { 
      isValid: false, 
      reason: `Missing required data for ${targetStep}` 
    };
  }
  return { isValid: true };
}, []);


  // Handle navigation
const handleOnboardingRedirect = useCallback(async (targetStep) => {
  if (state.isLoading) return;

  try {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    const validation = validateStep(state.current_step, targetStep, state.formData);
    if (!validation.isValid) {
      toast.error(validation.reason);
      return;
    }

    // Special handling for free plan to setup transition
    if (state.current_step === 'subscription' && 
        targetStep === 'setup' && 
        state.formData.selected_plan === 'free') {
      
      // Initialize setup for free plan
      const setupResponse = await makeRequest(
        onboardingApi.startSetup(
          session?.user?.accessToken,
          {
            tier: 'free',
            requestId: generateRequestId()
          }
        )
      );

      if (!setupResponse?.success) {
        throw new Error('Failed to initialize setup');
      }
    }

    const success = await transition(state.current_step, targetStep, state.formData);
    if (success) {
      dispatch({ type: 'SET_STEP', payload: targetStep });
      
      // Update status after successful transition
      await makeRequest(
        onboardingApi.updateStatus(
          session?.user?.accessToken,
          {
            current_step: targetStep,
            form_data: state.formData,
            requestId: generateRequestId()
          }
        )
      );
    }

  } catch (error) {
    logger.error('Navigation failed:', {
      error: error.message,
      current_step: state.current_step,
      targetStep,
      formData: state.formData
    });
    toast.error('Failed to navigate. Please try again.');
  } finally {
    dispatch({ type: 'SET_LOADING', payload: false });
  }
}, [state, validateStep, transition, toast, session]);

  // Update form data
// Update form data handling
const updateFormData = useCallback((newData) => {
  const normalizedData = {
    ...newData,
    selected_plan: newData.selected_plan || newData.selected_plan,
    selected_plan: newData.selected_plan || newData.selected_plan
  };
  dispatch({ type: 'SET_FORM_DATA', payload: normalizedData });
}, []);

  // Session validation
  useEffect(() => {
    const validateSession = async () => {
      if (authStatus !== 'authenticated' || !session?.user?.accessToken) return;

      try {
        const validationResult = await validateAndRouteUser(
          {
            user: session.user,
            headers: {},
            method: 'GET'
          },
          {
            pathname: window.location.pathname,
            requestId: generateRequestId(),
            environment: process.env.NODE_ENV,
            onboarding_status: onboarding_status?.data?.status,
            subscriptionTier: state.formData?.selected_plan,
            formState: state.formData
          }
        );

        if (!validationResult.isValid && validationResult.redirectTo) {
          await router.replace(validationResult.redirectTo);
        }

      } catch (error) {
        logger.error('Session validation failed:', error);
        toast.error('Session validation failed');
      }
    };

    validateSession();
  }, [authStatus, session, router, onboarding_status, state.formData, toast]);

  // Cleanup effect
  useEffect(() => {
    mountedRef.current = true;
    
    // Watch for setup completion
    const cleanup = async () => {
      if (onboardingData?.status === 'complete') {
        // Reset onboarding state
        dispatch({ type: 'RESET' });
        
        // Clear any persisted state
        await onboardingManager.clearState();
        
        // Invalidate queries
        queryClient.invalidateQueries([APP_CONFIG.onboarding.queryKeys.status]);
      }
    };
    
    cleanup();
    
    return () => {
      mountedRef.current = false;
      
      // Additional cleanup on unmount if setup was complete
      if (onboardingData?.status === 'complete') {
        onboardingManager.clearState();
      }
    };
  }, [onboardingData?.status, onboardingManager, queryClient]);

  // Context value
  const value = useMemo(() => ({
    current_step: state.current_step,
    // Simplify loading state to avoid race conditions
    isLoading: statusLoading || queriesLoading,
    error: state.error || queriesError,
    formData: state.formData,
    handleOnboardingRedirect,
    updateFormData,
    validateStep,
    mutations,
    onboardingData,
    // Add these to help coordinate initialization
    isInitialized: Boolean(onboardingData),
    status: authStatus,
    onboardingManager
  }), [
    state,
    statusLoading,
    queriesLoading,
    queriesError,
    handleOnboardingRedirect,
    updateFormData,
    validateStep,
    mutations,
    onboardingData,
    authStatus,
    onboardingManager
  ]);

  // Add validation for initial form data
useEffect(() => {
  if (onboardingData && !state.formData.business_name) {
    updateFormData({
      business_name: '',
      business_type: '',
      country: '',
      legal_structure: '',
      date_founded: new Date().toISOString().split('T')[0],
      first_name: session?.user?.first_name || '',
      last_name: session?.user?.last_name || ''
    });
  }
}, [onboardingData, session, updateFormData]);
  

  if (state.error) {
    return (
      <OnboardingErrorBoundary
        fallback={<div>Error: {state.error}</div>}
      >
        {children}
      </OnboardingErrorBoundary>
    );
  }

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

OnboardingProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
};

export default OnboardingProvider;
