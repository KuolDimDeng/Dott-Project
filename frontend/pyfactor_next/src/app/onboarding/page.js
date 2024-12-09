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
  const { status } = useSession();
  const [isInitializing, setIsInitializing] = useState(false);

  // Add form methods
  const methods = useForm({
    defaultValues: {
      selectedPlan: '',
      billingCycle: 'monthly'
    }
  });

  const {
    currentStep,
    loading: storeLoading,
    error: storeError,
    initialized,
    initialize
  } = useOnboarding(methods);

  // Initialization effect
  useEffect(() => {
    let mounted = true;

    const initStore = async () => {
      if (!initialized && !isInitializing && status === 'authenticated') {
        try {
          setIsInitializing(true);
          await initialize();
          
          if (mounted) {
            logger.debug('Store initialization complete', {
              currentStep,
              initialized: true
            });
          }
        } catch (error) {
          logger.error('Store initialization failed:', error);
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
    };
  }, [initialize, initialized, isInitializing, status, currentStep]);

  // State logging effect
  useEffect(() => {
    logger.debug('Page state updated:', {
      initialized,
      isInitializing,
      storeLoading,
      currentStep,
      status
    });
  }, [initialized, isInitializing, storeLoading, currentStep, status]);

  // Authentication effect
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth/signin');
    }
  }, [status, router]);

  // Routing effect
  useEffect(() => {
    if (status === 'authenticated' && initialized && currentStep) {
      const route = STEP_ROUTES[currentStep] || STEP_ROUTES.step1;
      logger.debug('Routing to:', { route, currentStep });
      router.replace(route);
    }
  }, [status, initialized, currentStep, router]);

  if (!initialized || storeLoading || isInitializing) {
    const message = isInitializing ? "Initializing..." :
                   !initialized && status === 'authenticated' ? "Loading..." :
                   "Preparing...";
    
    logger.debug('Loading state:', { 
      message,
      initialized,
      storeLoading,
      isInitializing,
      status 
    });
    
    return <LoadingStateWithProgress message={message} />;
  }
  if (storeError) {
    logger.error('Store error:', storeError);
    return (
      <ErrorStep
        error={storeError}
        stepNumber={1}
        onRetry={() => {
          logger.debug('Retrying initialization');
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
        <ErrorStep
          error={error}
          stepNumber={1}
          onRetry={resetError}
        />
      )}
    >
      <OnboardingContent />
    </OnboardingErrorBoundary>
  );
}