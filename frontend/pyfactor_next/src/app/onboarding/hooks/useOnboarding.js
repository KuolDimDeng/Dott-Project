'use client';

import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { logger } from '@/utils/logger';
import { useCallback, useEffect, useState } from 'react';
import { updateUserAttributes, fetchUserAttributes } from 'aws-amplify/auth';
import { ONBOARDING_STATES } from '../state/OnboardingStateManager';

// Function to parse cookies - useful for onboarding status fallback
const getCookieValue = (name) => {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

export function useOnboarding() {
  const router = useRouter();
  const { session, isLoading: sessionLoading, refreshSession } = useSession();
  const user = session?.userAttributes; // Get user from session

  const [isUpdating, setIsUpdating] = useState(false);
  const [localOnboardingStep, setLocalOnboardingStep] = useState(null);
  const [hasAttemptedRefresh, setHasAttemptedRefresh] = useState(false);

  // Initialize onboarding data from cookies if possible
  useEffect(() => {
    // If no user data yet but we have cookie data, use that as a fallback
    if (!user && !localOnboardingStep) {
      const cookieStep = getCookieValue('onboardingStep');
      const cookieStatus = getCookieValue('onboardedStatus');
      
      if (cookieStep || cookieStatus) {
        logger.debug('[useOnboarding] Initializing from cookies:', { cookieStep, cookieStatus });
        setLocalOnboardingStep(cookieStatus || cookieStep || ONBOARDING_STATES.NOT_STARTED);
      }
    }
  }, [user, localOnboardingStep]);

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
    
    // Fallback to local state if we have it (from cookies or direct fetch)
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
        plan === 'free' ? ONBOARDING_STATES.SETUP : ONBOARDING_STATES.PAYMENT,
      [ONBOARDING_STATES.PAYMENT]: ONBOARDING_STATES.SETUP,
      [ONBOARDING_STATES.SETUP]: ONBOARDING_STATES.COMPLETE,
      [ONBOARDING_STATES.COMPLETE]: 'dashboard'
    };
    
    const subPlan = user?.['custom:subplan'] || getCookieValue('subplan');
    const nextStep = stepMap[normalizedStep];
    return typeof nextStep === 'function'
      ? nextStep(subPlan)
      : nextStep;
  }, [user]);

  const updateOnboardingStatus = useCallback(async (newStatus) => {
    setIsUpdating(true);
    try {
      // Set cookies as a fallback
      document.cookie = `onboardingStep=${newStatus.toLowerCase()}; path=/; max-age=${60 * 60 * 24 * 7}`;
      document.cookie = `onboardedStatus=${newStatus}; path=/; max-age=${60 * 60 * 24 * 7}`;
      
      // Update local state immediately
      setLocalOnboardingStep(newStatus);
      
      // Skip Cognito update if no user - will catch up later
      if (!user) {
        logger.debug('[useOnboarding] No user available, skipping attribute update but saved to cookies');
        return true;
      }

      // Update Cognito attributes using Amplify v6 format
      await updateUserAttributes({
        userAttributes: {
          'custom:onboarding': newStatus,
          'custom:updated_at': new Date().toISOString()
        }
      });

      logger.debug('[useOnboarding] Status updated:', {
        newStatus,
        timestamp: new Date().toISOString()
      });
      
      // Refresh session to get updated attributes
      await refreshSession();
      
      return true;
    } catch (error) {
      logger.error('[useOnboarding] Failed to update status:', error);
      // Even if Cognito update fails, we have cookies as fallback
      return true; 
    } finally {
      setIsUpdating(false);
    }
  }, [user, refreshSession]);

  const navigateToStep = useCallback((step) => {
    // Store where we're going in a cookie first
    document.cookie = `navigatingTo=${step.toLowerCase()}; path=/; max-age=3600`;
    
    // Then navigate
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
