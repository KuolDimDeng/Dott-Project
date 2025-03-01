'use client';

import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { logger } from '@/utils/logger';
import { useCallback, useEffect, useState } from 'react';
import { updateUserAttributes } from '@/lib/authUtils';
import { ONBOARDING_STATES } from '../state/OnboardingStateManager';

export function useOnboarding() {
  const router = useRouter();
  const { user, loading, updateAttributes } = useSession();

  const [isUpdating, setIsUpdating] = useState(false);

  const getCurrentStep = useCallback(() => {
    if (!user) return ONBOARDING_STATES.NOT_STARTED;
    // Check onboardingStatus first (from backend) then fallback to custom:onboarding (from Cognito)
    return user.onboardingStatus || user['custom:onboarding'] || ONBOARDING_STATES.NOT_STARTED;
  }, [user]);
  
  const getNextStep = useCallback((currentStep) => {
    const stepMap = {
      [ONBOARDING_STATES.NOT_STARTED]: ONBOARDING_STATES.BUSINESS_INFO,
      [ONBOARDING_STATES.BUSINESS_INFO]: ONBOARDING_STATES.SUBSCRIPTION,
      [ONBOARDING_STATES.SUBSCRIPTION]: (plan) => 
        plan === 'free' ? ONBOARDING_STATES.SETUP : ONBOARDING_STATES.PAYMENT,
      [ONBOARDING_STATES.PAYMENT]: ONBOARDING_STATES.SETUP,
      [ONBOARDING_STATES.SETUP]: ONBOARDING_STATES.COMPLETE,
      [ONBOARDING_STATES.COMPLETE]: 'dashboard'
    };
    
    const nextStep = stepMap[currentStep];
    return typeof nextStep === 'function'
      ? nextStep(user?.['custom:subplan'])
      : nextStep;
  }, [user]);

  const updateOnboardingStatus = useCallback(async (newStatus) => {
    if (!user) {
      throw new Error('No user found');
    }

    setIsUpdating(true);
    try {
      // Update Cognito attributes
      await updateUserAttributes({
        'custom:onboarding': newStatus,
        'custom:lastUpdated': Date.now().toString()
      });

      // Update local auth state
      updateAttributes({
        'custom:onboarding': newStatus
      });

      logger.debug('Onboarding status updated:', {
        newStatus,
        timestamp: new Date().toISOString()
      });
      return true;
    } catch (error) {
      logger.error('Failed to update onboarding status:', error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [user, updateAttributes]);

  const navigateToStep = useCallback((step) => {
    router.push(`/onboarding/${step.toLowerCase()}`);
  }, [router]);

  useEffect(() => {
    if (!loading && !user && !isUpdating) {
      router.push('/auth/signin');
    }
  }, [loading, user, isUpdating, router]);

  return {
    currentStep: getCurrentStep(),
    updateOnboardingStatus,
    getNextStep,
    navigateToStep,
    isLoading: loading || isUpdating,
    user
  };
}

export default useOnboarding;
