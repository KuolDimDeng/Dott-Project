///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/subscription/page.js
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Subscription } from '../components/steps/Subscription';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LoadingStateWithProgress } from '@/components/LoadingState';
import { logger } from '@/utils/logger';
import { useOnboarding } from '@/app/onboarding/contexts/OnboardingContext';
import { validateSessionState } from '@/lib/authUtils';
import { useToast } from '@/components/Toast/ToastProvider';

// Add a custom fallback component
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
            onClick={() => window.location.href = '/onboarding/business-info'}
            className="px-4 py-2 bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
          >
            Back to Business Info
          </button>
        </div>
      </div>
    </div>
  );


function SubscriptionPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [isAccessChecked, setIsAccessChecked] = useState(false);
  const [error, setError] = useState(null);
  const { canNavigateToStep } = useOnboarding();
  const toast = useToast();
  const requestId = React.useRef(crypto.randomUUID()).current;

  const validateAccess = useCallback(async () => {
    if (status === 'loading' || isAccessChecked) return;

    try {
      logger.debug('Starting subscription access validation:', {
        requestId,
        status,
        onboardingStatus: session?.user?.onboardingStatus,
        currentStep: session?.user?.currentStep,
        pathname: '/onboarding/subscription'
      });

      // Handle unauthenticated state
      if (status === 'unauthenticated') {
        logger.debug('User not authenticated, redirecting to signin', { requestId });
        router.replace('/auth/signin?callbackUrl=/onboarding/subscription');
        return;
      }

      // Validate session state
      const sessionValidation = await validateSessionState(session, requestId);
      
      if (!sessionValidation.isValid) {
        logger.debug('Invalid session state:', {
          requestId,
          reason: sessionValidation.reason,
          redirectTo: sessionValidation.redirectTo
        });
        
        if (sessionValidation.redirectTo) {
          router.replace(sessionValidation.redirectTo);
        }
        return;
      }

      // Check current status from session
      const currentStatus = session?.user?.onboardingStatus;
      const canAccessSubscription = currentStatus === 'subscription' || 
                                  currentStatus === 'business-info';

      if (canAccessSubscription) {
        logger.debug('Access allowed based on session:', { 
          requestId,
          currentStatus 
        });
        setIsLoading(false);
        setIsAccessChecked(true);
        return;
      }

      // Verify step access
      const canNavigate = await canNavigateToStep('subscription');
      
      if (!canNavigate) {
        logger.debug('Cannot navigate to subscription, redirecting:', {
          requestId,
          currentStatus,
          targetStep: 'subscription'
        });
        router.replace('/onboarding/business-info');
        return;
      }

      // Refresh session data
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to refresh session');
      }

      const freshSession = await response.json();
      
      logger.debug('Fresh session state:', {
        requestId,
        currentStatus: freshSession?.user?.onboardingStatus,
        step: freshSession?.user?.currentStep
      });

      // Final access check
      if (freshSession?.user?.onboardingStatus === 'subscription' || 
          freshSession?.user?.onboardingStatus === 'business-info') {
        setIsLoading(false);
        setIsAccessChecked(true);
      } else {
        router.replace('/onboarding/business-info');
      }

    } catch (err) {
      logger.error('Subscription access validation failed:', {
        requestId,
        error: err.message,
        stack: err.stack
      });
      
      setError(err.message);
      setIsLoading(false);
      setIsAccessChecked(true);
      toast.error('Failed to validate access. Please try again.');
    }
  }, [status, session, router, canNavigateToStep, requestId, isAccessChecked, toast]);

  // Initial validation
  useEffect(() => {
    validateAccess();
  }, [validateAccess]);

  // Session state monitor
  useEffect(() => {
    logger.debug('Subscription page session state:', {
      requestId,
      status,
      hasSession: !!session,
      onboardingStatus: session?.user?.onboardingStatus,
      isLoading,
      isAccessChecked
    });
  }, [session, status, isLoading, isAccessChecked, requestId]);

  useEffect(() => {
    const validateAccess = async () => {
      try {
        if (status === 'loading' || isAccessChecked) return;
  
        logger.debug('Checking subscription access:', {
          status,
          onboardingStatus: session?.user?.onboardingStatus,
          currentStep: session?.user?.currentStep
        });
  
        // Only fetch fresh session if needed
        const response = await fetch('/api/auth/session');
        const freshSession = await response.json();
  
        logger.debug('Fresh session state:', {
          currentStatus: freshSession?.user?.onboardingStatus,
          step: freshSession?.user?.currentStep
        });
  
        const canAccess = freshSession?.user?.onboardingStatus === 'subscription' || 
                         freshSession?.user?.onboardingStatus === 'business-info';
  
        if (!canAccess) {
          logger.debug('Access denied to subscription page:', {
            currentStatus: freshSession?.user?.onboardingStatus
          });
          router.replace('/onboarding/business-info');
        }
  
      } catch (error) {
        logger.error('Access validation failed:', {
          error: error.message
        });
        setError(error.message);
      }
    };
  
    validateAccess();
  }, [status, session, router, isAccessChecked]);

  if (status === 'loading' || (isLoading && !isAccessChecked)) {
    return <LoadingStateWithProgress message="Loading subscription options..." />;
  }

  const hasValidAccess = status === 'authenticated' && 
    (session?.user?.onboardingStatus === 'subscription' || 
     session?.user?.onboardingStatus === 'business-info');

  if (!hasValidAccess) {
    return <LoadingStateWithProgress message="Verifying access..." />;
  }

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        setError(null);
        setIsAccessChecked(false);
        validateAccess();
      }}
    >
      <div className="min-h-screen bg-gray-50">
        <Subscription 
          metadata={{
            title: 'Choose Your Plan',
            description: 'Select the subscription plan that best fits your needs',
            nextStep: '/onboarding/payment',
            prevStep: '/onboarding/business-info'
          }}
        />
      </div>
    </ErrorBoundary>
  );
}

export default SubscriptionPage;