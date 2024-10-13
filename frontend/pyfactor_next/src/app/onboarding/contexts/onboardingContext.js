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

  const saveStep1Data = async (data) => {
    setLoading(true);
    setError(null);
    try {
      logger.info('Saving step 1 data', data);
      const response = await axiosInstance.post('/api/onboarding/save-step1/', data);
      console.log('Step 1 data saved:', response.data);
      
      setFormData(prevData => ({...prevData, ...data}));
      setOnboardingStatus('step2');
      setCurrentStep(2);
      
      return response.data;
    } catch (error) {
      logger.error('Error saving step 1 data', { error: error.message });
      setError('Failed to save step 1 data. Please try again.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const saveStep2Data = async (data) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.post('/api/onboarding/save-step2/', data);
      console.log('Step 2 data saved:', response.data);
      
      setFormData(prevData => ({...prevData, ...data}));
      
      if (data.selectedPlan === 'Professional') {
        setOnboardingStatus('step3');
        setCurrentStep(3);
      } else {
        setOnboardingStatus('step4');
        setCurrentStep(4);
      }
      
      return response.data;
    } catch (error) {
      setError('Failed to save step 2 data. Please try again.');
      throw error;
    } finally {
      setLoading(false);
    }
  };


  const saveStep3Data = async (data) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.post('/api/onboarding/save-step3/', data);
      console.log('Step 3 data saved:', response.data);
      
      setFormData(prevData => ({...prevData, ...data}));
      setOnboardingStatus('step4');
      setCurrentStep(4);
      
      return response.data;
    } catch (error) {
      setError('Failed to save step 3 data. Please try again.');
      throw error;
    } finally {
      setLoading(false);
    }
  };


  const saveStep4Data = async (data) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.post('/api/onboarding/save-step4/', data);
      console.log('Step 4 data saved:', response.data);
      
      setFormData(prevData => ({...prevData, ...data}));
      setOnboardingStatus('complete');
      setCurrentStep(0);
      
      return response.data;
    } catch (error) {
      setError('Failed to save step 4 data. Please try again.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const initiateOnboarding = async (data) => {
    setLoading(true);
    setError(null);
    try {
      logger.info('Initiating onboarding', { formData, additionalData: data });
      const response = await axiosInstance.post('/api/onboarding/start/', data);
      console.log('Response from initiateOnboarding:', response.data);
  
      const updatedFormData = { ...formData, ...data, ...response.data };
      setFormData(updatedFormData);
      localStorage.setItem('onboardingData', JSON.stringify(updatedFormData));
      
      setOnboardingStatus(response.data.onboarding_status);
      setCurrentStep(response.data.current_step);
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
      const payload = { 
        ...formData, 
        ...data,
        business_type: formData.industry || data.industry,
        legal_structure: formData.legalStructure || data.legalStructure,
        business_name: formData.businessName || data.businessName,
        date_founded: formData.dateFounded || data.dateFounded,
        first_name: formData.firstName || data.firstName,
        last_name: formData.lastName || data.lastName,
        email: formData.email || data.email || session?.user?.email,
        country: formData.country || data.country,
        subscription_type: data.selectedPlan || formData.selectedPlan,
        billing_cycle: data.billingCycle || formData.billingCycle,
      };
  
      logger.info('Completing onboarding - Full payload:', JSON.stringify(payload, null, 2));
      
      // Check for required fields
      const requiredFields = ['business_name', 'business_type', 'country', 'legal_structure', 'date_founded', 'first_name', 'last_name', 'email'];
      const missingFields = requiredFields.filter(field => !payload[field]);
      
      if (missingFields.length > 0) {
        logger.warn('Missing required fields:', missingFields);
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }
  
      logger.info('Required fields check:', {
        business_name: payload.business_name || 'Missing',
        business_type: payload.business_type || 'Missing',
        country: payload.country || 'Missing',
        legal_structure: payload.legal_structure || 'Missing',
        date_founded: payload.date_founded || 'Missing',
        first_name: payload.first_name || 'Missing',
        last_name: payload.last_name || 'Missing',
        email: payload.email || 'Missing',
      });
      console.log('Payload for completeOnboarding:', payload);

      const response = await axiosInstance.post('/api/onboarding/complete/', payload);
      logger.info('Onboarding completed successfully', response.data);
      if (response.data.message === "Onboarding completed successfully") {
        localStorage.removeItem('onboardingData');
        setOnboardingStatus('complete');
      }
    } catch (error) {
      logger.error('Error completing onboarding', { 
        error: error.message, 
        response: error.response?.data,
        stack: error.stack
      });
      setError(`Failed to complete onboarding: ${error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleOnboardingRedirect = useCallback((status) => {
    logger.info('Redirecting to step:', status);
    if (status === 'complete') {
      router.replace('/dashboard');
    } else {
      router.replace(`/onboarding/${status}`);
    }
  }, [router]);

  const goToNextStep = useCallback(() => {
    const steps = ['step1', 'step2', 'step3', 'step4', 'complete'];
    const currentIndex = steps.indexOf(onboardingStatus);
    let nextStatus;

    if (currentIndex === 1 && formData.selectedPlan !== 'Professional') {
      nextStatus = 'step4';
    } else {
      nextStatus = steps[currentIndex + 1] || 'complete';
    }

    setOnboardingStatus(nextStatus);
    setCurrentStep(steps.indexOf(nextStatus) + 1);
    handleOnboardingRedirect(nextStatus);
  }, [onboardingStatus, formData.selectedPlan, handleOnboardingRedirect]);

  const goToPrevStep = useCallback(() => {
    const steps = ['step1', 'step2', 'step3', 'step4', 'complete'];
    const currentIndex = steps.indexOf(onboardingStatus);
    let prevStatus;

    if (currentIndex === 3 && formData.selectedPlan !== 'Professional') {
      prevStatus = 'step2';
    } else {
      prevStatus = steps[currentIndex - 1] || 'step1';
    }

    setOnboardingStatus(prevStatus);
    setCurrentStep(steps.indexOf(prevStatus) + 1);
    handleOnboardingRedirect(prevStatus);
  }, [onboardingStatus, formData.selectedPlan, handleOnboardingRedirect]);


  const updateFormData = useCallback((data) => {
    setFormData(prevData => ({...prevData, ...data}));
    localStorage.setItem('onboardingData', JSON.stringify({...formData, ...data}));
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
    initiateOnboarding,
    saveStep1Data,
    saveStep2Data,
    saveStep3Data,
    saveStep4Data,
    setOnboardingStatus,
    
  };

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => useContext(OnboardingContext);