'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchAuthSession, fetchUserAttributes } from '@/config/amplifyUnified';
import { logger } from '@/utils/logger';
import { setAuthCookies, determineOnboardingStep } from '@/utils/cookieManager';

export default function Callback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('Processing authentication...');
  const [progress, setProgress] = useState(10);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        logger.debug('[OAuth Callback] Auth callback page loaded, handling response');
        setStatus('Completing authentication...');
        setProgress(25);
        
        // Handle the OAuth callback
        let tokens;
        try {
          const authResponse = await fetchAuthSession();
          tokens = authResponse?.tokens;
          logger.debug('[OAuth Callback] Auth response handled:', { 
            hasTokens: !!tokens,
            isSignedIn: authResponse?.isSignedIn
          });
        } catch (authError) {
          logger.error('[OAuth Callback] Error handling auth response:', authError);
          setError('Authentication failed: ' + (authError.message || 'Unknown error'));
          return;
        }
        
        if (!tokens) {
          throw new Error('No tokens received from OAuth callback');
        }
        
        logger.debug('[OAuth Callback] OAuth callback successful');
        setStatus('Checking account status...');
        setProgress(50);
        
        // Get user attributes to check onboarding status
        try {
          const userAttributes = await fetchUserAttributes();
          logger.debug('[OAuth Callback] User attributes:', {
            onboardingStatus: userAttributes['custom:onboarding'],
            businessId: userAttributes['custom:business_id'],
            subscription: userAttributes['custom:subscription_plan']
          });
          
          // Set all auth and onboarding cookies using the cookieManager
          setAuthCookies(tokens, userAttributes);
          
          // Determine where to redirect based on onboarding status
          const nextStep = determineOnboardingStep(userAttributes);
          let redirectUrl = '/dashboard'; // Default if complete
          
          setProgress(75);
          
          if (nextStep === 'business-info') {
            redirectUrl = '/onboarding/business-info';
          } else if (nextStep === 'subscription') {
            redirectUrl = '/onboarding/subscription';
          } else if (nextStep === 'payment') {
            redirectUrl = '/onboarding/payment';
          } else if (nextStep === 'setup') {
            redirectUrl = '/onboarding/setup';
          } else if (nextStep !== 'complete') {
            // Any other status that isn't COMPLETE - redirect to business info
            redirectUrl = '/onboarding/business-info';
          }
          
          // Add from parameter to prevent redirect loops
          redirectUrl += (redirectUrl.includes('?') ? '&' : '?') + 'from=oauth';
          logger.debug('[OAuth Callback] Redirecting to:', redirectUrl);
          
          setStatus(`Redirecting to ${redirectUrl}...`);
          setProgress(90);
          
          // Set a timeout to ensure cookies are set before redirect
          setTimeout(() => {
            // Use window.location for a clean redirect
            window.location.href = redirectUrl;
          }, 800);
        } catch (attributesError) {
          logger.error('[OAuth Callback] Error fetching user attributes:', attributesError);
          // Fall back to safe default
          setError('Unable to determine account status. Redirecting to start of onboarding.');
          setTimeout(() => {
            window.location.href = '/onboarding/business-info?from=oauth&error=attributes';
          }, 2000);
        }
      } catch (error) {
        logger.error('[OAuth Callback] OAuth process failed:', error);
        setError(error.message || 'Authentication failed');
        setStatus('Authentication error. Redirecting to sign in...');
        
        // Redirect to sign in page after a short delay
        setTimeout(() => {
          router.push('/auth/signin?error=oauth');
        }, 3000);
      }
    };

    handleCallback();
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 space-y-4">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 w-full max-w-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-600">{status}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-6">
      <div className="relative h-16 w-16">
        {/* Progress Circle */}
        <svg className="w-full h-full" viewBox="0 0 100 100">
          {/* Background Circle */}
          <circle 
            className="text-gray-200" 
            strokeWidth="8"
            stroke="currentColor"
            fill="transparent"
            r="46" 
            cx="50" 
            cy="50" 
          />
          {/* Progress Circle */}
          <circle 
            className="text-blue-600" 
            strokeWidth="8" 
            strokeDasharray={289}
            strokeDashoffset={289 - (289 * progress) / 100}
            strokeLinecap="round" 
            stroke="currentColor" 
            fill="transparent" 
            r="46" 
            cx="50" 
            cy="50" 
          />
        </svg>
        {/* Percentage */}
        <div className="absolute top-0 left-0 flex items-center justify-center w-full h-full">
          <span className="text-sm font-medium text-blue-700">{progress}%</span>
        </div>
      </div>
      <p className="text-gray-600">{status}</p>
    </div>
  );
}
