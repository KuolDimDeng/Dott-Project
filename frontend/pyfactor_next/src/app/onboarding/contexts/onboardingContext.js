// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/contexts/onboardingContext.js

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axiosInstance from '@/app/dashboard/components/components/axiosConfig';
import { logger } from '@/utils/logger';
import { useSession } from 'next-auth/react';

const OnboardingContext = createContext();

export const OnboardingProvider = ({ children }) => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [onboardingStatus, setOnboardingStatus] = useState('step1');
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const persistedData = localStorage.getItem('onboardingData');
    if (persistedData) {
      setFormData(JSON.parse(persistedData));
    }
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const response = await axiosInstance.get('/api/onboarding/status/');
      const { onboarding_status, current_step } = response.data;
      setOnboardingStatus(onboarding_status);
      setStep(current_step);
      
      if (onboarding_status !== 'complete') {
        router.push(`/onboarding/step${current_step}`);
      } else {
        //
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    }
  };
  
  const initiateOnboarding = async (data) => {
    setLoading(true);
    setError(null);
    try {
      logger.info('Initiating onboarding', { formData, additionalData: data });
      const response = await axiosInstance.post('/api/onboarding/start/', data, {
        headers: {
          Authorization: `Bearer ${session?.user?.accessToken}`
        }
      });
      setFormData(response.data);
      setOnboardingStatus(response.data.onboarding_status);
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
      const response = await axiosInstance.post('/api/onboarding/complete/', 
        { ...formData, ...data }, 
        {
          headers: {
            Authorization: `Bearer ${session?.user?.accessToken}`
          }
        }
      );
      logger.info('Onboarding completed successfully', response.data);
      if (response.data.message === "Onboarding completed successfully") {
        localStorage.removeItem('onboardingData');
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

  const handleOnboardingRedirect = (status) => {
    logger.info('Redirecting to step:', status);
    router.replace(`/onboarding/${status}`);
  };

  const goToNextStep = () => {
    const steps = ['step1', 'step2', 'payment', 'complete'];
    const currentIndex = steps.indexOf(onboardingStatus);
    const nextStatus = steps[currentIndex + 1] || 'complete';
    setOnboardingStatus(nextStatus);
    handleOnboardingRedirect(nextStatus);
  };

  const goToPrevStep = () => {
    const steps = ['step1', 'step2', 'payment', 'complete'];
    const currentIndex = steps.indexOf(onboardingStatus);
    const prevStatus = steps[currentIndex - 1] || 'step1';
    setOnboardingStatus(prevStatus);
    handleOnboardingRedirect(prevStatus);
  };

  const updateFormData = (data) => {
    const updatedData = { ...formData, ...data };
    setFormData(updatedData);
    localStorage.setItem('onboardingData', JSON.stringify(updatedData));
  };

  return (
    <OnboardingContext.Provider value={{
      onboardingStatus,
      formData,
      loading,
      error,
      goToNextStep,
      goToPrevStep,
      updateFormData,
      completeOnboarding,
      checkOnboardingStatus,
      initiateOnboarding
    }}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => useContext(OnboardingContext);