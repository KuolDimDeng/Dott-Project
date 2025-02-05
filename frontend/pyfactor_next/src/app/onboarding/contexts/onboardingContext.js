'use client';

import React, { createContext, useContext, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { useToast } from '@/components/Toast/ToastProvider';
import { logger } from '@/utils/logger';
import { updateUserAttributes } from '@/config/amplify';

const OnboardingContext = createContext(null);

export function OnboardingProvider({ children }) {
  const router = useRouter();
  const { data: session, update } = useSession();
  const toast = useToast();

  const updateStep = useCallback(async (step, data = {}) => {
    try {
      // Update user attributes in Cognito
      const attributes = {
        ...Object.keys(data).reduce((acc, key) => ({
          ...acc,
          [`custom:${key}`]: data[key]
        }), {}),
        'custom:onboarding': step
      };

      await updateUserAttributes(attributes);
      await update();

      logger.debug('Onboarding step updated:', {
        step,
        timestamp: new Date().toISOString()
      });

      return true;
    } catch (error) {
      logger.error('Failed to update onboarding step:', error);
      toast.error(error.message || 'Failed to update progress');
      return false;
    }
  }, [update, toast]);

  const getCurrentStep = useCallback(() => {
    return session?.user?.['custom:onboarding'] || 'business-info';
  }, [session]);

  const navigateToStep = useCallback((step) => {
    router.push(`/onboarding/${step}`);
  }, [router]);

  const value = {
    currentStep: getCurrentStep(),
    updateStep,
    navigateToStep,
    user: session?.user
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboardingContext() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboardingContext must be used within OnboardingProvider');
  }
  return context;
}

export default OnboardingContext;
