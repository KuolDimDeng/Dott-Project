// src/app/onboarding/business-info/page.js
'use client';

import React, { useEffect } from 'react';
import { BusinessInfo } from '@/app/onboarding/components/steps/BusinessInfo/BusinessInfo';
import { STEP_METADATA } from '@/app/onboarding/components/registry';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useOnboarding } from '@/app/onboarding/hooks/useOnboarding';
import { logger } from '@/utils/logger';
// Update this import
import OnboardingLayout from '@/app/onboarding/layout';
import { LoadingStateWithProgress } from '@/components/LoadingState/LoadingStateWithProgress';
import { useForm } from 'react-hook-form';

const defaultMetadata = {
  title: 'Business Information',
  description: 'Tell us about your business to get started',
  nextStep: '/onboarding/subscription',
  prevStep: null
};

const BusinessInfoPage = () => {
  const formMethods = useForm({
    mode: 'onChange',
    defaultValues: {
      businessName: '',
      industry: '',
      country: '',
      legalStructure: '',
      dateFounded: '',
      firstName: '',
      lastName: ''
    }
  });

  const {
    formData,
    isLoading,
    error,
    initialized,
    initialize,
    saveStep,
    onboardingManager,
    formManager
  } = useOnboarding(formMethods);

  useEffect(() => {
    const initPage = async () => {
      try {
        logger.debug('Initializing business info page');
        await initialize();
        
        if (formData['business-info']) {
          formMethods.reset(formData['business-info']);
        }

        await onboardingManager.setCurrentStep('business-info', {
          status: 'in_progress'
        });

      } catch (error) {
        logger.error('Failed to initialize business info page:', error);
      }
    };

    if (!initialized) {
      initPage();
    }
  }, [initialized, initialize, formData, formMethods, onboardingManager]);

  const handleSubmit = async (data) => {
    try {
      logger.debug('Submitting business info:', {
        hasData: !!data,
        fields: Object.keys(data)
      });

      // Start form save
      await formManager.startSave();

      // Save step data
      await saveStep('business-info', {
        businessName: data.businessName,
        industry: data.industry,
        country: data.country,
        legalStructure: data.legalStructure,
        dateFounded: data.dateFounded,
        firstName: data.firstName,
        lastName: data.lastName
      });

      // Complete save operations
      await formManager.completeSave();
      await onboardingManager.completeStep('business-info', data);

    } catch (error) {
      logger.error('Failed to save business info:', error);
      throw error; // Let ErrorBoundary handle it
    }
  };

  if (isLoading) {
    return (
      <OnboardingLayout>
        <LoadingStateWithProgress
          message="Setting up your business profile..."
          isLoading={true}
          image={{
            src: '/static/images/Pyfactor.png',
            alt: 'Pyfactor Logo',
            width: 150,
            height: 100
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
          error={error}
          onRetry={() => {
            initialize();
          }}
          image={{
            src: '/static/images/Pyfactor.png',
            alt: 'Pyfactor Logo',
            width: 150,
            height: 100
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
          formMethods={formMethods}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          error={error}
        />
      </OnboardingLayout>
    </ErrorBoundary>
  );
};

// Export the default component correctly
export default BusinessInfoPage;