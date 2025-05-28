'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Amplify } from '@/config/amplifyUnified';
import { fetchAuthSession, fetchUserAttributes, configureAmplify, isAmplifyConfigured } from '@/config/amplifyUnified';
import { logger } from '@/utils/logger';
import { setAuthCookies, determineOnboardingStep } from '@/utils/cookieManager';

export default function Callback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('Processing authentication...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        logger.debug('[OAuth Callback] Auth callback page loaded, handling response');
        
        // Extract URL parameters for debugging
        const urlParams = new URLSearchParams(window.location.search);
        const authCode = urlParams.get('code');
        const state = urlParams.get('state');
        const urlError = urlParams.get('error');
        
        logger.debug('[OAuth Callback] URL parameters:', {
          hasCode: !!authCode,
          codeLength: authCode?.length,
          hasState: !!state,
          hasError: !!urlError,
          errorDescription: urlParams.get('error_description')
        });
        
        // Check for OAuth errors in URL
        if (urlError) {
          throw new Error(`OAuth error: ${urlError} - ${urlParams.get('error_description') || 'Unknown error'}`);
        }
        
        if (!authCode) {
          throw new Error('No authorization code received from OAuth provider');
        }
        
        // Add debug functions to window for testing
        if (typeof window !== 'undefined') {
          window.testOnboardingLogic = (testAttributes) => {
            console.log('🧪 Testing onboarding logic with attributes:', testAttributes);
            const step = determineOnboardingStep(testAttributes);
            console.log('📍 Determined step:', step);
            
            // Test different scenarios using correct Cognito attribute names
            const scenarios = [
              { name: 'New User', attrs: {} },
              { name: 'Has Tenant ID', attrs: { 'custom:tenant_ID': 'test-tenant-123' } },
              { name: 'Has Subscription', attrs: { 'custom:tenant_ID': 'test-tenant-123', 'custom:subplan': 'professional' } },
              { name: 'Free Plan Complete', attrs: { 'custom:tenant_ID': 'test-tenant-123', 'custom:subplan': 'free' } },
              { name: 'Paid Plan + Payment', attrs: { 'custom:tenant_ID': 'test-tenant-123', 'custom:subplan': 'professional', 'custom:payverified': 'true' } },
              { name: 'Setup Done', attrs: { 'custom:tenant_ID': 'test-tenant-123', 'custom:subplan': 'professional', 'custom:payverified': 'true', 'custom:setupdone': 'true' } },
              { name: 'Complete (lowercase)', attrs: { 'custom:onboarding': 'complete' } },
              { name: 'Complete (uppercase)', attrs: { 'custom:onboarding': 'COMPLETE' } },
              { name: 'Existing User Example', attrs: { 'custom:tenant_ID': 'existing-tenant', 'custom:subplan': 'enterprise', 'custom:payverified': 'true', 'custom:setupdone': 'true', 'custom:onboarding': 'complete' } }
            ];
            
            console.log('🔍 Testing all scenarios:');
            scenarios.forEach(scenario => {
              const result = determineOnboardingStep(scenario.attrs);
              console.log(`  ${scenario.name}: ${result}`);
            });
            
            return step;
          };
          
          // Add OAuth callback debugging function
          window.debugOAuthCallback = () => {
            const urlParams = new URLSearchParams(window.location.search);
            console.log('🔍 OAuth Callback Debug Info:');
            console.log('  URL:', window.location.href);
            console.log('  Authorization Code:', urlParams.get('code')?.substring(0, 20) + '...');
            console.log('  State:', urlParams.get('state'));
            console.log('  Error:', urlParams.get('error'));
            console.log('  Error Description:', urlParams.get('error_description'));
            return {
              url: window.location.href,
              code: urlParams.get('code'),
              state: urlParams.get('state'),
              error: urlParams.get('error'),
              errorDescription: urlParams.get('error_description')
            };
          };
          
          console.log('🧪 Debug functions added:');
          console.log('  - window.testOnboardingLogic(attributes)');
          console.log('  - window.debugOAuthCallback()');
        }
        
        // Fix: Ensure Amplify is properly configured before any auth operations
        logger.debug('[OAuth Callback] Ensuring Amplify is configured...');
        
        // Force fresh configuration
        configureAmplify(true);
        
        // Wait a moment for configuration to settle
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Double-check configuration by accessing Amplify directly
        try {
          const config = Amplify.getConfig();
          if (!config?.Auth?.Cognito?.userPoolId) {
            logger.warn('[OAuth Callback] Amplify config missing after configuration, retrying...');
            configureAmplify(true);
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (configError) {
          logger.error('[OAuth Callback] Error checking Amplify config:', configError);
        }
        
        logger.debug('[OAuth Callback] Fetching auth session...');
        setStatus('Completing sign in...');
        
        // Simple token retrieval with timeout
        let tokens;
        try {
          // Import the raw auth function directly to bypass the enhanced wrapper
          const { fetchAuthSession: rawFetchAuthSession } = await import('aws-amplify/auth');
          
          const authResponse = await Promise.race([
            rawFetchAuthSession({ forceRefresh: true }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Token retrieval timeout')), 10000)
            )
          ]);
          
          tokens = authResponse?.tokens;
          
          logger.debug('[OAuth Callback] Auth response:', { 
            hasTokens: !!tokens,
            hasAccessToken: !!tokens?.accessToken,
            hasIdToken: !!tokens?.idToken,
            isSignedIn: authResponse?.isSignedIn
          });
        } catch (sessionError) {
          logger.error('[OAuth Callback] Session fetch error:', sessionError);
          
          // If it's the "Auth UserPool not configured" error, try direct configuration
          if (sessionError.message?.includes('Auth UserPool not configured') || 
              sessionError.message?.includes('UserPool')) {
            logger.warn('[OAuth Callback] Amplify lost configuration, attempting direct recovery...');
            
            // Try to configure Amplify directly
            try {
              const { Amplify: AmplifyDirect } = await import('aws-amplify');
              const amplifyConfig = {
                Auth: {
                  Cognito: {
                    userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || 'us-east-1_JPL8vGfb6',
                    userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '1o5v84mrgn4gt87khtr179uc5b',
                    region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
                    loginWith: {
                      email: true,
                      username: true,
                      phone: false,
                      oauth: {
                        domain: `${process.env.NEXT_PUBLIC_COGNITO_DOMAIN || 'us-east-1jpl8vgfb6'}.auth.${process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1'}.amazoncognito.com`,
                        scopes: 'openid profile email',
                        redirectSignIn: 'https://dottapps.com/auth/callback',
                        redirectSignOut: 'https://dottapps.com/auth/signin',
                        responseType: 'code',
                        providers: ['Google']
                      }
                    }
                  }
                }
              };
              
              AmplifyDirect.configure(amplifyConfig);
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Try once more with raw function
              const { fetchAuthSession: rawRetry } = await import('aws-amplify/auth');
              const retryResponse = await rawRetry({ forceRefresh: true });
              tokens = retryResponse?.tokens;
            } catch (recoveryError) {
              logger.error('[OAuth Callback] Direct recovery failed:', recoveryError);
              throw sessionError;
            }
          } else {
            throw sessionError;
          }
        }
        
        // Check if we have valid tokens
        if (!tokens || (!tokens.accessToken && !tokens.idToken)) {
          // Try fallback: check if user is authenticated despite token issues
          try {
            logger.debug('[OAuth Callback] Checking user attributes as fallback...');
            const { fetchUserAttributes: rawFetchUserAttributes } = await import('aws-amplify/auth');
            const userAttributes = await rawFetchUserAttributes();
            if (userAttributes && userAttributes.email) {
              logger.debug('[OAuth Callback] User is authenticated, proceeding with minimal tokens');
              // Create minimal token object for cookie setting
              tokens = { 
                accessToken: 'authenticated', 
                idToken: 'authenticated',
                _fallback: true 
              };
            } else {
              throw new Error('No valid authentication found');
            }
          } catch (fallbackError) {
            logger.error('[OAuth Callback] Fallback check failed:', fallbackError);
            throw new Error('Authentication failed - no tokens received');
          }
        }
        
        logger.debug('[OAuth Callback] OAuth callback successful');
        setStatus('Loading your account...');
        
        // Get user attributes to check onboarding status
        const { fetchUserAttributes: rawFetchUserAttributes } = await import('aws-amplify/auth');
        const userAttributes = await rawFetchUserAttributes();
        logger.debug('[OAuth Callback] User attributes retrieved:', {
          onboardingStatus: userAttributes['custom:onboarding'],
          businessId: userAttributes['custom:business_id'],
          subscription: userAttributes['custom:subscription_plan'],
          businessInfoDone: userAttributes['custom:business_info_done'],
          subscriptionDone: userAttributes['custom:subscription_done'],
          paymentDone: userAttributes['custom:payment_done'],
          setupDone: userAttributes['custom:setupdone'],
          tenantId: userAttributes['custom:tenant_ID'],
          email: userAttributes.email,
          isNewUser: !userAttributes['custom:onboarding']
        });
        
        // Set all auth and onboarding cookies using the cookieManager
        setAuthCookies(tokens, userAttributes);
        
        // Determine where to redirect based on onboarding status
        const nextStep = determineOnboardingStep(userAttributes);
        let redirectUrl = '/dashboard'; // Default if complete
        
        logger.debug('[OAuth Callback] Onboarding step determination:', {
          nextStep,
          isComplete: nextStep === 'complete'
        });
        
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
          // Fallback to business info
          redirectUrl = '/onboarding/business-info';
        }
        
        // Add from parameter to prevent redirect loops
        redirectUrl += (redirectUrl.includes('?') ? '&' : '?') + 'from=oauth';
        
        setStatus('Redirecting...');
        
        // Set a timeout to ensure cookies are set before redirect
        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 500);
        
      } catch (error) {
        logger.error('[OAuth Callback] OAuth process failed:', error);
        setError(error.message || 'Authentication failed');
        setStatus('Authentication error. Redirecting to sign in...');
        
        // Provide more specific error messages
        let errorParam = 'oauth';
        if (error.message?.includes('authorization code')) {
          errorParam = 'no_code';
        } else if (error.message?.includes('timeout')) {
          errorParam = 'token_timeout';
        } else if (error.message?.includes('OAuth error')) {
          errorParam = 'oauth_provider';
        }
        
        // Redirect to sign in page after a short delay
        setTimeout(() => {
          router.push(`/auth/signin?error=${errorParam}&details=${encodeURIComponent(error.message || 'Unknown error')}`);
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
      {/* Simple spinner instead of percentage */}
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <p className="text-gray-600">{status}</p>
    </div>
  );
}
