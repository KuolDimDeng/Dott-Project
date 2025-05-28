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

  // Deployment identifier for tracking
  const DEPLOYMENT_VERSION = 'v2.0-enhanced-oauth-callback-' + Date.now();
  
  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('🚀 [ENHANCED OAUTH CALLBACK] Version:', DEPLOYMENT_VERSION);
        logger.debug('[OAuth Callback] Enhanced version loaded:', DEPLOYMENT_VERSION);
        logger.debug('[OAuth Callback] Auth callback page loaded, handling response');
        logger.debug('[OAuth Callback] Current URL:', window.location.href);
        
        // Extract URL parameters for debugging
        const urlParams = new URLSearchParams(window.location.search);
        const authCode = urlParams.get('code');
        const state = urlParams.get('state');
        const urlError = urlParams.get('error');
        
        logger.debug('[OAuth Callback] URL parameters:', {
          hasCode: !!authCode,
          codeLength: authCode?.length,
          codePreview: authCode ? authCode.substring(0, 20) + '...' : null,
          hasState: !!state,
          stateValue: state,
          hasError: !!urlError,
          errorDescription: urlParams.get('error_description'),
          allParams: Array.from(urlParams.entries())
        });
        
        // Check for OAuth errors in URL
        if (urlError) {
          logger.error('[OAuth Callback] OAuth error in URL:', urlError, urlParams.get('error_description'));
          throw new Error(`OAuth error: ${urlError} - ${urlParams.get('error_description') || 'Unknown error'}`);
        }
        
        if (!authCode) {
          logger.error('[OAuth Callback] No authorization code in URL');
          throw new Error('No authorization code received from OAuth provider');
        }
        
        logger.debug('[OAuth Callback] Authorization code present, proceeding with token exchange');
        
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
          
          console.log('🧪 Debug function added: window.testOnboardingLogic(attributes)');
        }
        
        // Fix: Ensure Amplify is properly configured before any auth operations
        logger.debug('[OAuth Callback] Step 1: Ensuring Amplify is configured...');
        
        // Force fresh configuration
        configureAmplify(true);
        
        // Wait a moment for configuration to settle
        logger.debug('[OAuth Callback] Step 2: Waiting for configuration to settle...');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Double-check configuration by accessing Amplify directly
        logger.debug('[OAuth Callback] Step 3: Verifying Amplify configuration...');
        try {
          const config = Amplify.getConfig();
          logger.debug('[OAuth Callback] Amplify config check:', {
            hasConfig: !!config,
            hasAuth: !!config?.Auth,
            hasCognito: !!config?.Auth?.Cognito,
            hasUserPoolId: !!config?.Auth?.Cognito?.userPoolId,
            userPoolId: config?.Auth?.Cognito?.userPoolId,
            hasOAuth: !!config?.Auth?.Cognito?.loginWith?.oauth,
            oauthDomain: config?.Auth?.Cognito?.loginWith?.oauth?.domain
          });
          
          if (!config?.Auth?.Cognito?.userPoolId) {
            logger.warn('[OAuth Callback] Amplify config missing after configuration, retrying...');
            configureAmplify(true);
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (configError) {
          logger.error('[OAuth Callback] Error checking Amplify config:', configError);
        }
        
        logger.debug('[OAuth Callback] Step 4: Starting enhanced token retrieval...');
        console.log('[OAuth Callback] Step 4: Starting enhanced token retrieval...');
        // Force deployment update - Enhanced OAuth callback with proper timing
        setStatus('Completing sign in...');
        
        // CRITICAL: Wait for Cognito to process the OAuth callback
        // The authorization code needs time to be exchanged for tokens
        logger.debug('[OAuth Callback] Step 4a: Waiting for Cognito to process authorization code...');
        console.log('[OAuth Callback] Step 4a: Waiting for Cognito to process authorization code...');
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds for processing
        
        // Enhanced token retrieval with proper timing
        let tokens;
        let attempts = 0;
        const maxAttempts = 8;
        const baseDelay = 2000; // Start with 2 seconds
        
        while (attempts < maxAttempts && !tokens) {
          attempts++;
          
          try {
            logger.debug(`[OAuth Callback] Step 4b: Token retrieval attempt ${attempts}/${maxAttempts}...`);
            console.log(`[OAuth Callback] Step 4b: Token retrieval attempt ${attempts}/${maxAttempts}...`);
            
            // Import the raw auth function directly
            const { fetchAuthSession: rawFetchAuthSession } = await import('aws-amplify/auth');
            
            // Create a timeout promise
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Token retrieval timeout')), 15000)
            );
            
            // Attempt to fetch the session
            const authPromise = rawFetchAuthSession({ forceRefresh: true });
            const authResponse = await Promise.race([authPromise, timeoutPromise]);
            
            logger.debug(`[OAuth Callback] Step 4c: Auth response received on attempt ${attempts}:`, authResponse);
            console.log(`[OAuth Callback] Step 4c: Auth response received on attempt ${attempts}:`, !!authResponse?.tokens);
            
            // Check if we have valid tokens
            const receivedTokens = authResponse?.tokens;
            if (receivedTokens && (receivedTokens.accessToken || receivedTokens.idToken)) {
              // Validate token quality
              const accessToken = receivedTokens.accessToken?.toString();
              const idToken = receivedTokens.idToken?.toString();
              
              if ((accessToken && accessToken.length > 100) || (idToken && idToken.length > 100)) {
                logger.debug('[OAuth Callback] Step 4d: Valid tokens received!');
                console.log('[OAuth Callback] Step 4d: Valid tokens received!');
                tokens = receivedTokens;
                break;
              } else {
                logger.debug(`[OAuth Callback] Step 4d: Tokens too short on attempt ${attempts}, retrying...`);
                console.log(`[OAuth Callback] Step 4d: Tokens too short on attempt ${attempts}, retrying...`);
              }
            } else {
              logger.debug(`[OAuth Callback] Step 4d: No tokens on attempt ${attempts}, retrying...`);
              console.log(`[OAuth Callback] Step 4d: No tokens on attempt ${attempts}, retrying...`);
            }
            
            // If we don't have tokens yet and have more attempts, wait before retrying
            if (!tokens && attempts < maxAttempts) {
              const delay = baseDelay + (attempts * 1000); // Increase delay each attempt
              logger.debug(`[OAuth Callback] Step 4e: Waiting ${delay}ms before next attempt...`);
              console.log(`[OAuth Callback] Step 4e: Waiting ${delay}ms before next attempt...`);
              setStatus(`Retrieving authentication tokens... (${attempts}/${maxAttempts})`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
            
          } catch (sessionError) {
            logger.error(`[OAuth Callback] Step 4f: Session fetch error on attempt ${attempts}:`, sessionError);
            console.error(`[OAuth Callback] Step 4f: Session fetch error on attempt ${attempts}:`, sessionError);
            
            // If it's a configuration error, try to recover
            if (sessionError.message?.includes('Auth UserPool not configured') || 
                sessionError.message?.includes('UserPool') ||
                sessionError.name === 'UserUnAuthenticatedException') {
              
              logger.warn(`[OAuth Callback] Amplify configuration lost on attempt ${attempts}, attempting recovery...`);
              
              try {
                // Force reconfiguration
                configureAmplify(true);
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Continue to next attempt
                if (attempts < maxAttempts) {
                  const delay = baseDelay + (attempts * 1000);
                  logger.debug(`[OAuth Callback] Configuration recovered, waiting ${delay}ms before retry...`);
                  setStatus(`Recovering authentication... (${attempts}/${maxAttempts})`);
                  await new Promise(resolve => setTimeout(resolve, delay));
                }
              } catch (recoveryError) {
                logger.error(`[OAuth Callback] Recovery failed on attempt ${attempts}:`, recoveryError);
                
                // If this is the last attempt, throw the error
                if (attempts >= maxAttempts) {
                  throw new Error('Authentication failed - unable to retrieve tokens after configuration recovery');
                }
              }
            } else {
              // For other errors, if this is the last attempt, throw
              if (attempts >= maxAttempts) {
                throw sessionError;
              }
              
              // Otherwise, wait and retry
              const delay = baseDelay + (attempts * 1000);
              logger.debug(`[OAuth Callback] Non-config error on attempt ${attempts}, waiting ${delay}ms before retry...`);
              setStatus(`Retrying authentication... (${attempts}/${maxAttempts})`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        }
        
        // Final check if we have valid tokens
        if (!tokens || (!tokens.accessToken && !tokens.idToken)) {
          // Last resort: Try fallback authentication check
          try {
            logger.debug('[OAuth Callback] Final fallback: Checking user attributes...');
            const { fetchUserAttributes: rawFetchUserAttributes } = await import('aws-amplify/auth');
            const userAttributes = await rawFetchUserAttributes();
            if (userAttributes && userAttributes.email) {
              logger.debug('[OAuth Callback] User is authenticated via fallback, proceeding...');
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
            throw new Error(`Authentication failed - no tokens received after ${maxAttempts} attempts`);
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