'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/utils/logger';
import { getClientSession } from '@/utils/clientSessionHelper';
import { onboardingStateMachine, ONBOARDING_STATES } from '@/utils/onboardingStateMachine';
import OnboardingFlowV2 from '@/components/Onboarding/OnboardingFlow.v2';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function OnboardingPageV2() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkAuthAndInitialize();
  }, []);

  const checkAuthAndInitialize = async () => {
    try {
      logger.info('[OnboardingPage.v2] Checking authentication...');
      
      // Wait a moment for cookies to propagate if we just came from auth
      const urlParams = new URLSearchParams(window.location.search);
      const fromAuth = urlParams.get('fromAuth') === 'true';
      
      if (fromAuth) {
        logger.info('[OnboardingPage.v2] Coming from auth, waiting for cookies to propagate...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Get session using client helper with retry
      let session = await getClientSession();
      
      // If not authenticated and we just came from auth, retry a few times
      if (!session.authenticated && fromAuth) {
        logger.info('[OnboardingPage.v2] Session not found, retrying...');
        for (let i = 0; i < 3; i++) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          session = await getClientSession();
          if (session.authenticated) {
            logger.info('[OnboardingPage.v2] Session found on retry', i + 1);
            break;
          }
        }
      }
      
      if (!session.authenticated) {
        logger.warn('[OnboardingPage.v2] Not authenticated, redirecting to login');
        router.push('/auth/email-signin');
        return;
      }

      logger.info('[OnboardingPage.v2] Session authenticated:', {
        email: session.user?.email,
        needsOnboarding: session.user?.needsOnboarding,
        onboardingCompleted: session.user?.onboardingCompleted,
        tenantId: session.user?.tenantId
      });

      // CRITICAL: Only check backend's onboarding status, not tenant ID
      // Backend's needsOnboarding is the single source of truth
      if (session.user?.needsOnboarding === false || session.user?.onboardingCompleted === true) {
        const tenantId = session.user?.tenantId;
        if (tenantId) {
          logger.info('[OnboardingPage.v2] Backend says onboarding completed, redirecting to dashboard');
          router.push(`/${tenantId}/dashboard`);
          return;
        } else {
          logger.error('[OnboardingPage.v2] Onboarding completed but no tenant ID!');
          // Let them continue with onboarding to fix this state
        }
      }

      // Initialize onboarding state machine
      await onboardingStateMachine.initialize();
      const currentState = onboardingStateMachine.getCurrentState();
      
      logger.info('[OnboardingPage.v2] Onboarding state:', {
        currentState,
        isComplete: onboardingStateMachine.isComplete()
      });

      // User needs onboarding, show the flow
      setLoading(false);
      
    } catch (error) {
      logger.error('[OnboardingPage.v2] Error during initialization:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="large" text="Loading..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={() => router.push('/auth/email-signin')}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Return to Sign In
          </button>
        </div>
      </div>
    );
  }

  return <OnboardingFlowV2 />;
}