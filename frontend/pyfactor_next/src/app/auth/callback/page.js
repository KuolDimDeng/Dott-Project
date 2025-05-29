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
        
        // IMPORTANT: Ensure Amplify is ready for OAuth processing
        // This will reconfigure if needed and verify OAuth configuration
        const { 
          fetchAuthSession, 
          fetchUserAttributes, 
          getCurrentUser, 
          Hub 
        } = await import('@/config/amplifyUnified');
        
        // Use the ensureAmplifyOAuthReady function to verify and fix configuration if needed
        const isReady = await window.ensureAmplifyOAuthReady?.() || true;
        console.log('[OAuth Callback] Amplify OAuth ready status:', isReady);
        
        // Even if not ready, continue anyway since we have the authorization code
        
        // Set up Hub listener to detect when OAuth sign-in completes
        let hubListenerActive = true;
        let authCompleted = false;
        
        const hubListener = (data) => {
          console.log('[OAuth Callback] Hub event received:', data);
          const { payload } = data;
          console.log('[OAuth Callback] Hub event type:', payload.event);
          
          if (payload.event === 'signInWithRedirect' || 
              payload.event === 'signIn' || 
              payload.event === 'cognitoHostedUI' ||
              payload.event === 'signInWithRedirect_success') {
            console.log('[OAuth Callback] OAuth sign-in event detected, processing...');
            hubListenerActive = false;
            authCompleted = true;
            completeOAuthFlow();
          } else if (payload.event === 'signInWithRedirect_failure' || 
                     payload.event === 'cognitoHostedUI_failure' ||
                     payload.event === 'parsingCallbackUrl') {
            if (payload.event === 'parsingCallbackUrl') {
              console.log('[OAuth Callback] Amplify is parsing callback URL...');
              return; // This is expected, wait for completion
            }
            console.error('[OAuth Callback] OAuth sign-in failed:', payload);
            hubListenerActive = false;
            setError(payload.data?.message || 'OAuth sign-in failed');
            setStatus('Authentication failed. Redirecting...');
            setTimeout(() => {
              router.push('/auth/signin?error=oauth_failed');
            }, 3000);
          }
        };
        
        // Listen for auth events
        Hub.listen('auth', hubListener);
        console.log('[OAuth Callback] Hub listener registered');
        
        // Give Amplify time to process the OAuth callback
        // This is crucial - Amplify needs time to parse the URL and exchange the code
        setStatus('Verifying authentication...');
        setProgress(40);
        
        // Wait a bit before checking session to allow Amplify to process
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Try to get the current session with retries
        let sessionCheckCount = 0;
        const maxSessionChecks = 30; // 30 seconds total
        
        const checkSession = async () => {
          if (!hubListenerActive || authCompleted) return; // Stop if auth completed
          
          try {
            sessionCheckCount++;
            console.log(`[OAuth Callback] Checking session (attempt ${sessionCheckCount}/${maxSessionChecks})...`);
            
            try {
              // Try to get the session first
              const session = await fetchAuthSession({ forceRefresh: true });
              console.log('[OAuth Callback] Session check result:', {
                hasTokens: !!session?.tokens,
                hasAccessToken: !!session?.tokens?.accessToken,
                hasIdToken: !!session?.tokens?.idToken,
                userSub: session?.userSub
              });
              
              if (session?.tokens?.accessToken) {
                console.log('[OAuth Callback] ✅ Valid session found! User is authenticated');
                hubListenerActive = false;
                authCompleted = true;
                Hub.remove('auth', hubListener);
                await completeOAuthFlow();
                return;
              }
            } catch (sessionErr) {
              console.log('[OAuth Callback] Session check error:', sessionErr.message);
              
              // If it's a "User does not exist" error, the OAuth flow hasn't completed yet
              if (sessionErr.message?.includes('User does not exist') || 
                  sessionErr.message?.includes('No current user')) {
                // This is expected during OAuth processing, continue checking
              } else {
                // Log unexpected errors
                console.error('[OAuth Callback] Unexpected session error:', sessionErr);
              }
            }
            
            // Continue checking
            if (sessionCheckCount < maxSessionChecks) {
              setTimeout(checkSession, 1000);
            } else {
              // Timeout
              console.error('[OAuth Callback] Session check timeout after 30 seconds');
              hubListenerActive = false;
              Hub.remove('auth', hubListener);
              throw new Error('OAuth authentication timeout. Please try again.');
            }
          } catch (err) {
            console.error('[OAuth Callback] Session check error:', err);
          }
        };
        
        // Start checking for session
        checkSession();
        
        // Add debug function to window for testing
        if (typeof window !== 'undefined') {
          window.debugOAuthState = async () => {
            console.log('=== OAuth Debug State ===');
            try {
              const user = await getCurrentUser();
              console.log('Current User:', user);
            } catch (e) {
              console.log('No current user:', e.message);
            }
            
            try {
              const session = await fetchAuthSession();
              console.log('Session:', {
                hasTokens: !!session?.tokens,
                hasAccessToken: !!session?.tokens?.accessToken,
                userSub: session?.userSub
              });
            } catch (e) {
              console.log('Session error:', e.message);
            }
            
            const urlParams = new URLSearchParams(window.location.search);
            console.log('URL Params:', Object.fromEntries(urlParams.entries()));
            
            const isConfigured = isReady;
            console.log('Amplify Configured:', isConfigured);
            
            return 'Debug info logged to console';
          };
          
          console.log('🧪 Debug function added: window.debugOAuthState()');
        }
        
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
    
    const completeOAuthFlow = async () => {
      try {
        console.log('[OAuth Callback] Completing OAuth flow...');
        setStatus('Retrieving user information...');
        setProgress(60);
        
        // Import functions we need
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
        setProgress(75);
        
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
          
          setProgress(85);
          
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
          setProgress(95);
          
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
