// src/app/onboarding/page.js
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { OnboardingErrorBoundary } from '@/components/ErrorBoundary/OnboardingErrorBoundary';
import { LoadingStateWithProgress } from '@/components/LoadingState';
import { ErrorStep } from '@/components/ErrorStep';
import { useOnboarding } from './hooks/useOnboarding';
import { logger } from '@/utils/logger';
import { STEP_ROUTES } from './constants/onboardingConstants';

function OnboardingContent() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isInitializing, setIsInitializing] = useState(false);
  const [initializationAttempts, setInitializationAttempts] = useState(0);

  // Add form methods with proper initial state
  const methods = useForm({
    defaultValues: {
      selectedPlan: '',
      billingCycle: 'monthly',
    },
  });

  const {
    currentStep,
    loading: storeLoading,
    error: storeError,
    initialized,
    initialize,
    progress,
  } = useOnboarding(methods);

  // Enhanced initialization effect with retry logic
  useEffect(() => {
    let mounted = true;
    let timeoutId;

    const initStore = async () => {
      if (!initialized && !isInitializing && status === 'authenticated') {
        try {
          setIsInitializing(true);
          await initialize();

          if (mounted) {
            logger.debug('Store initialization complete', {
              currentStep,
              initialized: true,
              attempts: initializationAttempts,
            });
          }
        } catch (error) {
          logger.error('Store initialization failed:', {
            error,
            attempts: initializationAttempts,
          });

          // Add retry logic with exponential backoff
          if (initializationAttempts < 3) {
            const delay = Math.pow(2, initializationAttempts) * 1000;
            timeoutId = setTimeout(() => {
              if (mounted) {
                setInitializationAttempts((prev) => prev + 1);
              }
            }, delay);
          }
        } finally {
          if (mounted) {
            setIsInitializing(false);
          }
        }
      }
    };

    initStore();

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [initialize, initialized, isInitializing, status, currentStep, initializationAttempts]);

  // Enhanced loading state with more context
  if (!initialized || storeLoading || isInitializing) {
    const message = isInitializing
      ? `Initializing... (Attempt ${initializationAttempts + 1}/3)`
      : !initialized && status === 'authenticated'
        ? 'Loading your information...'
        : `${progress?.currentStep || 'Preparing'} (${progress?.progress || 0}%)`;

    logger.debug('Loading state:', {
      message,
      initialized,
      storeLoading,
      isInitializing,
      status,
      progress,
    });

    return (
      <LoadingStateWithProgress
        message={message}
        progress={progress?.progress || 0}
        isIndeterminate={!progress?.progress}
      />
    );
  }

  // Enhanced error handling
  if (storeError) {
    logger.error('Store error:', {
      error: storeError,
      currentStep,
      initializationAttempts,
    });

    return (
      <ErrorStep
        error={storeError}
        stepNumber={currentStep?.replace('step', '') || 1}
        onRetry={() => {
          logger.debug('Retrying initialization');
          setInitializationAttempts(0);
          setIsInitializing(false);
          initialize();
        }}
      />
    );
  }

  return null;
}

export default function OnboardingPage() {
  return (
    <OnboardingErrorBoundary
      fallback={({ error, resetError }) => (
        <ErrorStep error={error} stepNumber={1} onRetry={resetError} />
      )}
    >
      <OnboardingContent />
    </OnboardingErrorBoundary>
  );
}
