'use client';

import React, { useEffect, useState, memo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { useForm } from 'react-hook-form';
import { ErrorBoundary } from '@/components/ErrorBoundary/ErrorBoundary';
import { validateSession } from '@/utils/onboardingUtils';
import { LoadingStateWithProgress } from '@/components/LoadingState';
import { useOnboarding } from './hooks/useOnboarding';
import { logger } from '@/utils/logger';
import PropTypes from 'prop-types';
import LoadingSpinner from '@/components/LoadingSpinner';

// Onboarding-specific error fallback
const OnboardingErrorFallback = memo(function OnboardingErrorFallback({
  error,
  resetErrorBoundary,
  stepNumber = 1,
}) {
  const [isResetting, setIsResetting] = React.useState(false);
  const errorId = React.useRef(crypto.randomUUID()).current;

  React.useEffect(() => {
    logger.error('Onboarding error occurred:', {
      errorId,
      stepNumber,
      error: error?.message,
      stack: error?.stack,
    });
  }, [error, stepNumber, errorId]);

  const handleReset = async () => {
    try {
      setIsResetting(true);
      await resetErrorBoundary();
    } catch (error) {
      logger.error('Onboarding reset failed:', {
        errorId,
        error: error.message,
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="flex flex-col justify-center items-center min-h-screen p-6 gap-4">
      <div className="max-w-lg w-full bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 relative">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium">Error in Step {stepNumber}</h3>
            <div className="mt-2 text-sm">
              {error?.message || 'Failed to load onboarding'}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              isResetting ? 'bg-gray-300 cursor-not-allowed' : 'bg-red-100 text-red-800 hover:bg-red-200'
            }`}
            onClick={handleReset}
            disabled={isResetting}
          >
            {isResetting ? (
              <div className="flex items-center">
                <div className="w-4 h-4 mr-2">
                  <LoadingSpinner size="small" />
                </div>
                <span>Processing...</span>
              </div>
            ) : (
              'Try Again'
            )}
          </button>
        </div>
      </div>
      <div className="text-sm text-gray-500 text-center">
        Please try again or contact support if the problem persists.
        <br />
        Error Reference: {errorId}
      </div>
    </div>
  );
});

// Main onboarding content component
const OnboardingContent = memo(function OnboardingContent() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isInitializing, setIsInitializing] = useState(false);
  const [initializationAttempts, setInitializationAttempts] = useState(0);
  const requestIdRef = React.useRef(crypto.randomUUID());

  const methods = useForm({
    defaultValues: {
      selected_plan: '',
      billingCycle: 'monthly',
      tier: '',
    },
  });

  const {
    current_step,
    loading: storeLoading,
    error: storeError,
    initialized,
    initialize,
    progress,
    selected_plan,
  } = useOnboarding(methods);

  useEffect(() => {
    let mounted = true;
    let timeoutId;

    const initStore = async () => {
      if (!initialized && !isInitializing && status === 'authenticated') {
        try {
          setIsInitializing(true);

          logger.info('Starting store initialization', {
            requestId: requestIdRef.current,
            attempt: initializationAttempts + 1,
            tier: selected_plan,
          });

          await initialize();

          if (mounted) {
            logger.debug('Store initialization complete', {
              requestId: requestIdRef.current,
              current_step,
              initialized: true,
              tier: selected_plan,
            });
          }
        } catch (error) {
          logger.error('Store initialization failed:', {
            requestId: requestIdRef.current,
            error: error.message,
            attempt: initializationAttempts + 1,
            tier: selected_plan,
          });

          if (initializationAttempts < 3) {
            const delay = Math.pow(2, initializationAttempts) * 1000;
            timeoutId = setTimeout(() => {
              if (mounted) {
                setInitializationAttempts((prev) => prev + 1);
              }
            }, delay);
          }
        } finally {
          if (mounted) {
            setIsInitializing(false);
          }
        }
      }
    };

    initStore();

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [
    initialize,
    initialized,
    isInitializing,
    status,
    current_step,
    initializationAttempts,
    selected_plan,
  ]);

  if (!initialized || storeLoading || isInitializing) {
    const message = isInitializing
      ? `Initializing... (Attempt ${initializationAttempts + 1}/3)`
      : !initialized && status === 'authenticated'
        ? 'Loading your information...'
        : `${progress?.current_step || 'Preparing'} ${
            selected_plan ? `(${selected_plan} tier)` : ''
          } (${progress?.progress || 0}%)`;

    return (
      <LoadingStateWithProgress
        message={message}
        progress={progress?.progress || 0}
        isIndeterminate={!progress?.progress}
        tier={selected_plan}
      />
    );
  }

  if (storeError) {
    throw new Error(storeError.message || 'Failed to initialize onboarding', {
      cause: storeError,
    });
  }

  // Instead of returning null, redirect to the appropriate step
  const currentStepLower = current_step?.toLowerCase().replace('_', '-');
  
  // If we're on the main onboarding page, redirect to the appropriate step
  useEffect(() => {
    if (currentStepLower && router) {
      // Check if we're already on the correct page to avoid redirect loops
      const currentPath = window.location.pathname;
      const targetPath = `/onboarding/${currentStepLower}`;
      
      // Only redirect if we're actually on the /onboarding page and not already on the target page
      if (currentPath === '/onboarding' && currentPath !== targetPath) {
        logger.info(`[Onboarding] Redirecting from ${currentPath} to step: ${targetPath}`);
        router.push(targetPath);
      } else {
        logger.debug(`[Onboarding] No redirect needed: current=${currentPath}, target=${targetPath}`);
      }
    }
  }, [currentStepLower, router]);
  
  // Show loading while redirecting
  return (
    <div className="flex flex-col justify-center items-center min-h-screen p-6 gap-4">
      <h2 className="text-xl font-semibold text-center mb-4">
        Redirecting to {currentStepLower || 'your next step'}...
      </h2>
      <LoadingSpinner size="large" />
    </div>
  );
});

// Main page component with error boundary
export default function OnboardingPage() {
  const handleRecovery = async () => {
    const recoveryId = crypto.randomUUID();

    logger.info('Starting onboarding recovery', {
      recoveryId,
      tier: selected_plan,
    });

    try {
      // Get auth tokens
      const { tokens } = await validateSession();
      if (!tokens?.accessToken || !tokens?.idToken) {
        throw new Error('No valid session tokens');
      }

      const accessToken = tokens.accessToken.toString();
      const idToken = tokens.idToken.toString();

      await fetch('/api/onboarding/reset', {
        method: 'POST',
        headers: {
          'x-recovery-id': recoveryId,
          'x-subscription-tier': selected_plan,
          'Authorization': `Bearer ${accessToken}`,
          'X-Id-Token': idToken
        },
      });

      logger.info('Onboarding recovery successful', {
        recoveryId,
        tier: selected_plan,
      });
      return true;
    } catch (error) {
      logger.error('Onboarding recovery failed', {
        recoveryId,
        error: error.message,
        tier: selected_plan,
      });
      return false;
    }
  };

  return (
    <ErrorBoundary
      componentName="Onboarding"
      onReset={handleRecovery}
      FallbackComponent={OnboardingErrorFallback}
    >
      <OnboardingContent />
    </ErrorBoundary>
  );
}

// PropTypes definitions
OnboardingErrorFallback.propTypes = {
  error: PropTypes.shape({
    message: PropTypes.string,
    stack: PropTypes.string,
  }),
  resetErrorBoundary: PropTypes.func.isRequired,
  stepNumber: PropTypes.number,
};

OnboardingContent.propTypes = {};
