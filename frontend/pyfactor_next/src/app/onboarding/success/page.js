///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/success/page.js
'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useOnboarding } from '../contexts/onboardingContext';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axiosConfig'; // Update import path
import { logger } from '@/utils/logger';

const OnboardingSuccess = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const { saveStep4Data } = useOnboarding();

  // Query to verify stripe session
  const { data, isLoading, error } = useQuery({
    queryKey: ['stripeSession', searchParams.get('session_id')],
    queryFn: async () => {
      const sessionId = searchParams.get('session_id');
      if (!sessionId) {
        throw new Error('No session ID provided');
      }

      try {
        const response = await axiosInstance.get(`/api/onboarding/save-step4/?session_id=${sessionId}`, {
          headers: {
            Authorization: `Bearer ${session?.user?.accessToken}`
          }
        });
        return response.data;
      } catch (error) {
        logger.error('Error verifying stripe session:', error);
        throw error;
      }
    },
    enabled: !!searchParams.get('session_id') && !!session?.user?.accessToken,
    retry: 1,
    onSuccess: () => {
      queryClient.invalidateQueries(['onboardingStatus']);
      router.push('/onboarding/step4');
    },
    onError: (error) => {
      logger.error('Error in stripe session verification:', error);
    }
  });

  // Mutation for completing onboarding
  const completeMutation = useMutation({
    mutationFn: async () => {
      const response = await axiosInstance.post('/api/onboarding/success/', {
        sessionId: searchParams.get('session_id')
      }, {
        headers: {
          Authorization: `Bearer ${session?.user?.accessToken}`
        }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['onboardingStatus']);
      router.push('/dashboard');
    },
    onError: (error) => {
      logger.error('Error completing onboarding:', error);
    }
  });

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (!sessionId) {
      router.push('/onboarding/step3');
    }
  }, [searchParams, router]);

  if (isLoading || completeMutation.isPending) {
    return (
      <Box 
        display="flex" 
        flexDirection="column"
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        gap={2}
      >
        <CircularProgress />
        <Typography variant="h6">
          Completing your subscription...
        </Typography>
      </Box>
    );
  }

  if (error || completeMutation.error) {
    return (
      <Box 
        display="flex" 
        flexDirection="column"
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        gap={2}
        p={3}
      >
        <Alert 
          severity="error" 
          sx={{ width: '100%', maxWidth: 500 }}
        >
          {error?.message || completeMutation.error?.message || 'An error occurred'}
        </Alert>
        <Typography 
          variant="body2" 
          color="text.secondary"
          align="center"
        >
          Please try again or contact support if the problem persists.
        </Typography>
      </Box>
    );
  }

  return null;
};

export default OnboardingSuccess;