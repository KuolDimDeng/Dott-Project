///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/success/page.js

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { OnboardingErrorBoundary } from '@/components/ErrorBoundary/OnboardingErrorBoundary';
import { LoadingStateWithProgress } from '@/components/LoadingState';
import { ErrorStep } from '@/components/ErrorStep';
import { useOnboarding } from '../hooks/useOnboarding';
import { axiosInstance } from '@/lib/axiosConfig';
import { useToast } from '@/components/Toast/ToastProvider';
import { logger } from '@/utils/logger';

function OnboardingSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const {
    saveStep,
    loading: storeLoading,
    error: storeError,
    initialized,
    initialize
  } = useOnboarding();

  const sessionId = searchParams.get('session_id');
  const [verifying, setVerifying] = useState(false);

  // Handle payment verification
  useEffect(() => {
    if (!sessionId || !initialized) return;

    const verifyPayment = async () => {
      try {
        setVerifying(true);
        const response = await axiosInstance.get(`/api/checkout/session/${sessionId}`);

        await saveStep('step3', {
          paymentVerified: true,
          sessionId: sessionId
        });

        toast.success('Payment verified successfully');
        router.push('/onboarding/step4');
      } catch (error) {
        logger.error('Payment verification failed:', error);
        toast.error('Failed to verify payment');
        router.push('/onboarding/step3');
      } finally {
        setVerifying(false);
      }
    };

    verifyPayment();
  }, [sessionId, initialized, saveStep, router]);

  // Auth check
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth/signin');
    }
  }, [status, router]);

  if (!initialized || storeLoading || verifying) {
    return <LoadingStateWithProgress message="Verifying payment..." />;
  }

  if (storeError) {
    return (
      <ErrorStep 
        error={storeError}
        stepNumber={3}
        onRetry={() => router.push('/onboarding/step3')}
      />
    );
  }

  return null;
}

export default function OnboardingSuccess() {
  return (
    <OnboardingErrorBoundary
      fallback={({ error, resetError }) => (
        <ErrorStep 
          error={error}
          stepNumber={3}
          onRetry={() => {
            resetError();
            router.push('/onboarding/step3');
          }}
        />
      )}
    >
      <OnboardingSuccessContent />
    </OnboardingErrorBoundary>
  );
}