'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, useReducer } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession, signOut } from 'next-auth/react';
import { useToast } from '@/components/Toast/ToastProvider';
import { logger } from '@/utils/logger';
import { useOnboardingQueries } from '@/hooks/useOnboardingQueries';
import { APP_CONFIG } from '@/config';
import PropTypes from 'prop-types';
import { OnboardingErrorBoundary } from '@/components/ErrorBoundary/OnboardingErrorBoundary';

import { 
  validateAndRouteUser, 
  AUTH_ERRORS, 
  generateRequestId 
} from '@/lib/authUtils';

const OnboardingContext = createContext(null);

// Initial state for reducer
const initialState = {
  currentStep: 'business-info',
  isValidating: false,
  error: null,
  formData: {
    selectedPlan: null
  },
  isLoading: false
};


// Reducer for state management
function onboardingReducer(state, action) {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_FORM_DATA':
      return { ...state, formData: { ...state.formData, ...action.payload }};
    case 'SET_SELECTED_PLAN':
        return {
          ...state,
          formData: {
            ...state.formData,
            selectedPlan: action.payload
          }
        };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}


const STEP_VALIDATION = {
  'business-info': (data) => !!data?.businessName && !!data?.industry,
  'subscription': (data) => !!data?.selectedPlan,
  'payment': (data) => data?.selectedPlan === 'free' || !!data?.paymentMethod,
  'setup': () => true
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
  SESSION_VALIDATION: 'Validating your session...',
  INVALID_SESSION: 'Your session is no longer valid. Please sign in again.',
  VALIDATION_ERROR: 'Unable to validate your session. Please try again.',
};


export function OnboardingProvider({ children }) {
  const mountedRef = useRef(false);
  const validationTimeoutRef = useRef(null);
  const lastValidationTime = useRef(0);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, status: authStatus } = useSession();
  const toast = useToast();
  const [state, dispatch] = useReducer(onboardingReducer, initialState);



  const [authState, setAuthState] = useState({
    isInitialized: false,
    isValidating: false,
    error: null,
    validationType: null,
    isSaving: false,
    formData: {},
    lastValidated: null
  });

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
    refetch: refetchStatus
  } = useQuery({
    queryKey: [APP_CONFIG.onboarding.queryKeys.status, session?.user?.id],
    queryFn: async () => {
      if (!mutations?.getStatus) {
        logger.debug('Status query not available yet', {
          hasSession: !!session,
          authStatus,
          isInitialized: authState.isInitialized
        });
        return null;
      }
      try {
        const result = await mutations.getStatus();
        logger.debug('Status query successful', {
          hasData: !!result,
          status: result?.status
        });
        return result;
      } catch (error) {
        logger.error('Status query failed', {
          error: error.message,
          code: error.code
        });
        throw error;
      }
    },
    enabled: Boolean(
      authState.isInitialized &&
      authStatus === 'authenticated' &&
      session?.user?.accessToken &&
      mutations?.getStatus &&
      !authState.error
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

  // Move setSelectedPlan inside the component
  const setSelectedPlan = useCallback((plan) => {
    logger.debug('Attempting to set selected plan:', {
        newPlan: plan,
        currentPlan: state.formData?.selectedPlan,
        currentStep: state.currentStep
    });

    dispatch({ type: 'SET_SELECTED_PLAN', payload: plan });

    logger.debug('Selected plan updated:', {
        newState: state.formData?.selectedPlan,
        plan: plan
    });
}, [state]);

  // validateStep function
  const validateStep = useCallback((currentStep, requestedStep, formData) => {
    try {
      const selectedPlan = formData?.selectedPlan || state.formData?.selectedPlan;
      
      logger.debug('Validating step transition:', {
        from: currentStep,
        to: requestedStep,
        hasFormData: !!formData,
        selectedPlan,
        formData: {
          ...formData,
          selectedPlan 
        }
      });

      // Special case for free plan setup access
      if (requestedStep === 'setup' && currentStep === 'subscription' && selectedPlan === 'free') {
        logger.debug('Allowing free plan setup access');
        return true;
      }
  
      // Allow direct access to business-info
      if (requestedStep === 'business-info') return true;
  
      // Allow subscription access from business-info
      if (requestedStep === 'subscription' && currentStep === 'business-info') {
        return true;
      }
  
      // Allow setup access from subscription for free plan
      if (requestedStep === 'setup' && 
          currentStep === 'subscription' && 
          selectedPlan === 'free') {
        logger.debug('Allowing free plan setup access', {
          currentStep,
          requestedStep,
          selectedPlan
        });
        return true;
      }
  
      // Allow payment access from subscription for professional plan
      if (requestedStep === 'payment' && 
          currentStep === 'subscription' && 
          selectedPlan === 'professional') {
        return true;
      }
  
      // Allow setup access from payment for professional plan
      if (requestedStep === 'setup' && 
          currentStep === 'payment' && 
          selectedPlan === 'professional') {
        return true;
      }
  
      // Check step order for other cases
      const steps = ['business-info', 'subscription', 'payment', 'setup'];
      const currentIdx = steps.indexOf(currentStep);
      const requestedIdx = steps.indexOf(requestedStep);
  
      // Allow backward navigation to immediate previous step
      if (requestedIdx === currentIdx - 1) return true;
  
      // Prevent skipping steps
      if (requestedIdx > currentIdx + 1) return false;
  
      // Validate current step data if needed
      const validationFn = STEP_VALIDATION[currentStep];
      if (validationFn && !validationFn(formData)) {
        return false;
      }
  
      return requestedIdx === currentIdx + 1;
  
    } catch (error) {
      logger.error('Step validation failed:', {
        error: error.message,
        currentStep,
        requestedStep
      });
      return false;
    }
  }, [state.formData]);

  // Callback hooks
  const updateAuthState = useCallback((updates) => {
    if (!mountedRef.current) return;
    setAuthState(prev => ({
      ...prev,
      ...updates
    }));
  }, []);


  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, []);

// Session validation effect
useEffect(() => {
  if (!mountedRef.current || authStatus !== 'authenticated') {
    logger.debug('Skipping session validation:', {
      mounted: mountedRef.current,
      authStatus,
      pathname: window?.location?.pathname,
      hasSession: !!session,
      hasAccessToken: !!session?.user?.accessToken
    });
    return;
  }

  const validateSession = async () => {
    const pathname = window.location.pathname;
    
    logger.debug('Starting session validation:', {
      pathname,
      authStatus,
      hasAccessToken: !!session?.user?.accessToken,
      onboardingStatus: session?.user?.onboardingStatus,
      currentStep: state.currentStep
    });

    try {
      // Allow direct business-info access without token
      if (pathname === '/onboarding/business-info') {
        logger.debug('Direct access allowed:', { pathname });
        return;
      }

      // Special handling for subscription transition
      if (pathname === '/onboarding/subscription') {
        const status = session?.user?.onboardingStatus;
        
        if (status === 'subscription' || status === 'business-info') {
          logger.debug('Subscription transition allowed:', { status });
          return;
        }
      }

      // Validate current session state
      const result = await validateAndRouteUser(
        { user: session?.user },
        { 
          currentStep: state.currentStep,
          formData: state.formData,
          pathname,
          requestId: generateRequestId()
        }
      );

      if (!mountedRef.current) return;

      if (!result.isValid) {
        handleInvalidSession(result);
      }

    } catch (error) {
      handleValidationError(error, pathname);
    }
  };

  validateSession();
}, [authStatus, session, router, state.currentStep, state.formData]);

  const handleValidationError = useCallback(async (error, validationType) => {
    if (!mountedRef.current) return;
    
    logger.error(`Validation error [${validationType}]:`, {
      error,
      validationType,
      pathname: window.location.pathname
    });
    
    updateAuthState({
      error: error.message,
      validationType,
      isValidating: false
    });

    if (error.reason === AUTH_ERRORS.NO_SESSION || error.reason === AUTH_ERRORS.TOKEN_EXPIRED) {
      await signOut({ redirect: false });
      await router.replace('/auth/signin');
      return;
    }

    toast?.error(TOAST_MESSAGES[validationType] || TOAST_MESSAGES.API_ERROR);
  }, [updateAuthState, router, toast]);

  const resetOnboardingData = useCallback(async () => {
    if (!mountedRef.current) return;
    try {
      localStorage.removeItem(APP_CONFIG.onboarding.storage.key);
      updateAuthState({
        formData: {},
        error: null,
        lastValidated: null
      });
      await queryClient.invalidateQueries([APP_CONFIG.onboarding.queryKeys.status]);
      toast?.success(TOAST_MESSAGES.RESET_SUCCESS);
    } catch (error) {
      handleValidationError(error, 'reset');
    }
  }, [queryClient, toast, handleValidationError, updateAuthState]);

  const handleValidationFailure = useCallback(async (validationResult) => {
    if (!mountedRef.current) return;
    
    const { reason, redirectTo } = validationResult;
    
    if (window.location.pathname.includes('/onboarding/') && 
        reason === AUTH_ERRORS.INCOMPLETE_ONBOARDING) {
      updateAuthState({ 
        isValidating: false, 
        error: null,
        validationType: null 
      });
      return;
    }

    switch (reason) {
      case AUTH_ERRORS.NO_SESSION:
      case AUTH_ERRORS.TOKEN_EXPIRED:
        await signOut({ redirect: false });
        await router.replace('/auth/signin');
        break;
        
      default:
        if (redirectTo) {
          await router.replace(redirectTo);
        }
    }

    updateAuthState({
      error: reason,
      validationType: 'session',
      isValidating: false
    });
  }, [router, updateAuthState]);

// Inside OnboardingProvider
  // Navigation handler
  const handleOnboardingRedirect = useCallback(async (targetStep) => {
    if (!mountedRef.current || state.isLoading) return;
  
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Allow direct business-info access
      if (targetStep === 'business-info') {
        await router.replace('/onboarding/business-info');
        return;
      }
  
      const currentFormData = state.formData;
      const selectedPlan = currentFormData?.selectedPlan;
  
      logger.debug('Checking step transition:', {
        currentStep: state.currentStep,
        targetStep,
        selectedPlan,
        formData: currentFormData
      });
  
      // Special handling for subscription
      if (targetStep === 'subscription') {
        const status = session?.user?.onboardingStatus;
        if (status === 'subscription' || status === 'business-info') {
          await router.replace('/onboarding/subscription');
          return;
        }
      }
  
      // Special handling for setup transition
      if (targetStep === 'setup') {
        if (selectedPlan === 'free' && state.currentStep === 'subscription') {
          await router.replace('/onboarding/setup');
          return;
        }
      }
  
      // Validate transition
      const canNavigate = validateStep(state.currentStep, targetStep, currentFormData);
      if (!canNavigate) {
        toast.error('Please complete the current step first');
        return;
      }
  
      // Update step and navigate
      dispatch({ type: 'SET_STEP', payload: targetStep });
      await router.replace(`/onboarding/${targetStep}`);
  
    } catch (error) {
      logger.error('Navigation failed:', {
        from: state.currentStep,
        to: targetStep,
        error: error.message
      });
      toast.error('Navigation failed. Please try again.');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [router, state, session, toast, validateStep]);




  // Check if navigation to a step is allowed
  const canNavigateToStep = useCallback((targetStep) => {
    return validateStep(state.currentStep, targetStep, state.formData);
  }, [state.currentStep, state.formData, validateStep]);

  // Update form data
  const updateFormData = useCallback((newData) => {
    dispatch({ type: 'SET_FORM_DATA', payload: newData });
  }, []);



  const validateSession = useCallback(async () => {
    if (!mountedRef.current || !session?.user || authStatus !== 'authenticated' || authState.isValidating) {
      return;
    }

    const currentTime = Date.now();
    if (currentTime - lastValidationTime.current < APP_CONFIG.auth.validationInterval) {
      return;
    }

    try {
      updateAuthState({ isValidating: true });
      lastValidationTime.current = currentTime;

      const validationResult = await validateAndRouteUser(
        {
          user: session.user,
          headers: {},
          method: 'GET',
          lastValidated: authState.lastValidated
        },
        {
          pathname: window.location.pathname,
          requestId: generateRequestId(),
          environment: process.env.NODE_ENV,
          onboardingStatus: onboardingStatus?.data?.status,
          subscriptionTier: authState.formData?.selectedPlan, // Add tier
          formState: authState.formData
        }
      );

      if (!mountedRef.current) return;

      if (!validationResult.isValid) {
        await handleValidationFailure(validationResult);
        return;
      }

      updateAuthState({ 
        isValidating: false,
        error: null,
        validationType: null,
        lastValidated: currentTime
      });

      if (validationResult.redirectTo && window.location.pathname !== validationResult.redirectTo) {
        await router.replace(validationResult.redirectTo);
      }

    } catch (error) {
      if (mountedRef.current) {
        await handleValidationError(error, 'session');
      }
    }
  }, [session, authStatus, authState.isValidating, authState.lastValidated, onboardingStatus?.data?.status, router, handleValidationFailure, handleValidationError, updateAuthState]);



  // Memoized values
  const loadingState = useMemo(() => ({
    isLoading: !authState.isInitialized || 
               authStatus === 'loading' || 
               statusLoading || 
               queriesLoading ||
               authState.isValidating,
    reason: authState.isValidating ? 'validation' :
            !authState.isInitialized ? 'initialization' :
            authStatus === 'loading' ? 'authentication' :
            statusLoading || queriesLoading ? 'data-fetching' : null
  }), [authState, authStatus, statusLoading, queriesLoading]);

  //Context value
  const value = useMemo(() => ({
    currentStep: state.currentStep,
    isLoading: state.isLoading,
    error: state.error,
    formData: state.formData,
    selectedPlan: state.formData.selectedPlan,
    handleOnboardingRedirect,
    canNavigateToStep,
    updateFormData,
    setSelectedPlan,
    mutations
  }), [
    state,
    handleOnboardingRedirect,
    canNavigateToStep,
    updateFormData,
    setSelectedPlan,
    mutations
  ]);

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