///Users/kuoldeng/projectx/frontend/pyfactor_next/src/hooks/useOnboarding.js
'use client';

import { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';
import { logger } from '@/utils/logger';
import useOnboardingStore from '@/app/onboarding/store/onboardingStore';
import { useSession } from './useSession';
import { ONBOARDING_STATES } from '@/utils/userAttributes';

const ONBOARDING_ROUTES = {
  [ONBOARDING_STATES.NOT_STARTED]: '/onboarding/business-info',
  [ONBOARDING_STATES.BUSINESS_INFO]: '/onboarding/subscription',
  [ONBOARDING_STATES.SUBSCRIPTION]: '/onboarding/payment',
  [ONBOARDING_STATES.PAYMENT]: '/onboarding/setup',
  [ONBOARDING_STATES.SETUP]: '/onboarding/complete',
  [ONBOARDING_STATES.COMPLETE]: '/dashboard'
};

export function useOnboarding() {
  const router = useRouter();
  const { refreshSession } = useSession();
  const {
    currentStep,
    isLoading,
    error,
    loadOnboardingState,
    setStep,
    setBusinessInfo,
    setSubscription,
    setPayment,
    completeSetup
  } = useOnboardingStore();

  const validateSession = useCallback(async () => {
    try {
      // Get current session using v6 API
      const { tokens } = await fetchAuthSession();
      if (!tokens?.idToken) {
        throw new Error('No valid session');
      }

      // Get current user using v6 API
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('No current user found');
      }

      return { tokens, user };
    } catch (error) {
      logger.error('[useOnboarding] Session validation failed:', error);
      router.push('/auth/signin');
      return null;
    }
  }, [router]);

  const getNextRoute = useCallback((step) => {
    return ONBOARDING_ROUTES[step] || ONBOARDING_ROUTES[ONBOARDING_STATES.NOT_STARTED];
  }, []);

  const handleStepCompletion = useCallback(async (step, data) => {
    try {
      // Validate session
      const session = await validateSession();
      if (!session) return false;

      let success = false;

      // Handle step completion based on current step
      switch (step) {
        case ONBOARDING_STATES.BUSINESS_INFO:
          success = await setBusinessInfo(data);
          break;
        case ONBOARDING_STATES.SUBSCRIPTION:
          success = await setSubscription(data);
          break;
        case ONBOARDING_STATES.PAYMENT:
          success = await setPayment(data);
          break;
        case ONBOARDING_STATES.SETUP:
          success = await completeSetup();
          break;
        default:
          success = await setStep(step);
      }

      if (!success) {
        throw new Error('Failed to update onboarding state');
      }

      // Refresh session to update tokens with new attributes
      await refreshSession();

      // Wait for store to update and get current state
      await loadOnboardingState();
      const currentState = useOnboardingStore.getState();
      
      // Get next route based on current state
      const nextRoute = getNextRoute(currentState.currentStep);
      
      logger.debug('[useOnboarding] Step completed:', {
        currentStep: step,
        nextStep,
        nextRoute
      });

      // Navigate to next step
      router.push(nextRoute);
      return true;

    } catch (error) {
      logger.error('[useOnboarding] Step completion failed:', error);
      return false;
    }
  }, [validateSession, setBusinessInfo, setSubscription, setPayment, completeSetup, setStep, refreshSession, getNextRoute, router, loadOnboardingState]);

  const validateCurrentStep = useCallback(async (pathname) => {
    try {
      // Validate session
      const session = await validateSession();
      if (!session) return;

      // Load onboarding state if not loaded
      await loadOnboardingState();

      // Get expected route for current step
      const expectedRoute = getNextRoute(currentStep);

      // If user is trying to access a step they haven't reached yet,
      // redirect them to their current step
      if (pathname !== expectedRoute && pathname !== '/dashboard') {
        logger.debug('[useOnboarding] Redirecting to current step:', {
          currentStep,
          expectedRoute,
          attemptedRoute: pathname
        });
        router.push(expectedRoute);
      }
    } catch (error) {
      logger.error('[useOnboarding] Step validation failed:', error);
    }
  }, [validateSession, loadOnboardingState, currentStep, getNextRoute, router]);

  // Load initial onboarding state
  useEffect(() => {
    const initOnboarding = async () => {
      try {
        // Validate session
        const session = await validateSession();
        if (!session) return;

        // Load onboarding state
        await loadOnboardingState();
      } catch (error) {
        logger.error('[useOnboarding] Initialization failed:', error);
      }
    };

    initOnboarding();
  }, [validateSession, loadOnboardingState]);

  return {
    currentStep,
    isLoading,
    error,
    handleStepCompletion,
    validateCurrentStep,
    getNextRoute
  };
}