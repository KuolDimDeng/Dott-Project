///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/subscription/page.js
'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useOnboarding } from '@/app/onboarding/hooks/useOnboarding';
import { ONBOARDING_STATES } from '@/app/onboarding/state/OnboardingStateManager';
import Subscription from '@/app/onboarding/components/steps/Subscription/Subscription';
import ErrorBoundary from '@/components/ErrorBoundary/ErrorBoundary';
import { generateRequestId } from '@/lib/authUtils';
import { logger } from '@/utils/logger';

function SubscriptionPage() {
  const router = useRouter();
  const { currentStep, isLoading } = useOnboarding();

  useEffect(() => {
    logger.info('[SubscriptionPage] Mounted with request ID:', generateRequestId());

    if (isLoading) {
      return;
    }

    // Only redirect if we're not in business-info or subscription step
    // Normalize currentStep to uppercase for comparison with ONBOARDING_STATES constants
    const normalizedCurrentStep = currentStep?.toUpperCase();
    if (normalizedCurrentStep !== ONBOARDING_STATES.BUSINESS_INFO && normalizedCurrentStep !== ONBOARDING_STATES.SUBSCRIPTION) {
      if (currentStep === ONBOARDING_STATES.COMPLETE) {
        router.push('/onboarding/complete');
      } else if (!currentStep || currentStep === ONBOARDING_STATES.NOT_STARTED) {
        router.push('/onboarding');
      }
    }
  }, [currentStep, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <ErrorBoundary context="subscription-page">
      <div className="min-h-screen bg-gray-50">
        <Subscription
          metadata={{
            requestId: generateRequestId(),
            timestamp: new Date().toISOString()
          }}
        />
      </div>
    </ErrorBoundary>
  );
}

export default SubscriptionPage;
