// src/app/onboarding/step4/page.js
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { OnboardingErrorBoundary } from '@/components/ErrorBoundary/OnboardingErrorBoundary';
import { LoadingStateWithProgress } from '@/components/LoadingState';
import { ErrorStep } from '@/components/ErrorStep';
import { logger } from '@/utils/logger';
import Step4 from '../components/Step4';
import { STEP_METADATA } from '../components/registry';
import { STEP_VALIDATION } from '../constants/onboardingConstants';

function Step4Content() {
  const router = useRouter();
  const { status } = useSession();
  const { formData, validateStep } = useOnboarding();

  // Debug logging
  logger.info('Step4 page render:', {
    status,
    hasFormData: !!formData,
  });

  // Authentication check
  if (status === 'unauthenticated') {
    router.replace('/auth/signin');
    return null;
  }

  // Loading check
  if (status === 'loading') {
    return <LoadingStateWithProgress message="Loading..." />;
  }

  // Validation check
  if (!STEP_VALIDATION.step4(formData)) {
    router.replace('/onboarding/step3');
    return null;
  }

  return <Step4 metadata={STEP_METADATA.STEP4} onBack={() => router.push('/onboarding/step3')} />;
}
