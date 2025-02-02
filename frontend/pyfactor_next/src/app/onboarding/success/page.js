'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { OnboardingErrorBoundary } from '@/components/ErrorBoundary/OnboardingErrorBoundary';
import { LoadingStateWithProgress } from '@/components/LoadingState';
import { ErrorStep } from '@/components/ErrorStep';
import { useOnboarding } from '@/app/onboarding/contexts/OnboardingContext';
import { onboardingApi, makeRequest } from '@/services/api/onboarding';
import { useToast } from '@/components/Toast/ToastProvider';
import { logger } from '@/utils/logger';
import { generateRequestId } from '@/lib/authUtils';

function OnboardingSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const { updateFormData } = useOnboarding();
  const toast = useToast();
  const [isVerifying, setIsVerifying] = useState(false);
  const requestId = generateRequestId();

  const session_id = searchParams.get('session_id');

  useEffect(() => {
    const verifyPayment = async () => {
      if (!session_id || !session?.user?.accessToken) return;

      try {
        setIsVerifying(true);
        logger.debug('Starting payment verification:', {
          requestId,
          session_id
        });

        // Verify payment status
        const verificationResult = await makeRequest(
          onboardingApi.updateStep(
            session.user.accessToken,
            'payment',
            {
              payment_verified: true,
              session_id,
              request_id: requestId
            }
          )
        );

        // Update onboarding status
        await makeRequest(
          onboardingApi.updateStatus(
            session.user.accessToken,
            {
              current_step: 'payment',
              next_step: 'setup',
              form_data: {
                payment_verified: true,
                session_id
              },
              request_id: requestId
            }
          )
        );

        // Update context data
        updateFormData({
          payment_verified: true,
          session_id
        });

        logger.debug('Payment verification successful:', {
          requestId,
          status: verificationResult.status
        });

        toast.success('Payment verified successfully');
        await router.replace('/onboarding/setup');

      } catch (error) {
        logger.error('Payment verification failed:', {
          requestId,
          error: error.message,
          session_id
        });
        
        toast.error('Failed to verify payment. Please try again.');
        await router.replace('/onboarding/payment');

      } finally {
        setIsVerifying(false);
      }
    };

    verifyPayment();
  }, [session_id, session, router, toast, updateFormData, requestId]);

  // Auth check
  useEffect(() => {
    if (status === 'unauthenticated') {
      logger.debug('Unauthenticated user, redirecting:', {
        requestId,
        status
      });
      router.replace('/auth/signin?callbackUrl=/onboarding/success');
    }
  }, [status, router, requestId]);

  if (status === 'loading' || isVerifying) {
    return <LoadingStateWithProgress message="Verifying payment..." />;
  }

  // Return null as this is just a processing page
  return null;
}

function OnboardingSuccess() {
  const router = useRouter();

  return (
    <OnboardingErrorBoundary
      fallback={({ error, resetError }) => (
        <ErrorStep
          error={error}
          stepNumber={3}
          onRetry={async () => {
            resetError();
            await router.replace('/onboarding/payment');
          }}
        />
      )}
    >
      <OnboardingSuccessContent />
    </OnboardingErrorBoundary>
  );
}

export default OnboardingSuccess;