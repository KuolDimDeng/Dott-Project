// src/hooks/useOnboardingQueries.js
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/hooks/useSession';
import { axiosInstance } from '@/lib/axiosConfig';
import { APP_CONFIG } from '@/config';
import { logger } from '@/utils/logger';
import { useToast } from '@/components/Toast/ToastProvider';

export function useOnboardingQueries() {
  const { data: session, status: authStatus } = useSession();
  const queryClient = useQueryClient();
  const toast = useToast();

  // Get status query function with auth check
  const getStatus = async () => {
    if (!session?.user?.accessToken) {
      throw new Error('Authentication required');
    }
    try {
      const response = await axiosInstance.get(
        APP_CONFIG.api.endpoints.onboarding.status
      );
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch onboarding status:', error);
      throw error;
    }
  };

  // Define mutations with auth checks and error handling
  const mutations = {
    getStatus,
    step1: useMutation({
      mutationFn: async (data) => {
        if (!session?.user?.accessToken) {
          throw new Error('Authentication required');
        }
        const response = await axiosInstance.post(
          APP_CONFIG.api.endpoints.onboarding.step1,
          data
        );
        return response.data;
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries([APP_CONFIG.onboarding.queryKeys.status]);
        toast.success('Step 1 completed successfully');
      },
      onError: (error) => {
        logger.error('Failed to save step 1:', error);
        toast.error(error.message || 'Failed to save step 1');
      },
    }),

    step2: useMutation({
      mutationFn: async (data) => {
        if (!session?.user?.accessToken) {
          throw new Error('Authentication required');
        }
        const response = await axiosInstance.post(
          APP_CONFIG.api.endpoints.onboarding.step2,
          data
        );
        return response.data;
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries([APP_CONFIG.onboarding.queryKeys.status]);
        toast.success('Step 2 completed successfully');
      },
      onError: (error) => {
        logger.error('Failed to save step 2:', error);
        toast.error(error.message || 'Failed to save step 2');
      },
    }),

    step3: useMutation({
      mutationFn: async (data) => {
        if (!session?.user?.accessToken) {
          throw new Error('Authentication required');
        }
        const response = await axiosInstance.post(
          APP_CONFIG.api.endpoints.onboarding.step3,
          data
        );
        return response.data;
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries([APP_CONFIG.onboarding.queryKeys.status]);
        toast.success('Step 3 completed successfully');
      },
      onError: (error) => {
        logger.error('Failed to save step 3:', error);
        toast.error(error.message || 'Failed to save step 3');
      },
    }),

    step4: useMutation({
      mutationFn: async (data) => {
        if (!session?.user?.accessToken) {
          throw new Error('Authentication required');
        }
        const response = await axiosInstance.post(
          APP_CONFIG.api.endpoints.onboarding.step4,
          data
        );
        return response.data;
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries([APP_CONFIG.onboarding.queryKeys.status]);
        toast.success('Step 4 completed successfully');
      },
      onError: (error) => {
        logger.error('Failed to save step 4:', error);
        toast.error(error.message || 'Failed to save step 4');
      },
    }),

    complete: useMutation({
      mutationFn: async (data) => {
        if (!session?.user?.accessToken) {
          throw new Error('Authentication required');
        }
        const response = await axiosInstance.post(
          APP_CONFIG.api.endpoints.onboarding.complete,
          data
        );
        return response.data;
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries([APP_CONFIG.onboarding.queryKeys.status]);
        toast.success('Onboarding completed successfully');
      },
      onError: (error) => {
        logger.error('Failed to complete onboarding:', error);
        toast.error(error.message || 'Failed to complete onboarding');
      },
    }),
  };

  // Status query with auth check
  const { data, isLoading, error } = useQuery({
    queryKey: [APP_CONFIG.onboarding.queryKeys.status],
    queryFn: getStatus,
    enabled: authStatus === 'authenticated' && !!session?.user?.accessToken,
    staleTime: 30000,
    retry: (failureCount, error) => {
      // Don't retry on auth errors
      if (error?.response?.status === 401) return false;
      return failureCount < 3;
    },
    onError: (error) => {
      logger.error('Failed to fetch onboarding status:', error);
    },
  });

  return {
    status: data?.status,
    mutations: {
      step1: useMutation({
        onError: (error) => {
          logger.error('Step 1 error:', error);
          toast.error(error.message || 'Failed to save step 1');
        },
        onSuccess: () => {
          toast.success('Step 1 saved successfully');
        },
      }),
    },
    isLoading,
    error,
    isAuthenticated:
      authStatus === 'authenticated' && !!session?.user?.accessToken,
  };
}
