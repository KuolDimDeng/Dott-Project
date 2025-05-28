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
        
        // Extract URL parameters for debugging
        const urlParams = new URLSearchParams(window.location.search);
        const authCode = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');
        
        logger.debug('[OAuth Callback] URL parameters:', {
          hasCode: !!authCode,
          codeLength: authCode?.length,
          hasState: !!state,
          hasError: !!error,
          errorDescription: urlParams.get('error_description')
        });
        
        // Check for OAuth errors in URL
        if (error) {
          throw new Error(`OAuth error: ${error} - ${urlParams.get('error_description') || 'Unknown error'}`);
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
          
          console.log('🧪 Debug function added: window.testOnboardingLogic(attributes)');
        }
        
        // Handle the OAuth callback with retry mechanism
        let tokens;
        let retryCount = 0;
        const maxRetries = 15; // Increased from 10 to 15
        const baseDelay = 1000; // Start with 1 second
        const maxDelay = 8000; // Cap at 8 seconds
        
        setStatus('Waiting for AWS Cognito to process authentication...');
        setProgress(30);
        
        // Initial delay to allow Cognito to process the OAuth callback
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        while (retryCount < maxRetries) {
          try {
            logger.debug(`[OAuth Callback] Attempt ${retryCount + 1}/${maxRetries} to fetch auth session`);
            
            // Calculate exponential backoff delay
            const delay = Math.min(baseDelay * Math.pow(1.5, retryCount), maxDelay);
            
            const authResponse = await fetchAuthSession({ 
              forceRefresh: true,
              // Add timeout to prevent hanging
              timeout: 10000
            });
            
            tokens = authResponse?.tokens;
            
            logger.debug('[OAuth Callback] Auth response:', { 
              hasTokens: !!tokens,
              hasAccessToken: !!tokens?.accessToken,
              hasIdToken: !!tokens?.idToken,
              isSignedIn: authResponse?.isSignedIn,
              attempt: retryCount + 1,
              nextDelay: delay
            });
            
            // Check for valid tokens
            if (tokens && (tokens.accessToken || tokens.idToken)) {
              // Validate token structure
              const accessToken = tokens.accessToken?.toString();
              const idToken = tokens.idToken?.toString();
              
              if ((accessToken && accessToken.length > 50) || (idToken && idToken.length > 50)) {
                logger.debug('[OAuth Callback] Valid tokens successfully retrieved');
                break; // Success! Exit the retry loop
              } else {
                logger.debug('[OAuth Callback] Tokens received but appear invalid (too short)');
              }
            }
            
            // If no valid tokens yet, wait with exponential backoff
            if (retryCount < maxRetries - 1) {
              logger.debug(`[OAuth Callback] No valid tokens yet, waiting ${delay}ms before retry ${retryCount + 2}`);
              setStatus(`Waiting for authentication to complete... (${retryCount + 1}/${maxRetries})`);
              setProgress(30 + (retryCount * 3)); // Gradually increase progress
              await new Promise(resolve => setTimeout(resolve, delay));
            }
            
            retryCount++;
          } catch (authError) {
            logger.error(`[OAuth Callback] Error on attempt ${retryCount + 1}:`, authError);
            
            // Check if it's a recoverable error
            const isRecoverable = authError.message?.includes('network') ||
                                authError.message?.includes('timeout') ||
                                authError.message?.includes('fetch') ||
                                authError.message?.includes('AbortError') ||
                                authError.name === 'NetworkError';
            
            if (retryCount < maxRetries - 1 && isRecoverable) {
              logger.debug('[OAuth Callback] Retrying due to recoverable error');
              const delay = Math.min(baseDelay * Math.pow(1.5, retryCount), maxDelay);
              await new Promise(resolve => setTimeout(resolve, delay));
              retryCount++;
              continue;
            }
            
            // For non-recoverable errors or max retries reached, throw
            if (retryCount >= maxRetries - 1) {
              throw new Error(`Token retrieval failed after ${maxRetries} attempts. Last error: ${authError.message}`);
            }
            
            throw authError;
          }
        } catch (authError) {
            logger.error(`[OAuth Callback] Error on attempt ${retryCount + 1}:`, authError);
            
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
