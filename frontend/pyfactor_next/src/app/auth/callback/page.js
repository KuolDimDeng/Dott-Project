'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchAuthSession, fetchUserAttributes, configureAmplify, isAmplifyConfigured } from '@/config/amplifyUnified';
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
        
        // Aggressive Amplify configuration - configure multiple times to ensure it sticks
        logger.debug('[OAuth Callback] Ensuring Amplify configuration...');
        for (let i = 0; i < 3; i++) {
          configureAmplify(true);
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
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
        
        // Add debug function to window for testing onboarding logic
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
          
          // Add OAuth scopes debugging function
          window.debugOAuthScopes = () => {
            console.log('🔍 OAuth Scopes Debug Info:');
            console.log('  Raw OAUTH_SCOPES env:', process.env.NEXT_PUBLIC_OAUTH_SCOPES);
            return {
              raw: process.env.NEXT_PUBLIC_OAUTH_SCOPES
            };
          };
          
          // Add manual retry function for OAuth callback
          window.retryOAuthCallback = async () => {
            console.log('🔄 Manually retrying OAuth callback...');
            
            // Force Amplify configuration
            console.log('  1. Configuring Amplify...');
            configureAmplify(true);
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Check configuration
            if (!isAmplifyConfigured()) {
              console.error('  ❌ Amplify configuration failed!');
              return;
            }
            
            console.log('  2. Fetching auth session...');
            try {
              const authResponse = await fetchAuthSession({ forceRefresh: true });
              const tokens = authResponse?.tokens;
              
              if (tokens && (tokens.accessToken || tokens.idToken)) {
                console.log('  ✅ Tokens retrieved successfully!');
                console.log('  3. Fetching user attributes...');
                
                const userAttributes = await fetchUserAttributes();
                console.log('  ✅ User attributes:', userAttributes);
                
                // Set cookies and redirect
                setAuthCookies(tokens, userAttributes);
                const nextStep = determineOnboardingStep(userAttributes);
                let redirectUrl = nextStep === 'complete' ? '/dashboard' : `/onboarding/${nextStep}`;
                redirectUrl += '?from=oauth_manual';
                
                console.log(`  4. Redirecting to ${redirectUrl}...`);
                window.location.href = redirectUrl;
              } else {
                console.error('  ❌ No tokens received');
              }
            } catch (error) {
              console.error('  ❌ Error:', error);
            }
          };
          
          console.log('🧪 Debug functions added:');
          console.log('  - window.testOnboardingLogic(attributes)');
          console.log('  - window.debugOAuthCallback()');
          console.log('  - window.debugOAuthScopes()');
          console.log('  - window.retryOAuthCallback() [NEW]');
        }
        
        // Handle the OAuth callback with retry mechanism
        let tokens;
        let retryCount = 0;
        const maxRetries = 15; // Increased from 10 to 15 attempts
        const baseDelay = 1000; // 1 second base delay
        const maxDelay = 8000; // Maximum 8 seconds delay
        
        // Force complete Amplify reconfiguration before starting
        logger.debug('[OAuth Callback] Force complete Amplify reconfiguration...');
        for (let i = 0; i < 5; i++) {
          configureAmplify(true);
          await new Promise(resolve => setTimeout(resolve, 300));
          if (isAmplifyConfigured()) {
            logger.debug(`[OAuth Callback] Amplify configured successfully on attempt ${i + 1}`);
            break;
          }
        }
        
        // Add initial delay to allow Cognito to process the OAuth callback
        logger.debug('[OAuth Callback] Adding initial delay for Cognito processing...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        while (retryCount < maxRetries) {
          try {
            // Force complete reconfiguration on every attempt to prevent config loss
            logger.debug(`[OAuth Callback] Attempt ${retryCount + 1}/${maxRetries} - Force reconfiguring Amplify...`);
            
            // Clear any existing configuration first
            if (typeof window !== 'undefined' && window.Amplify) {
              try {
                // Try to clear existing config
                window.Amplify.configure({});
                await new Promise(resolve => setTimeout(resolve, 100));
              } catch (clearError) {
                logger.debug('[OAuth Callback] Could not clear existing config:', clearError.message);
              }
            }
            
            // Force fresh configuration
            configureAmplify(true);
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Verify configuration is actually working
            const config = window.Amplify?.getConfig();
            if (!config?.Auth?.Cognito?.userPoolId) {
              throw new Error('Amplify configuration verification failed - no userPoolId');
            }
            
            if (!config?.Auth?.Cognito?.loginWith?.oauth) {
              throw new Error('Amplify OAuth configuration verification failed');
            }
            
            logger.debug(`[OAuth Callback] Attempt ${retryCount + 1}/${maxRetries} - Configuration verified, fetching auth session`);
            
            const authResponse = await fetchAuthSession({ forceRefresh: true });
            tokens = authResponse?.tokens;
            
            logger.debug('[OAuth Callback] Auth response:', { 
              hasTokens: !!tokens,
              hasAccessToken: !!tokens?.accessToken,
              hasIdToken: !!tokens?.idToken,
              accessTokenLength: tokens?.accessToken?.toString()?.length,
              idTokenLength: tokens?.idToken?.toString()?.length,
              isSignedIn: authResponse?.isSignedIn,
              attempt: retryCount + 1
            });
            
            // Enhanced token validation - check both existence and length
            if (tokens && 
                (tokens.accessToken?.toString()?.length > 50 || tokens.idToken?.toString()?.length > 50)) {
              logger.debug('[OAuth Callback] Valid tokens successfully retrieved');
              break; // Success! Exit the retry loop
            }
            
            // If no valid tokens yet, wait with exponential backoff and retry
            if (retryCount < maxRetries - 1) {
              const delay = Math.min(baseDelay * Math.pow(1.5, retryCount), maxDelay);
              logger.debug(`[OAuth Callback] No valid tokens yet, waiting ${delay}ms before retry ${retryCount + 2}`);
              setStatus(`Waiting for authentication to complete... (${retryCount + 1}/${maxRetries})`);
              setProgress(25 + (retryCount * 2)); // Gradually increase progress
              await new Promise(resolve => setTimeout(resolve, delay));
            }
            
            retryCount++;
          } catch (authError) {
            logger.error(`[OAuth Callback] Error on attempt ${retryCount + 1}:`, authError);
            
            // Special handling for Amplify configuration loss
            if (authError.message?.includes('Auth UserPool not configured') || 
                authError.message?.includes('configuration verification failed')) {
              logger.warn('[OAuth Callback] Amplify configuration issue detected, forcing complete reconfiguration...');
              
              // Try to completely reset and reconfigure Amplify
              try {
                if (typeof window !== 'undefined' && window.Amplify) {
                  window.Amplify.configure({});
                  await new Promise(resolve => setTimeout(resolve, 200));
                }
                
                // Force multiple configuration attempts
                for (let configAttempt = 0; configAttempt < 3; configAttempt++) {
                  configureAmplify(true);
                  await new Promise(resolve => setTimeout(resolve, 300));
                  
                  const testConfig = window.Amplify?.getConfig();
                  if (testConfig?.Auth?.Cognito?.userPoolId) {
                    logger.debug(`[OAuth Callback] Reconfiguration successful on attempt ${configAttempt + 1}`);
                    break;
                  }
                }
              } catch (reconfigError) {
                logger.error('[OAuth Callback] Reconfiguration failed:', reconfigError);
              }
              
              retryCount++;
              continue;
            }
            
            // If it's a network error or temporary issue, retry
            if (retryCount < maxRetries - 1 && (
              authError.message?.includes('network') ||
              authError.message?.includes('timeout') ||
              authError.message?.includes('fetch')
            )) {
              logger.debug('[OAuth Callback] Retrying due to network error');
              await new Promise(resolve => setTimeout(resolve, 1000));
              retryCount++;
              continue;
            }
            
            // For other errors, throw immediately
            throw authError;
          }
        }
        
        if (!tokens || (!tokens.accessToken && !tokens.idToken)) {
          // Final attempt: Check if user is actually authenticated despite token retrieval failure
          try {
            logger.debug('[OAuth Callback] Final attempt: checking current user status');
            
            // Ensure Amplify is configured for fallback check
            if (!isAmplifyConfigured()) {
              logger.debug('[OAuth Callback] Amplify not configured for fallback check, reconfiguring...');
              configureAmplify(true);
              await new Promise(resolve => setTimeout(resolve, 300));
            }
            
            const userAttributes = await fetchUserAttributes();
            if (userAttributes && userAttributes.email) {
              logger.debug('[OAuth Callback] User appears to be authenticated despite token retrieval issues');
              // Continue with the flow using a minimal token object
              tokens = { 
                accessToken: 'authenticated', 
                idToken: 'authenticated',
                _fallback: true 
              };
            } else {
              throw new Error(`No tokens received from OAuth callback after ${maxRetries} attempts. AWS Cognito may be experiencing delays.`);
            }
          } catch (fallbackError) {
            logger.error('[OAuth Callback] Fallback authentication check failed:', fallbackError);
            throw new Error(`No tokens received from OAuth callback after ${maxRetries} attempts. This may indicate an issue with the OAuth flow or AWS Cognito processing.`);
          }
        }
        
        logger.debug('[OAuth Callback] OAuth callback successful');
        setStatus('Checking account status...');
        setProgress(60);
        
        // Get user attributes to check onboarding status
        try {
          const userAttributes = await fetchUserAttributes();
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
            isNewUser: !userAttributes['custom:onboarding'] // Check if this is a new user
          });
          
          // Set all auth and onboarding cookies using the cookieManager
          setAuthCookies(tokens, userAttributes);
          
          // Determine where to redirect based on onboarding status
          const nextStep = determineOnboardingStep(userAttributes);
          let redirectUrl = '/dashboard'; // Default if complete
          
          logger.debug('[OAuth Callback] Onboarding step determination:', {
            nextStep,
            isComplete: nextStep === 'complete',
            userAttributes: {
              businessInfoDone: userAttributes['custom:business_info_done'],
              subscriptionDone: userAttributes['custom:subscription_done'],
              paymentDone: userAttributes['custom:payment_done'],
              setupDone: userAttributes['custom:setupdone'],
              onboardingStatus: userAttributes['custom:onboarding']
            }
          });
          
          setProgress(75);
          
          if (nextStep === 'business-info') {
            redirectUrl = '/onboarding/business-info';
            logger.debug('[OAuth Callback] New user or incomplete business info - redirecting to business-info');
          } else if (nextStep === 'subscription') {
            redirectUrl = '/onboarding/subscription';
            logger.debug('[OAuth Callback] Business info complete, need subscription - redirecting to subscription');
          } else if (nextStep === 'payment') {
            redirectUrl = '/onboarding/payment';
            logger.debug('[OAuth Callback] Subscription complete, need payment - redirecting to payment');
          } else if (nextStep === 'setup') {
            redirectUrl = '/onboarding/setup';
            logger.debug('[OAuth Callback] Payment complete, need setup - redirecting to setup');
          } else if (nextStep === 'complete') {
            redirectUrl = '/dashboard';
            logger.debug('[OAuth Callback] Onboarding complete - redirecting to dashboard');
          } else {
            // Any other status that isn't recognized - redirect to business info
            redirectUrl = '/onboarding/business-info';
            logger.debug('[OAuth Callback] Unknown onboarding status - redirecting to business-info as fallback');
          }
          
          // Add from parameter to prevent redirect loops
          redirectUrl += (redirectUrl.includes('?') ? '&' : '?') + 'from=oauth';
          logger.debug('[OAuth Callback] Final redirect decision:', {
            redirectUrl,
            nextStep,
            isNewUser: !userAttributes['custom:onboarding']
          });
          
          setStatus(`Redirecting to ${redirectUrl.split('?')[0]}...`);
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
        
        // Provide more specific error messages
        let errorParam = 'oauth';
        if (error.message?.includes('authorization code')) {
          errorParam = 'no_code';
        } else if (error.message?.includes('Token retrieval failed')) {
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
