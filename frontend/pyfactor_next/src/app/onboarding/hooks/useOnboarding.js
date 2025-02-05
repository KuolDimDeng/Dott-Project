'use client';

import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { logger } from '@/utils/logger';
import { useCallback, useEffect } from 'react';
import { updateUserAttributes } from '@/config/amplify';

export function useOnboarding() {
  const router = useRouter();
  const { data: session, status, update } = useSession();

  const updateOnboardingStatus = useCallback(async (newStatus) => {
    try {
      await updateUserAttributes({
        'custom:onboarding': newStatus
      });
      await update();

      logger.debug('Onboarding status updated:', {
        newStatus,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to update onboarding status:', error);
      throw error;
    }
  }, [update]);

  const getCurrentStep = useCallback(() => {
    if (!session?.user) return 'business-info';
    return session.user['custom:onboarding'] || 'business-info';
  }, [session]);

  const getNextStep = useCallback((currentStep) => {
    const stepMap = {
      'business-info': 'subscription',
      'subscription': (plan) => plan === 'free' ? 'setup' : 'payment',
      'payment': 'setup',
      'setup': 'complete'
    };

    const nextStep = stepMap[currentStep];
    if (typeof nextStep === 'function') {
      return nextStep(session?.user?.['custom:selected_plan']);
    }
    return nextStep;
  }, [session]);

  const navigateToStep = useCallback((step) => {
    router.push(`/onboarding/${step}`);
  }, [router]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  return {
    currentStep: getCurrentStep(),
    updateOnboardingStatus,
    getNextStep,
    navigateToStep,
    isLoading: status === 'loading',
    user: session?.user
  };
}

export default useOnboarding;
