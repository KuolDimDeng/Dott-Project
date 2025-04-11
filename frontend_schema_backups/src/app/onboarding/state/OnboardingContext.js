///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/state/OnboardingContext.js
'use client';

import React, { createContext, useContext, useMemo, useEffect } from 'react';
import { FormStateManager } from './FormStateManager';

export const OnboardingContext = createContext();

export function OnboardingProvider({ children }) {
  const formManager = useMemo(() => new FormStateManager('onboarding'), []);

  useEffect(() => {
    return () => formManager.cleanup();
  }, [formManager]);

  return (
    <OnboardingContext.Provider value={formManager}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}