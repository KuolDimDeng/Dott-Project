'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/utils/logger';
import { sessionManagerEnhanced as sessionManager } from '@/utils/sessionManager-v2-enhanced';
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
      
      // Get session from centralized manager
      const session = await sessionManager.getSession();
      
      if (!session.authenticated) {
        logger.warn('[OnboardingPage.v2] Not authenticated, redirecting to login');
        router.push('/auth/email-signin');
        return;
      }

      // Check if user has tenant but still marked as needing onboarding
      if (session.user?.tenantId && session.user?.needsOnboarding) {
        logger.warn('[OnboardingPage.v2] User has tenant but needs_onboarding=true, attempting to fix...');
        
        try {
          const fixResponse = await fetch('/api/auth/force-clear-onboarding', {
            method: 'POST',
            credentials: 'include'
          });
          
          if (fixResponse.ok) {
            const fixResult = await fixResponse.json();
            logger.info('[OnboardingPage.v2] Onboarding status fixed:', fixResult);
            
            // Redirect to dashboard
            router.push(`/tenant/${session.user.tenantId}/dashboard`);
            return;
          }
        } catch (fixError) {
          logger.error('[OnboardingPage.v2] Failed to fix onboarding status:', fixError);
        }
      }

      // Initialize onboarding state machine
      await onboardingStateMachine.initialize();
      const currentState = onboardingStateMachine.getCurrentState();
      
      logger.info('[OnboardingPage.v2] Onboarding state:', {
        currentState,
        isComplete: onboardingStateMachine.isComplete()
      });

      // If already completed, redirect to dashboard
      if (currentState === ONBOARDING_STATES.COMPLETED) {
        const tenantId = await sessionManager.getTenantId();
        if (tenantId) {
          logger.info('[OnboardingPage.v2] Onboarding already completed, redirecting to dashboard');
          router.push(`/tenant/${tenantId}/dashboard`);
          return;
        }
      }

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