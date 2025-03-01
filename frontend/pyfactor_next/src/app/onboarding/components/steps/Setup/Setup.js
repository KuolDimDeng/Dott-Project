'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSetupPolling } from '@/hooks/useSetupPolling';
import { SetupLoadingState } from '@/components/LoadingState/SetupLoadingState';
import { useStepTransition } from '@/app/onboarding/hooks/useStepTransition';
import { ONBOARDING_STATES, STEP_ROUTES } from '@/utils/userAttributes';

import { logger } from '@/utils/logger';

function Setup() {
  const router = useRouter();
  const { currentStep, lastCompletedStep, completeStep } = useStepTransition();
  const { status, error, isPolling, startPolling, completeSetup } = useSetupPolling();
  const [setupInitialized, setSetupInitialized] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  const handleSetupError = useCallback(async (error) => {
    logger.error('Setup error:', error);
    
    if (retryCount < MAX_RETRIES) {
      setRetryCount(prev => prev + 1);
      const delay = Math.pow(2, retryCount) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      return true; // Can retry
    }
    
    // Max retries reached, redirect back
    router.push(STEP_ROUTES[ONBOARDING_STATES.PAYMENT]);
    return false;
  }, [retryCount, router]);

  useEffect(() => {
    let mounted = true;
    let timeoutId;

    const initSetup = async () => {
      if (setupInitialized) {
        return;
      }

      try {
        // Get current user and attributes
        const { getCurrentUser, fetchUserAttributes } = await import('aws-amplify/auth');
        const user = await getCurrentUser();
        const attributes = await fetchUserAttributes();
        
        // Check if we're in setup state
        const onboardingStatus = attributes['custom:onboarding'] || 'NOT_STARTED';
        
        logger.debug('Checking onboarding status:', {
          onboardingStatus,
          setupInitialized
        });

        // Only proceed if status is SETUP
        if (onboardingStatus !== 'SETUP') {
          return;
        }

        // Start setup process
        await startPolling();
        
        if (mounted) {
          setSetupInitialized(true);
          setRetryCount(0);
          
          // Redirect to dashboard immediately
          router.push('/dashboard');
        }
      } catch (error) {
        if (mounted) {
          const canRetry = await handleSetupError(error);
          if (canRetry && mounted) {
            timeoutId = setTimeout(initSetup, Math.pow(2, retryCount) * 1000);
          }
        }
      }
    };

    initSetup();

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [setupInitialized, startPolling, retryCount, handleSetupError, router]);

  useEffect(() => {
    // Handle setup completion in background
    if (status?.status === 'complete') {
      const updateOnboardingStatus = async () => {
        try {
          const { updateUserAttributes } = await import('aws-amplify/auth');
          const { configureAmplify } = await import('@/config/amplify');

          // Ensure Amplify is configured
          await configureAmplify();

          // Mark setup as complete in backend first
          await completeSetup();

          // Then update Cognito attributes to mark onboarding as complete
          await updateUserAttributes({
            userAttributes: {
              'custom:onboarding': 'COMPLETE',
              'custom:setupdone': 'TRUE',
              'custom:updated_at': new Date().toISOString()
            }
          });

          // Finally complete the setup step in onboarding flow
          await completeStep(ONBOARDING_STATES.SETUP);
          
          logger.debug('Setup completed in background', {
            status: status.status,
            currentStep,
            lastCompletedStep
          });
        } catch (error) {
          logger.error('Failed to complete setup in background:', {
            error: error.message,
            status: status.status
          });
        }
      };

      updateOnboardingStatus();
    }
  }, [status, currentStep, lastCompletedStep, completeStep, completeSetup]);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">
        Setting Up Your Account
      </h1>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <SetupLoadingState status={status} />
        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-b-lg">{error}</div>
        )}
      </div>
    </div>
  );
}

export { Setup };
export default Setup;
