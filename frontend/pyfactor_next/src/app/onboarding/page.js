// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/page.js
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { CircularProgress, Typography, Box } from '@mui/material';
import { useOnboarding } from './contexts/onboardingContext';
import OnboardingStep1 from './step1/page';
import OnboardingStep2 from './step2/page';
import OnboardingStep3 from './step3/page';
import OnboardingStep4 from './step4/page';
import axiosInstance from '@/lib/axiosConfig';


export default function Onboarding() {
  const router = useRouter();
  const { status } = useSession();
  const { formData } = useOnboarding();

  // Use React Query for fetching onboarding status
  const { 
    data: onboardingData, 
    isLoading: statusLoading,
    error: statusError,
    refetch: refetchStatus
  } = useQuery({
    queryKey: ['onboardingStatus'],
    queryFn: async () => {
      try {
        const response = await axiosInstance.get('/api/onboarding/status/');
        return response.data;
      } catch (error) {
        console.error('Error fetching onboarding status:', error);
        throw error;
      }
    },
    enabled: status === 'authenticated', // Only run query when authenticated
    refetchOnWindowFocus: false,
    retry: 1
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    if (onboardingData?.onboarding_status === 'complete') {
      router.push('/dashboard');
    }
  }, [onboardingData?.onboarding_status, router]);

  if (statusLoading || status === 'loading') {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (statusError) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <Typography color="error">
          {statusError instanceof Error ? statusError.message : 'An error occurred'}
        </Typography>
      </Box>
    );
  }

  const renderStep = () => {
    const currentStep = onboardingData?.onboarding_status || 'step1';
    
    switch (currentStep) {
      case 'step1':
        return <OnboardingStep1 onComplete={() => refetchStatus()} />;
      case 'step2':
        return <OnboardingStep2 onComplete={() => refetchStatus()} />;
      case 'step3':
        return <OnboardingStep3 onComplete={() => refetchStatus()} />;
      case 'step4':
        return <OnboardingStep4 onComplete={() => refetchStatus()} />;
      default:
        return null;
    }
  };

  return (
    <Box sx={{ maxWidth: '100vw', minHeight: '100vh', p: 2 }}>
      {renderStep()}
    </Box>
  );
}