'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CircularProgress } from '@/components/ui/TailwindComponents';
import { logger } from '@/utils/logger';
import { getCurrentUser } from '@/services/userService';
import { getOnboardingStatus } from '@/utils/onboardingUtils_Auth0';

export default function Auth0CallbackPage() {
  const router = useRouter();
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('Processing authentication...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        logger.debug('[Auth0Callback] Processing Auth0 callback');
        
        // Wait a moment for Auth0 to complete session setup
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setStatus('Loading your profile...');
        
        // Get user profile from backend
        const user = await getCurrentUser();
        
        if (!user) {
          throw new Error('Failed to load user profile');
        }
        
        logger.debug('[Auth0Callback] User authenticated:', {
          email: user.email,
          needsOnboarding: user.needsOnboarding,
          tenantId: user.tenantId
        });
        
        // Check onboarding status
        if (user.needsOnboarding || !user.tenantId) {
          setStatus('Setting up your account...');
          router.push('/onboarding/business-info');
          return;
        }
        
        // Check detailed onboarding status
        const onboardingStatus = await getOnboardingStatus();
        
        if (onboardingStatus.status !== 'completed') {
          setStatus('Resuming onboarding...');
          const nextStep = onboardingStatus.currentStep || 'business_info';
          router.push(`/onboarding/${nextStep}`);
          return;
        }
        
        // User is fully onboarded, redirect to dashboard
        setStatus('Loading your dashboard...');
        if (user.tenantId) {
          router.push(`/tenant/${user.tenantId}/dashboard`);
        } else {
          router.push('/dashboard');
        }
        
      } catch (error) {
        logger.error('[Auth0Callback] Error handling callback:', error);
        setError(error.message || 'Authentication failed');
        
        // Redirect to sign in with error
        setTimeout(() => {
          router.push('/auth/signin?error=callback_failed');
        }, 3000);
      }
    };

    handleCallback();
  }, [router]);

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
            <p className="text-gray-600">Please wait while we complete the process...</p>
          </div>
        )}
      </div>
    </div>
  );
}