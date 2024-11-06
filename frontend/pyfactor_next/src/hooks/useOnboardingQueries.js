// src/hooks/useOnboardingQueries.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/app/dashboard/components/components/axiosConfig';

export const useOnboardingStatus = () => {
  return useQuery({
    queryKey: ['onboardingStatus'],
    queryFn: async () => {
      const response = await axiosInstance.get('/api/onboarding/status/');
      return response.data;
    },
  });
};

export const useStep1Mutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data) => {
      const response = await axiosInstance.post('/api/onboarding/save-step1/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['onboardingStatus']);
    },
  });
};

export const useStep2Mutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data) => {
      const response = await axiosInstance.post('/api/onboarding/save-step2/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['onboardingStatus']);
    },
  });
};

export const useStep3Mutation = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
      mutationFn: async (data) => {
        const response = await axiosInstance.post('/api/onboarding/save-step3/', data);
        return response.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries(['onboardingStatus']);
      },
    });
  };

  export const useStep4Mutation = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
      mutationFn: async (data) => {
        const response = await axiosInstance.post('/api/onboarding/save-step4/', data);
        return response.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries(['onboardingStatus']);
      },
    });
  };

// Add similar mutations for step3 and step4