///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/business-info/page.js
'use client';

import React, { useEffect } from 'react';
import { BusinessInfo } from '@/app/onboarding/components/steps/BusinessInfo/BusinessInfo';
import { STEP_METADATA } from '@/app/onboarding/components/registry';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useOnboarding } from '@/app/onboarding/hooks/useOnboarding';
import { logger } from '@/utils/logger';
import OnboardingLayout from '@/app/onboarding/layout';
import { LoadingStateWithProgress } from '@/components/LoadingState/LoadingStateWithProgress';

const defaultMetadata = {
  title: 'Business Information',
  description: 'Tell us about your business to get started',
  next_step: '/onboarding/subscription',
  prevStep: null,
};

const BusinessInfoPage = () => {
  const { isLoading, error, currentStep, submitBusinessInfo } = useOnboarding();

  useEffect(() => {
    const logPageLoad = () => {
      const requestId = crypto.randomUUID();
      logger.debug('Business info page loaded', {
        requestId,
        currentStep,
        isLoading,
      });
    };

    logPageLoad();
  }, [currentStep, isLoading]);

  if (isLoading) {
    return (
      <OnboardingLayout>
        <LoadingStateWithProgress
          message="Preparing your business profile..."
          isLoading={true}
          image={{
            src: '/static/images/Pyfactor.png',
            alt: 'Pyfactor Logo',
            width: 150,
            height: 100,
          }}
        />
      </OnboardingLayout>
    );
  }

  if (error) {
    return (
      <OnboardingLayout>
        <LoadingStateWithProgress
          message="Error loading business profile"
          isLoading={false}
          error={error.message || 'An unexpected error occurred'}
          onRetry={() => window.location.reload()}
          image={{
            src: '/static/images/Pyfactor.png',
            alt: 'Pyfactor Logo',
            width: 150,
            height: 100,
          }}
        />
      </OnboardingLayout>
    );
  }

  return (
    <ErrorBoundary>
      <OnboardingLayout>
        <BusinessInfo
          metadata={STEP_METADATA.BUSINESS_INFO || defaultMetadata}
          onSubmit={submitBusinessInfo}
        />
      </OnboardingLayout>
    </ErrorBoundary>
  );
};

export default BusinessInfoPage;
