// /src/app/onboarding/step2/page.js
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { OnboardingErrorBoundary } from '@/components/ErrorBoundary/OnboardingErrorBoundary';
import { LoadingStateWithProgress } from '@/components/LoadingState';
import { ErrorStep } from '@/components/ErrorStep';
import { logger } from '@/utils/logger';
import Step2 from '../components/Step2';
import { STEP_METADATA, STEP_NAMES } from '../components/registry';

function Step2Content() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Get metadata from registry using proper key
  const metadata = STEP_METADATA[STEP_NAMES.STEP2];

  // Enhanced debug logging
  logger.info('Step2 page render:', {
    status,
    hasSession: !!session,
    userId: session?.user?.id,
    hasMetadata: !!metadata,
  });

  // Metadata validation
  if (!metadata) {
    logger.error('Missing metadata for Step2');
    return <ErrorStep error="Configuration error: Missing step metadata" stepNumber={2} />;
  }

  // Authentication check with proper redirect
  if (status === 'unauthenticated') {
    logger.warn('Unauthenticated access attempt to Step2');
    router.replace('/auth/signin');
    return null;
  }

  // Loading check with more informative state
  if (status === 'loading') {
    return <LoadingStateWithProgress message="Verifying your session..." progress={50} />;
  }

  return (
    <Step2 metadata={metadata} onBack={() => router.push('/onboarding/step1')} session={session} />
  );
}

export default function Step2Page() {
  return (
    <OnboardingErrorBoundary
      fallback={({ error, resetError }) => (
        <ErrorStep error={error} stepNumber={2} onRetry={resetError} />
      )}
    >
      <Step2Content />
    </OnboardingErrorBoundary>
  );
}
