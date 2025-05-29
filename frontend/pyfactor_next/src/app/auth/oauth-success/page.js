'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/utils/logger';
import { getCacheValue, setCacheValue } from '@/utils/appCache';

export default function OAuthSuccessPage() {
  const router = useRouter();
  const [status, setStatus] = useState('Completing authentication...');

  useEffect(() => {
    const completeOAuthFlow = async () => {
      try {
        // Get OAuth user info from cache
        const oauthEmail = getCacheValue('oauth_user_email');
        const oauthProvider = getCacheValue('oauth_provider');
        
        logger.debug('[OAuth Success] Processing OAuth user:', { email: oauthEmail, provider: oauthProvider });

        setStatus('Checking account status...');

        // Configure Amplify if needed
        if (typeof window !== 'undefined' && window.reconfigureAmplify) {
          logger.debug('[OAuth Success] Ensuring Amplify is configured');
          window.reconfigureAmplify();
        }

        // Import Amplify functions
        const { getCurrentUser, fetchUserAttributes, signIn } = await import('@/config/amplifyUnified');

        try {
          // Try to get current user - this should work if OAuth properly synced
          const currentUser = await getCurrentUser();
          logger.debug('[OAuth Success] Current user found:', currentUser);

          // Get user attributes
          const userAttributes = await fetchUserAttributes();
          logger.debug('[OAuth Success] User attributes:', {
            email: userAttributes.email,
            onboarding: userAttributes['custom:onboarding'],
            tenantId: userAttributes['custom:tenant_ID'],
            setupDone: userAttributes['custom:setupdone']
          });

          // Store user attributes in cache
          setCacheValue('user_attributes', userAttributes, { ttl: 3600000 });
          
          if (typeof window !== 'undefined' && window.__APP_CACHE) {
            window.__APP_CACHE.user = window.__APP_CACHE.user || {};
            window.__APP_CACHE.user.attributes = userAttributes;
            window.__APP_CACHE.user.email = userAttributes.email;
          }

          // Check onboarding status
          const onboardingStatus = (userAttributes['custom:onboarding'] || '').toLowerCase();
          const setupDone = (userAttributes['custom:setupdone'] || '').toLowerCase() === 'true';
          const tenantId = userAttributes['custom:tenant_ID'];

          logger.info('[OAuth Success] User status:', { onboardingStatus, setupDone, tenantId });

          // Store tenant ID if available
          if (tenantId) {
            if (typeof window !== 'undefined' && window.__APP_CACHE) {
              window.__APP_CACHE.tenant = window.__APP_CACHE.tenant || {};
              window.__APP_CACHE.tenant.id = tenantId;
              window.__APP_CACHE.tenantId = tenantId;
            }
            localStorage.setItem('tenant_id', tenantId);
            setCacheValue('tenantId', tenantId, { ttl: 24 * 60 * 60 * 1000 });
          }

          // Redirect based on onboarding status
          if (onboardingStatus === 'complete' || setupDone) {
            logger.debug('[OAuth Success] User is fully onboarded, redirecting to dashboard');
            if (tenantId) {
              router.push(`/tenant/${tenantId}/dashboard?fromAuth=true`);
            } else {
              router.push('/dashboard?fromAuth=true');
            }
          } else if (onboardingStatus) {
            // Handle specific onboarding steps
            logger.debug('[OAuth Success] User needs to complete onboarding:', onboardingStatus);
            switch(onboardingStatus) {
              case 'business_info':
              case 'business-info':
                router.push('/onboarding/subscription');
                break;
              case 'subscription':
                router.push('/onboarding/subscription');
                break;
              case 'payment':
                // Check for free/basic plans
                const subplan = userAttributes['custom:subplan']?.toLowerCase();
                if (subplan === 'free' || subplan === 'basic') {
                  logger.info('[OAuth Success] Free/Basic plan user, redirecting to dashboard');
                  if (tenantId) {
                    router.push(`/tenant/${tenantId}/dashboard?fromAuth=true`);
                  } else {
                    router.push('/dashboard?fromAuth=true');
                  }
                } else {
                  router.push('/onboarding/setup');
                }
                break;
              case 'setup':
                router.push('/onboarding/setup');
                break;
              default:
                router.push('/onboarding');
            }
          } else {
            // No onboarding status, start onboarding
            logger.debug('[OAuth Success] No onboarding status, starting onboarding');
            router.push('/onboarding');
          }

        } catch (userError) {
          logger.warn('[OAuth Success] No Amplify user found, likely a new OAuth user:', userError.message);
          
          // This is likely a new OAuth user who needs to be created in Cognito
          // For now, send them to onboarding
          logger.info('[OAuth Success] New OAuth user, redirecting to onboarding');
          router.push('/onboarding');
        }

      } catch (error) {
        logger.error('[OAuth Success] Error completing OAuth flow:', error);
        router.push('/auth/signin?error=' + encodeURIComponent('OAuth completion failed'));
      }
    };

    completeOAuthFlow();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Almost there!
          </h2>
          <div className="mt-8 space-y-4">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
            <p className="text-sm text-gray-600">{status}</p>
          </div>
        </div>
      </div>
    </div>
  );
} 