// src/app/onboarding/step1/page.js
'use client';

import { Suspense } from 'react';
import Step1WithErrorBoundary from '../components/Step1';
import { LoadingStateWithProgress } from '@/components/LoadingState';

// Add metadata for the step
const metadata = {
  title: 'Business Information',
  description: 'Tell us about your business',
  nextStep: 'step2',
  isRequired: true
};

export default function Step1Page() {
  return (
    <Suspense fallback={<LoadingStateWithProgress message="Loading Step 1..." />}>
      <Step1WithErrorBoundary metadata={metadata} />
    </Suspense>
  );
}