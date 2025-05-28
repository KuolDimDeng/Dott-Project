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
        const maxRetries = 10; // Try for up to 10 seconds
        
        while (retryCount < maxRetries) {
          try {
            logger.debug(`[OAuth Callback] Attempt ${retryCount + 1}/${maxRetries} to fetch auth session`);
            
            const authResponse = await fetchAuthSession({ forceRefresh: true });
            tokens = authResponse?.tokens;
            
            logger.debug('[OAuth Callback] Auth response:', { 
              hasTokens: !!tokens,
              hasAccessToken: !!tokens?.accessToken,
              hasIdToken: !!tokens?.idToken,
              isSignedIn: authResponse?.isSignedIn,
              attempt: retryCount + 1
            });
            
            if (tokens && (tokens.accessToken || tokens.idToken)) {
              logger.debug('[OAuth Callback] Tokens successfully retrieved');
              break; // Success! Exit the retry loop
            }
            
            // If no tokens yet, wait and retry
            if (retryCount < maxRetries - 1) {
              logger.debug(`[OAuth Callback] No tokens yet, waiting 1 second before retry ${retryCount + 2}`);
              setStatus(`Waiting for authentication to complete... (${retryCount + 1}/${maxRetries})`);
              setProgress(25 + (retryCount * 3)); // Gradually increase progress
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            retryCount++;
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
          throw new Error(`No tokens received from OAuth callback after ${maxRetries} attempts. This may indicate an issue with the OAuth flow or AWS Cognito processing.`);
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
