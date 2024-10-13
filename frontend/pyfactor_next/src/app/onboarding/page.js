'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useOnboarding } from '@/app/onboarding/contexts/onboardingContext';
import { CircularProgress, Typography } from '@mui/material';
import OnboardingStep1 from './step1/page';
import OnboardingStep2 from './step2/page';
import OnboardingStep3 from './step3/page';
import OnboardingStep4 from './step4/page';

export default function Onboarding() {
  const router = useRouter();
  const { status } = useSession();
  const { checkOnboardingStatus, loading, error, onboardingStatus } = useOnboarding();

  useEffect(() => {
    const handleOnboardingCheck = async () => {
      console.log('Checking onboarding status');
      if (status === 'authenticated') {
        console.log('User is authenticated, checking onboarding status');
        await checkOnboardingStatus();
      } else if (status === 'unauthenticated') {
        console.log('User is not authenticated, redirecting to sign in page');
        router.push('/auth/signin');
      }
    };

    handleOnboardingCheck();
  }, [status, checkOnboardingStatus, router]);

  useEffect(() => {
    if (onboardingStatus === 'complete') {
      router.push('/dashboard');
    }
  }, [onboardingStatus, router]);

  if (loading || status === 'loading') {
    return <CircularProgress />;
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  return (
    <>
      {onboardingStatus === 'step1' && <OnboardingStep1 />}
      {onboardingStatus === 'step2' && <OnboardingStep2 />}
      {onboardingStatus === 'step3' && <OnboardingStep3 />}
      {onboardingStatus === 'step4' && <OnboardingStep4 />}
    </>
  );
}