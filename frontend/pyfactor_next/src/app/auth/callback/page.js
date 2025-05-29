'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/utils/logger';
import { setAuthCookies, determineOnboardingStep } from '@/utils/cookieManager';

export default function Callback() {
  const router = useRouter();
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('Processing authentication...');
  const [progress, setProgress] = useState(10);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('[OAuth Callback] Starting OAuth callback processing...');
        logger.debug('[OAuth Callback] Auth callback page loaded, handling response');
        setStatus('Completing authentication...');
        setProgress(25);
        
        // Check if we have OAuth parameters in the URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');
        
        console.log('[OAuth Callback] URL parameters:', { 
          hasCode: !!code, 
          hasState: !!state, 
          hasError: !!error,
          codeLength: code?.length,
          stateValue: state,
          errorValue: error,
          fullURL: window.location.href
        });
        
        // If there's an error parameter, handle it
        if (error) {
          console.error('[OAuth Callback] OAuth error in URL:', error, urlParams.get('error_description'));
          throw new Error(`OAuth error: ${error} - ${urlParams.get('error_description') || 'Authentication failed'}`);
        }
        
        // If we don't have a code, something went wrong
        if (!code) {
          console.error('[OAuth Callback] No authorization code in URL!');
          logger.error('[OAuth Callback] No authorization code in URL');
          throw new Error('No authorization code received from OAuth provider');
        }

        console.log('[OAuth Callback] Authorization code received, length:', code.length);
        setStatus('Verifying authentication...');
        setProgress(40);

        // Import Amplify functions
        const { fetchAuthSession, fetchUserAttributes, Hub } = await import('@/config/amplifyUnified');
        
        console.log('[OAuth Callback] Amplify functions imported');
        setProgress(50);
        
        // In Amplify v6, we need to manually complete the signInWithRedirect flow
        // The presence of the authorization code means we need to let Amplify process it
        console.log('[OAuth Callback] Attempting to complete OAuth sign-in...');
        setStatus('Completing OAuth sign-in...');
        setProgress(60);
        
        // Set up Hub listener to catch OAuth completion
        let authCompleted = false;
        let hubTimeout;
        
        const hubListener = (data) => {
          console.log('[OAuth Callback] Hub event received:', data);
          const { payload } = data;
          console.log('[OAuth Callback] Hub event type:', payload.event);
          
          if (payload.event === 'signedIn' || 
              payload.event === 'signInWithRedirect' ||
              payload.event === 'signInWithRedirect_success') {
            console.log('[OAuth Callback] OAuth sign-in success event detected!');
            authCompleted = true;
            if (hubTimeout) clearTimeout(hubTimeout);
            Hub.remove('auth', hubListener);
            completeOAuthFlow();
          } else if (payload.event === 'signInWithRedirect_failure') {
            console.error('[OAuth Callback] OAuth sign-in failed:', payload);
            authCompleted = true;
            if (hubTimeout) clearTimeout(hubTimeout);
            Hub.remove('auth', hubListener);
            setError(payload.data?.message || 'OAuth sign-in failed');
            setStatus('Authentication failed. Redirecting...');
            setTimeout(() => {
              router.push('/auth/signin?error=oauth_failed');
            }, 3000);
          }
        };
        
        Hub.listen('auth', hubListener);
        console.log('[OAuth Callback] Hub listener registered');
        
        // Try to trigger the OAuth completion manually by checking current auth state
        // This should trigger Amplify to process the authorization code in the URL
        try {
          console.log('[OAuth Callback] Checking current auth session to trigger OAuth processing...');
          await fetchAuthSession({ forceRefresh: true });
          console.log('[OAuth Callback] Session check completed, waiting for Hub events...');
        } catch (sessionError) {
          console.log('[OAuth Callback] Initial session check failed (expected):', sessionError.message);
          // This is often expected during OAuth processing
        }
        
        setProgress(70);
        
        // Set a timeout for Hub events
        hubTimeout = setTimeout(() => {
          if (!authCompleted) {
            console.error('[OAuth Callback] No Hub events received, trying direct session check...');
            Hub.remove('auth', hubListener);
            // Try direct session checking as fallback
            checkSessionDirectly();
          }
        }, 5000); // 5 second timeout
        
      } catch (error) {
        console.error('[OAuth Callback] OAuth process failed:', error);
        logger.error('[OAuth Callback] OAuth process failed:', error);
        setError(error.message || 'Authentication failed');
        setStatus('Authentication error. Redirecting to sign in...');
        
        // Redirect to sign in page after a short delay
        setTimeout(() => {
          router.push('/auth/signin?error=oauth');
        }, 3000);
      }
    };
    
    const checkSessionDirectly = async () => {
      try {
        console.log('[OAuth Callback] Attempting direct session check as fallback...');
        setStatus('Verifying authentication tokens...');
        setProgress(75);
        
        const { fetchAuthSession } = await import('@/config/amplifyUnified');
        
        // Try multiple times to get the session
        for (let attempt = 1; attempt <= 10; attempt++) {
          try {
            console.log(`[OAuth Callback] Direct session check attempt ${attempt}/10...`);
            const session = await fetchAuthSession({ forceRefresh: true });
            
            if (session?.tokens?.accessToken) {
              console.log('[OAuth Callback] ✅ Direct session check successful!');
              await completeOAuthFlow();
              return;
            }
          } catch (err) {
            console.log(`[OAuth Callback] Direct session attempt ${attempt} failed:`, err.message);
          }
          
          if (attempt < 10) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        throw new Error('Unable to retrieve authentication session after OAuth callback');
        
      } catch (error) {
        console.error('[OAuth Callback] Direct session check failed:', error);
        setError('Authentication failed. Please try signing in again.');
        setStatus('Authentication error. Redirecting to sign in...');
        setTimeout(() => {
          router.push('/auth/signin?error=session_failed');
        }, 3000);
      }
    };
    
    const completeOAuthFlow = async () => {
      try {
        console.log('[OAuth Callback] Completing OAuth flow...');
        setStatus('Retrieving user information...');
        setProgress(80);
        
        const { fetchAuthSession, fetchUserAttributes } = await import('@/config/amplifyUnified');
        
        // Get the authenticated user's session
        const session = await fetchAuthSession({ forceRefresh: true });
        console.log('[OAuth Callback] Session retrieved:', {
          hasTokens: !!session?.tokens,
          hasAccessToken: !!session?.tokens?.accessToken,
          hasIdToken: !!session?.tokens?.idToken,
          userSub: session?.userSub
        });
        
        if (!session?.tokens) {
          throw new Error('No authentication tokens received');
        }
        
        // Get user attributes to check onboarding status
        setStatus('Checking account status...');
        setProgress(85);
        
        try {
          const userAttributes = await fetchUserAttributes();
          console.log('[OAuth Callback] User attributes retrieved:', {
            email: userAttributes.email,
            hasOnboarding: !!userAttributes['custom:onboarding'],
            onboardingStatus: userAttributes['custom:onboarding'],
            tenantId: userAttributes['custom:tenant_ID']
          });
          
          // Set all auth and onboarding cookies using the cookieManager
          setAuthCookies(session.tokens, userAttributes);
          
          // Determine where to redirect based on onboarding status
          const nextStep = determineOnboardingStep(userAttributes);
          let redirectUrl = '/dashboard'; // Default if complete
          
          console.log('[OAuth Callback] Onboarding step determination:', {
            nextStep,
            isComplete: nextStep === 'complete'
          });
          
          setProgress(90);
          
          if (nextStep === 'business-info') {
            redirectUrl = '/onboarding/business-info';
          } else if (nextStep === 'subscription') {
            redirectUrl = '/onboarding/subscription';
          } else if (nextStep === 'payment') {
            redirectUrl = '/onboarding/payment';
          } else if (nextStep === 'setup') {
            redirectUrl = '/onboarding/setup';
          } else if (nextStep === 'complete') {
            redirectUrl = '/dashboard';
          } else {
            // Any other status - redirect to business info
            redirectUrl = '/onboarding/business-info';
          }
          
          // Add from parameter to prevent redirect loops
          redirectUrl += (redirectUrl.includes('?') ? '&' : '?') + 'from=oauth';
          console.log('[OAuth Callback] Final redirect URL:', redirectUrl);
          
          setStatus(`Redirecting to ${redirectUrl.split('?')[0]}...`);
          setProgress(100);
          
          // Use window.location for a clean redirect
          setTimeout(() => {
            window.location.href = redirectUrl;
          }, 500);
          
        } catch (attributesError) {
          console.error('[OAuth Callback] Error fetching user attributes:', attributesError);
          logger.error('[OAuth Callback] Error fetching user attributes:', attributesError);
          
          // Even if we can't get attributes, redirect to a safe place
          setStatus('Redirecting to dashboard...');
          setTimeout(() => {
            window.location.href = '/dashboard?from=oauth';
          }, 1000);
        }
      } catch (error) {
        console.error('[OAuth Callback] OAuth completion failed:', error);
        logger.error('[OAuth Callback] OAuth completion failed:', error);
        setError(error.message || 'Authentication failed');
        setStatus('Authentication error. Redirecting to sign in...');
        
        // Redirect to sign in page after a short delay
        setTimeout(() => {
          router.push('/auth/signin?error=oauth_completion');
        }, 3000);
      }
    };

    handleCallback();
  }, [router]);

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
