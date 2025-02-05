///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/contexts/OnboardingProvider.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { logger } from '@/utils/logger';

const OnboardingContext = createContext();

export function OnboardingProvider({ children }) {
  const [onboardingState, setOnboardingState] = useState({
    currentStep: 0,
    isComplete: false,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const response = await fetch('/api/onboarding/setup/status');
        if (!response.ok) {
          throw new Error('Failed to fetch onboarding status');
        }
        const data = await response.json();
        
        logger.debug('Onboarding status:', { data });
        
        setOnboardingState(prev => ({
          ...prev,
          isComplete: data.isComplete,
          currentStep: data.currentStep,
          isLoading: false,
        }));
      } catch (error) {
        logger.error('Error checking onboarding status:', error);
        setOnboardingState(prev => ({
          ...prev,
          error: error.message,
          isLoading: false,
        }));
      }
    };

    checkOnboardingStatus();
  }, []);

  const value = {
    ...onboardingState,
    updateStep: (step) => {
      logger.debug('Updating onboarding step:', { step });
      setOnboardingState(prev => ({ ...prev, currentStep: step }));
    },
    completeOnboarding: () => {
      logger.debug('Completing onboarding');
      setOnboardingState(prev => ({ ...prev, isComplete: true }));
    },
  };

  return (
    <ErrorBoundary>
      <OnboardingContext.Provider value={value}>
        {children}
      </OnboardingContext.Provider>
    </ErrorBoundary>
  );
}

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};
