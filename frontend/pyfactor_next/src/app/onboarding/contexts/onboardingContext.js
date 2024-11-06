///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/contexts/onboardingContext.js
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';
import { useSession, signOut } from 'next-auth/react';


const ONBOARDING_STEPS = {
  INITIAL: 'step1',
  PLAN: 'step2',
  PAYMENT: 'step3',
  SETUP: 'step4',
  COMPLETE: 'complete'
};

export const OnboardingContext = createContext(null);


export const OnboardingProvider = ({ children }) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, status } = useSession();
  const [formData, setFormData] = useState({});
  const [isInitialized, setIsInitialized] = useState(false);

  // Load persisted data on mount
  useEffect(() => {
    try {
      const persistedData = localStorage.getItem('onboardingData');
      if (persistedData) {
        setFormData(JSON.parse(persistedData));
      }
    } catch (error) {
      logger.error('Error loading persisted onboarding data:', error);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Sync session changes
  useEffect(() => {
    if (status === 'unauthenticated') {
      resetOnboardingData();
    }
  }, [status]);

  // Query for onboarding status
  const { 
    data: onboardingData, 
    isLoading: statusLoading,
    error: statusError,
    refetch: refetchStatus 
  } = useQuery({
    queryKey: ['onboardingStatus'],
    queryFn: async () => {
      try {
        if (!session?.user?.accessToken) {
          throw new Error('No access token available');
        }

        const response = await axiosInstance.get('/api/onboarding/status/', {
          headers: {
            Authorization: `Bearer ${session.user.accessToken}`
          }
        });
        logger.info('Onboarding status response:', response.data);
        return response.data;
      } catch (error) {
        logger.error('Error fetching onboarding status:', error);
        if (error.response?.status === 401) {
          await signOut({ redirect: true, callbackUrl: '/auth/signin' });
        }
        throw error;
      }
    },
    staleTime: 30000,
    retry: (failureCount, error) => {
      if (error?.response?.status === 401) return false;
      return failureCount < 2;
    },
    enabled: status === 'authenticated' && !!session?.user?.accessToken && isInitialized,
  });

  const handleApiError = useCallback(async (error, endpoint) => {
    logger.error(`Error in ${endpoint}:`, error);
    if (error.response?.status === 401) {
      await signOut({ redirect: true, callbackUrl: '/auth/signin' });
    }
    throw error;
  }, []);

  // Create mutation helper
  const createMutation = (endpoint, successHandler) => 
    useMutation({
      mutationFn: async (data) => {
        try {
          if (!session?.user?.accessToken) {
            throw new Error('No access token available');
          }

          logger.info(`Saving data to ${endpoint}`, data);
          const response = await axiosInstance.post(endpoint, data, {
            headers: {
              Authorization: `Bearer ${session.user.accessToken}`
            }
          });
          return response.data;
        } catch (error) {
          return handleApiError(error, endpoint);
        }
      },
      onSuccess: (responseData, variables) => {
        setFormData(prevData => {
          const updatedData = { ...prevData, ...variables };
          try {
            localStorage.setItem('onboardingData', JSON.stringify(updatedData));
          } catch (error) {
            logger.error('Error saving to localStorage:', error);
          }
          return updatedData;
        });
        queryClient.invalidateQueries(['onboardingStatus']);
        successHandler?.(responseData, variables);
      }
    });

  // Step mutations
  const step1Mutation = createMutation(
    '/api/onboarding/save-step1/',
    () => router.replace('/onboarding/step2')
  );

  const step2Mutation = createMutation(
    '/api/onboarding/save-step2/',
    (_, variables) => router.replace(variables.selectedPlan === 'Professional' ? '/onboarding/step3' : '/onboarding/step4')
  );

  const step3Mutation = createMutation(
    '/api/onboarding/save-step3/',
    () => router.replace('/onboarding/step4')
  );

  const step4Mutation = createMutation(
    '/api/onboarding/save-step4/',
    () => router.replace('/dashboard')
  );

  const initiateOnboardingMutation = useMutation({
    mutationFn: async (data) => {
      try {
        if (!session?.user?.accessToken) {
          throw new Error('No access token available');
        }

        logger.info('Initiating onboarding', { formData, additionalData: data });
        const response = await axiosInstance.post('/api/onboarding/start/', data, {
          headers: {
            Authorization: `Bearer ${session.user.accessToken}`
          }
        });
        return response.data;
      } catch (error) {
        return handleApiError(error, 'initiateOnboarding');
      }
    },
    onSuccess: (responseData, variables) => {
      const updatedFormData = { ...formData, ...variables, ...responseData };
      setFormData(updatedFormData);
      try {
        localStorage.setItem('onboardingData', JSON.stringify(updatedFormData));
      } catch (error) {
        logger.error('Error saving to localStorage:', error);
      }
      queryClient.invalidateQueries(['onboardingStatus']);
      handleOnboardingRedirect(responseData.onboarding_status);
    }
  });

  const completeOnboardingMutation = useMutation({
    mutationFn: async (data) => {
      try {
        if (!session?.user?.accessToken) {
          throw new Error('No access token available');
        }

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

        const requiredFields = [
          'business_name', 
          'business_type', 
          'country', 
          'legal_structure', 
          'date_founded', 
          'first_name', 
          'last_name', 
          'email'
        ];

        const missingFields = requiredFields.filter(field => !payload[field]);
        if (missingFields.length > 0) {
          throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }

        const response = await axiosInstance.post('/api/onboarding/complete/', payload, {
          headers: {
            Authorization: `Bearer ${session.user.accessToken}`
          }
        });
        return response.data;
      } catch (error) {
        return handleApiError(error, 'completeOnboarding');
      }
    },
    onSuccess: () => {
      localStorage.removeItem('onboardingData');
      queryClient.invalidateQueries(['onboardingStatus']);
      router.replace('/dashboard');
    }
  });

  const handleOnboardingRedirect = useCallback((status) => {
    logger.info('Redirecting to step:', status);
    if (status === ONBOARDING_STEPS.COMPLETE) {
      router.replace('/dashboard');
    } else {
      router.replace(`/onboarding/${status || ONBOARDING_STEPS.INITIAL}`);
    }
  }, [router]);

  const updateFormData = useCallback((data) => {
    setFormData(prevData => {
      const updatedData = {...prevData, ...data};
      try {
        localStorage.setItem('onboardingData', JSON.stringify(updatedData));
      } catch (error) {
        logger.error('Error saving to localStorage:', error);
      }
      return updatedData;
    });
  }, []);

  const resetOnboardingData = useCallback(() => {
    localStorage.removeItem('onboardingData');
    setFormData({});
    queryClient.invalidateQueries(['onboardingStatus']);
  }, [queryClient]);

  const contextValue = {
    onboardingStatus: onboardingData?.onboarding_status || ONBOARDING_STEPS.INITIAL,
    currentStep: onboardingData?.current_step || 1,
    formData,
    loading: !isInitialized || 
      statusLoading || 
      step1Mutation.isPending || 
      step2Mutation.isPending || 
      step3Mutation.isPending || 
      step4Mutation.isPending || 
      initiateOnboardingMutation.isPending || 
      completeOnboardingMutation.isPending,
    error: statusError ||
      step1Mutation.error || 
      step2Mutation.error || 
      step3Mutation.error || 
      step4Mutation.error || 
      initiateOnboardingMutation.error || 
      completeOnboardingMutation.error,
    saveStep1Data: step1Mutation.mutate,
    saveStep2Data: step2Mutation.mutate,
    saveStep3Data: step3Mutation.mutate,
    saveStep4Data: step4Mutation.mutate,
    initiateOnboarding: initiateOnboardingMutation.mutate,
    completeOnboarding: completeOnboardingMutation.mutate,
    updateFormData,
    resetOnboardingData,
    handleOnboardingRedirect,
    isAuthenticated: status === 'authenticated',
    session,
  };

  return (
    <OnboardingContext.Provider value={contextValue}>
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

export default OnboardingProvider;