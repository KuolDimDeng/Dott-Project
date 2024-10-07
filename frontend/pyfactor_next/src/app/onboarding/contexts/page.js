// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/contexts/page.js
'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

const OnboardingContext = createContext();

export const OnboardingProvider = ({ children }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({});

  const updateFormData = useCallback((newData) => {
    setFormData(prevData => ({ ...prevData, ...newData }));
  }, []);

  const goToNextStep = useCallback(() => setStep(prev => prev + 1), []);
  const goToPrevStep = useCallback(() => setStep(prev => prev - 1), []);

  return (
    <OnboardingContext.Provider value={{ step, formData, updateFormData, goToNextStep, goToPrevStep }}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};