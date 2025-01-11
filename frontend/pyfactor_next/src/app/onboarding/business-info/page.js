// src/app/onboarding/business-info/page.js
'use client';

import React from 'react';
import { BusinessInfo } from '../components/steps/BusinessInfo';  // This should now work
import { STEP_METADATA } from '../components/registry';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const BusinessInfoPage = () => {
  return (
    <ErrorBoundary>
      <BusinessInfo 
        metadata={STEP_METADATA.BUSINESS_INFO || {
          title: 'Business Information',
          description: 'Tell us about your business to get started',
          nextStep: '/onboarding/subscription',
          prevStep: null
        }} 
      />
    </ErrorBoundary>
  );
};

export default BusinessInfoPage;