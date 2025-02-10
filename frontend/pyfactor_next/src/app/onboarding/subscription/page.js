'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { Subscription } from '../components/steps/Subscription';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LoadingStateWithProgress } from '@/components/LoadingState';
import { logger } from '@/utils/logger';
import { useOnboarding } from '@/hooks/useOnboarding';
import { onboardingApi, makeRequest } from '@/services/api/onboarding';
import { useToast } from '@/components/Toast/ToastProvider';
import { generateRequestId } from '@/lib/authUtils';

const ErrorFallback = ({ error, resetErrorBoundary }) => (
  <div className="flex flex-col items-center justify-center min-h-screen p-4">
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md">
      <h2 className="text-red-800 font-semibold mb-2">Something went wrong</h2>
      <p className="text-red-600 mb-4">{error.message}</p>
      <div className="flex gap-4">
        <button
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-red-100 text-red-800 rounded hover:bg-red-200"
        >
          Try Again
        </button>
        <button
          onClick={() => (window.location.href = '/onboarding/business-info')}
          className="px-4 py-2 bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
        >
          Back to Business Info
        </button>
      </div>
    </div>
  </div>
);

// Error handling helper function
const handleAccessError = (error, requestId, router, toast) => {
  logger.error('Access validation error:', {
    requestId,
    error: error.message,
    status: error.response?.status,
  });

  if (error.response?.status === 401) {
    toast.error('Session expired. Please sign in again.');
    router.replace('/auth/signin');
    return;
  }

  toast.error('Failed to validate access');
  router.replace('/onboarding/business-info');
};

function SubscriptionPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();
  const { validateStep } = useOnboarding();
  const requestId = React.useRef(generateRequestId()).current;

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        setIsLoading(true);
      }}
    >
      <div className="min-h-screen bg-gray-50">
        <Subscription
          metadata={{
            title: 'Choose Your Plan',
            description:
              'Select the subscription plan that best fits your needs',
            next_step: 'payment',
            prevStep: 'business-info',
          }}
        />
      </div>
    </ErrorBoundary>
  );
}

export default SubscriptionPage;
