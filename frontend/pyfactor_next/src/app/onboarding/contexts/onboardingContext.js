// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/contexts/onboardingContext.js

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axiosInstance from '@/app/dashboard/components/components/axiosConfig';
import { logger } from '@/utils/logger';
import { useSession } from 'next-auth/react';

const OnboardingContext = createContext();

export const OnboardingProvider = ({ children }) => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [onboardingStatus, setOnboardingStatus] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    const persistedData = localStorage.getItem('onboardingData');
    if (persistedData) {
      setFormData(JSON.parse(persistedData));
    }
  }, []);

  const checkOnboardingStatus = useCallback(async () => {
    if (onboardingStatus) {
      return { onboarding_status: onboardingStatus, current_step: currentStep };
    }

    try {
      const response = await axiosInstance.get('/api/onboarding/status/');
      logger.info('Onboarding status response:', response.data);

      const { onboarding_status, current_step } = response.data;
      setOnboardingStatus(onboarding_status);
      setCurrentStep(current_step);

      return { onboarding_status, current_step };
    } catch (error) {
      logger.error('Error checking onboarding status:', error);
      return { onboarding_status: 'step1', current_step: 1 };
    }
  }, [onboardingStatus, currentStep]);

  const initiateOnboarding = async (data) => {
    setLoading(true);
    setError(null);
    try {
      logger.info('Initiating onboarding', { formData, additionalData: data });
      const response = await axiosInstance.post('/api/onboarding/start/', data);
      setFormData(response.data);
      setOnboardingStatus(response.data.onboarding_status);
      setCurrentStep(response.data.current_step);
      localStorage.setItem('onboardingData', JSON.stringify(response.data));
      handleOnboardingRedirect(response.data.onboarding_status);
    } catch (error) {
      logger.error('Error initiating onboarding', { error: error.message });
      setError('Failed to initiate onboarding. Please try again.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const completeOnboarding = async (data) => {
    setLoading(true);
    setError(null);
    try {
      logger.info('Completing onboarding', { formData, additionalData: data });
      const response = await axiosInstance.post('/api/onboarding/complete/', { ...formData, ...data });
      logger.info('Onboarding completed successfully', response.data);
      if (response.data.message === "Onboarding completed successfully") {
        localStorage.removeItem('onboardingData');
        setOnboardingStatus('complete');
        router.push('/dashboard');
      }
    } catch (error) {
      logger.error('Error completing onboarding', { 
        error: error.message, 
        response: error.response?.data 
      });
      setError('Failed to complete onboarding. Please try again.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleOnboardingRedirect = useCallback((status) => {
    logger.info('Redirecting to step:', status);
    router.replace(`/onboarding/${status}`);
  }, [router]);

  const goToNextStep = useCallback(() => {
    const steps = ['step1', 'step2', 'payment', 'complete'];
    const currentIndex = steps.indexOf(onboardingStatus);
    const nextStatus = steps[currentIndex + 1] || 'complete';
    setOnboardingStatus(nextStatus);
    setCurrentStep(currentIndex + 2);
    handleOnboardingRedirect(nextStatus);
  }, [onboardingStatus, handleOnboardingRedirect]);

  const goToPrevStep = useCallback(() => {
    const steps = ['step1', 'step2', 'payment', 'complete'];
    const currentIndex = steps.indexOf(onboardingStatus);
    const prevStatus = steps[currentIndex - 1] || 'step1';
    setOnboardingStatus(prevStatus);
    setCurrentStep(currentIndex);
    handleOnboardingRedirect(prevStatus);
  }, [onboardingStatus, handleOnboardingRedirect]);

  const updateFormData = useCallback((data) => {
    const updatedData = { ...formData, ...data };
    setFormData(updatedData);
    localStorage.setItem('onboardingData', JSON.stringify(updatedData));
  }, [formData]);

  const contextValue = {
    onboardingStatus,
    formData,
    loading,
    error,
    currentStep,
    goToNextStep,
    goToPrevStep,
    updateFormData,
    completeOnboarding,
    checkOnboardingStatus,
    initiateOnboarding
  };

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => useContext(OnboardingContext);