// src/app/onboarding/step3/page.js
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { OnboardingErrorBoundary } from '@/components/ErrorBoundary/OnboardingErrorBoundary';
import { LoadingStateWithProgress } from '@/components/LoadingState';
import { ErrorStep } from '@/components/ErrorStep';
import { logger } from '@/utils/logger';
import Step3 from '../components/Step3';
import { STEP_METADATA } from '../components/registry';

function Step3Content() {
  const router = useRouter();
  const { status } = useSession();

  // Authentication check
  if (status === 'unauthenticated') {
    router.replace('/auth/signin');
    return null;
  }

  // Loading check
  if (status === 'loading') {
    return <LoadingStateWithProgress message="Loading..." />;
  }

  return <Step3 metadata={STEP_METADATA.STEP3} onBack={() => router.push('/onboarding/step2')} />;
}

// Wrap with error boundary
export default function Step3Page() {
  return (
    <OnboardingErrorBoundary
      fallback={({ error, resetError }) => (
        <ErrorStep error={error} stepNumber={3} onRetry={resetError} />
      )}
    >
      <Step3Content />
    </OnboardingErrorBoundary>
  );
}
