'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@auth0/nextjs-auth0/client';
import { CircularProgress } from '@/components/ui/TailwindComponents';
import { logger } from '@/utils/logger';
import { getCurrentUser } from '@/services/userService';
import { getOnboardingStatus } from '@/utils/onboardingUtils_Auth0';

export default function Auth0CallbackPage() {
  const router = useRouter();
  const { user, isLoading } = useUser();
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('Completing authentication...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Wait for Auth0 to complete loading
        if (isLoading) {
          return;
        }

        if (!user) {
          throw new Error('Authentication failed - no user data received');
        }

        logger.debug('[Auth0Callback] Processing Auth0 callback for user:', {
          email: user.email,
          sub: user.sub
        });
        
        setStatus('Loading your profile...');
        
        // Get complete user profile from backend
        const backendUser = await getCurrentUser();
        
        if (!backendUser) {
          throw new Error('Failed to load user profile from backend');
        }
        
        logger.debug('[Auth0Callback] Backend user profile loaded:', {
          email: backendUser.email,
          needsOnboarding: backendUser.needsOnboarding,
          onboardingCompleted: backendUser.onboardingCompleted,
          tenantId: backendUser.tenantId
        });
        
        // 🎯 Smart Routing Logic Implementation
        
        // 1. NEW USER - No tenant or needs onboarding
        if (backendUser.needsOnboarding || !backendUser.tenantId || !backendUser.onboardingCompleted) {
          setStatus('Setting up your account...');
          logger.debug('[Auth0Callback] New user detected, redirecting to onboarding');
          router.push('/onboarding/business-info');
          return;
        }
        
        // 2. RETURNING USER WITH INCOMPLETE ONBOARDING
        const onboardingStatus = await getOnboardingStatus();
        
        if (onboardingStatus.status !== 'completed') {
          setStatus('Resuming your setup...');
          const currentStep = onboardingStatus.currentStep || 'business_info';
          const stepRoutes = {
            business_info: '/onboarding/business-info',
            subscription: '/onboarding/subscription', 
            payment: '/onboarding/payment',
            setup: '/onboarding/setup'
          };
          
          const resumeRoute = stepRoutes[currentStep] || '/onboarding/business-info';
          logger.debug('[Auth0Callback] Resuming onboarding at step:', currentStep);
          router.push(resumeRoute);
          return;
        }
        
        // 3. EXISTING USER (COMPLETE) - Go to tenant dashboard
        if (backendUser.tenantId && backendUser.onboardingCompleted) {
          setStatus('Loading your dashboard...');
          logger.debug('[Auth0Callback] Complete user, redirecting to tenant dashboard');
          router.push(`/tenant/${backendUser.tenantId}/dashboard`);
          return;
        }
        
        // Fallback: Something went wrong, go to generic dashboard
        setStatus('Loading dashboard...');
        logger.warn('[Auth0Callback] Fallback routing to generic dashboard');
        router.push('/dashboard');
        
      } catch (error) {
        logger.error('[Auth0Callback] Error in callback handler:', error);
        setError(error.message || 'Authentication failed');
        
        // Delay redirect to show error
        setTimeout(() => {
          router.push('/auth/signin?error=callback_failed');
        }, 3000);
      }
    };

    handleCallback();
  }, [user, isLoading, router]);

  // Show loading while Auth0 is still loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <CircularProgress size={48} />
          <h2 className="text-xl font-semibold text-gray-900">Authenticating...</h2>
          <p className="text-gray-600">Please wait while we sign you in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        {error ? (
          <div className="space-y-4">
            <div className="text-red-600">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Authentication Error</h2>
            <p className="text-gray-600">{error}</p>
            <p className="text-sm text-gray-500">Redirecting to sign in...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <CircularProgress size={48} />
            <h2 className="text-xl font-semibold text-gray-900">{status}</h2>
            <div className="text-sm text-gray-500 space-y-1">
              <p>🎯 Smart routing in progress...</p>
              <div className="text-xs text-left bg-gray-100 p-2 rounded">
                <div>✓ New User → /onboarding/business-info</div>
                <div>✓ Incomplete → Resume at step</div>
                <div>✓ Complete → /tenant/[id]/dashboard</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
