'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/utils/logger';
import { getClientSession } from '@/utils/clientSessionHelper';
import { onboardingStateMachine, ONBOARDING_STATES } from '@/utils/onboardingStateMachine';
import OnboardingFlowV2 from '@/components/Onboarding/OnboardingFlow.v2';
import LoadingSpinner from '@/components/LoadingSpinner';
import { captureEvent } from '@/lib/posthog';
import { usePostHog } from 'posthog-js/react';
import { trackEvent, EVENTS } from '@/utils/posthogTracking';

export default function OnboardingPageV2() {
  const router = useRouter();
  const posthog = usePostHog();
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
      
      // Track onboarding page view and started event
      captureEvent('onboarding_page_viewed', {
        needs_onboarding: session.user?.needsOnboarding,
        onboarding_completed: session.user?.onboardingCompleted,
        has_tenant_id: !!session.user?.tenantId
      });
      
      // Track onboarding started if they need onboarding
      if (session.user?.needsOnboarding === true) {
        trackEvent(posthog, EVENTS.ONBOARDING_STARTED, {
          email: session.user?.email,
          userId: session.user?.sub || session.user?.id
        });
      }

      // CRITICAL: Only check backend's onboarding status
      // Backend's needsOnboarding is the single source of truth
      // If needsOnboarding is FALSE (they don't need onboarding), redirect to dashboard
      if (session.user?.needsOnboarding === false || session.user?.onboardingCompleted === true) {
        const tenantId = session.user?.tenantId || session.user?.tenant_id;
        if (tenantId) {
          logger.info('[OnboardingPage.v2] Backend says onboarding completed, redirecting to dashboard');
          router.push(`/${tenantId}/dashboard`);
          return;
        } else {
          logger.warn('[OnboardingPage.v2] Onboarding completed but no tenant ID yet, checking for updates...');
          
          // If we just completed payment, tenant creation might be in progress
          // Refresh session data and retry
          let retries = 0;
          const maxRetries = 5;
          
          while (retries < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
            
            // Refresh session data
            const refreshedSession = await getClientSession();
            const refreshedTenantId = refreshedSession.user?.tenantId || refreshedSession.user?.tenant_id;
            
            if (refreshedTenantId) {
              logger.info('[OnboardingPage.v2] Tenant ID found after refresh:', refreshedTenantId);
              router.push(`/${refreshedTenantId}/dashboard`);
              return;
            }
            
            retries++;
            logger.info('[OnboardingPage.v2] Still no tenant ID, retry', retries, 'of', maxRetries);
          }
          
          // If still no tenant ID after retries, redirect to general dashboard
          logger.error('[OnboardingPage.v2] No tenant ID after retries, redirecting to general dashboard');
          router.push('/dashboard');
          return;
        }
      }
      
      // If needsOnboarding is TRUE, they should stay on this page
      logger.info('[OnboardingPage.v2] User needs onboarding, showing onboarding flow');

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