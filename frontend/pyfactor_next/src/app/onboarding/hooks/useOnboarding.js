// src/app/onboarding/hooks/useOnboarding.js
'use client';

import { useContext } from 'react';
import { OnboardingContext } from '../contexts/onboardingContext';

/**
 * Custom hook for accessing onboarding context
 * @returns {Object} Onboarding context
 * @throws {Error} If used outside OnboardingProvider
 */
export function useOnboarding() {
  const context = useContext(OnboardingContext);
  
  if (context === undefined) {
    throw new Error(
      'useOnboarding must be used within an OnboardingProvider. ' +
      'Make sure you have wrapped your component tree with OnboardingProvider.'
    );
  }
  
  return context;
}

// Export both named and default for flexibility
export default useOnboarding;