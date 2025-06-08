'use client';


import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { logger } from '@/utils/logger';
import { useCallback, useEffect, useState } from 'react';
import { updateUserAttributes, fetchUserAttributes } from '@/config/amplifyUnified';
import { ONBOARDING_STATES } from '../state/OnboardingStateManager';

/**
 * Hook for managing onboarding state with Cognito user attributes
 * No longer uses cookies or localStorage for state management
 */
export function useOnboarding() {
  const router = useRouter();
  const { session, isLoading: sessionLoading, refreshSession } = useSession();
  const user = session?.userAttributes; // Get user from session

  const [isUpdating, setIsUpdating] = useState(false);
  const [localOnboardingStep, setLocalOnboardingStep] = useState(null);
  const [hasAttemptedRefresh, setHasAttemptedRefresh] = useState(false);

  // Attempt to refresh user data if session not available
  useEffect(() => {
    const attemptRefresh = async () => {
      if (!session && !hasAttemptedRefresh) {
        logger.debug('[useOnboarding] No session data, attempting refresh');
        setHasAttemptedRefresh(true);
        
        try {
          await refreshSession();
          
          // Try to get user attributes directly as a fallback
          try {
            const attributes = await fetchUserAttributes();
            logger.debug('[useOnboarding] Fetched attributes directly:', attributes);
            if (attributes && !localOnboardingStep) {
              const step = attributes['custom:onboarding'] || ONBOARDING_STATES.NOT_STARTED;
              setLocalOnboardingStep(step);
            }
          } catch (attrError) {
            logger.warn('[useOnboarding] Failed to fetch attributes directly:', attrError);
          }
        } catch (error) {
          logger.warn('[useOnboarding] Session refresh failed:', error);
        }
      }
    };
    
    attemptRefresh();
  }, [session, hasAttemptedRefresh, refreshSession, localOnboardingStep]);

  const getCurrentStep = useCallback(() => {
    // First try to get from user attributes
    if (user) {
      // Check onboardingStatus first (from backend) then fallback to custom:onboarding (from Cognito)
      const step = user.onboardingStatus || user['custom:onboarding'] || ONBOARDING_STATES.NOT_STARTED;
      return typeof step === 'string' ? step.toUpperCase() : step;
    }
    
    // Fallback to local state if we have it (from direct fetch)
    if (localOnboardingStep) {
      return typeof localOnboardingStep === 'string' ? localOnboardingStep.toUpperCase() : localOnboardingStep;
    }
    
    // Last resort fallback
    return ONBOARDING_STATES.NOT_STARTED;
  }, [user, localOnboardingStep]);
  
  const getNextStep = useCallback((currentStep) => {
    // Normalize currentStep to uppercase for consistent comparison
    const normalizedStep = typeof currentStep === 'string' ? currentStep.toUpperCase() : currentStep;
    
    const stepMap = {
      [ONBOARDING_STATES.NOT_STARTED]: ONBOARDING_STATES.BUSINESS_INFO,
      [ONBOARDING_STATES.BUSINESS_INFO]: ONBOARDING_STATES.SUBSCRIPTION,
      [ONBOARDING_STATES.SUBSCRIPTION]: (plan) =>
        plan === 'free' || plan === 'basic' ? ONBOARDING_STATES.SETUP : ONBOARDING_STATES.PAYMENT,
      [ONBOARDING_STATES.PAYMENT]: ONBOARDING_STATES.SETUP,
      [ONBOARDING_STATES.SETUP]: ONBOARDING_STATES.COMPLETE,
      [ONBOARDING_STATES.COMPLETE]: 'dashboard'
    };
    
    // Get subscription plan from user attributes
    const subPlan = user?.['custom:subplan'] || null;
    const nextStep = stepMap[normalizedStep];
    return typeof nextStep === 'function'
      ? nextStep(subPlan)
      : nextStep;
  }, [user]);

  const updateOnboardingStatus = useCallback(async (newStatus) => {
    setIsUpdating(true);
    try {
      // Update local state immediately for responsive UI
      setLocalOnboardingStep(newStatus);
      
      // Update Cognito attributes using Amplify v6 format
      await updateUserAttributes({
        userAttributes: {
          'custom:onboarding': newStatus,
          'custom:updated_at': new Date().toISOString()
        }
      });

      logger.debug('[useOnboarding] Status updated in Cognito:', {
        newStatus,
        timestamp: new Date().toISOString()
      });
      
      // Refresh session to get updated attributes
      await refreshSession();
      
      return true;
    } catch (error) {
      logger.error('[useOnboarding] Failed to update status in Cognito:', error);
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, [refreshSession]);

  const navigateToStep = useCallback((step) => {
    // Simply navigate to the step
    router.push(`/onboarding/${step.toLowerCase()}`);
  }, [router]);

  // Don't redirect to signin during onboarding flow
  useEffect(() => {
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    const isOnboardingPage = path.includes('/onboarding/');
    
    if (!sessionLoading && !isUpdating && !user && !isOnboardingPage && !localOnboardingStep) {
      logger.debug('[useOnboarding] No user data outside onboarding flow, redirecting to signin');
      router.push('/auth/signin');
    }
  }, [sessionLoading, user, isUpdating, router, localOnboardingStep]);

  return {
    currentStep: getCurrentStep(),
    updateOnboardingStatus,
    getNextStep,
    navigateToStep,
    isLoading: sessionLoading || isUpdating,
    user: user || { 'custom:onboarding': localOnboardingStep }
  };
}

export default useOnboarding;
