'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/utils/logger';
import { getCacheValue, setCacheValue } from '@/utils/appCache';
import { cognitoAuth } from '@/lib/cognitoDirectAuth';

export default function OAuthSuccessPage() {
  const router = useRouter();
  const [status, setStatus] = useState('Completing authentication...');

  useEffect(() => {
    const completeOAuthFlow = async () => {
      try {
        // Check if user is authenticated with direct OAuth
        if (!cognitoAuth.isAuthenticated()) {
          logger.error('[OAuth Success] No authentication tokens found');
          router.push('/auth/signin?error=' + encodeURIComponent('Authentication failed'));
          return;
        }

        // Get user info from direct OAuth
        const user = cognitoAuth.getCurrentUser();
        if (!user) {
          logger.error('[OAuth Success] No user information found');
          router.push('/auth/signin?error=' + encodeURIComponent('User information not found'));
          return;
        }

        logger.debug('[OAuth Success] User authenticated via direct OAuth:', user.email);

        setStatus('Checking account status...');

        // Try to get additional user information from the API
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
          const response = await fetch(`${apiUrl}/api/users/profile`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('idToken')}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const userProfile = await response.json();
            logger.debug('[OAuth Success] User profile from API:', userProfile);
            
            // Store user profile in cache
            setCacheValue('user_profile', userProfile, { ttl: 3600000 });
            
            if (typeof window !== 'undefined' && window.__APP_CACHE) {
              window.__APP_CACHE.user = window.__APP_CACHE.user || {};
              window.__APP_CACHE.user.profile = userProfile;
              window.__APP_CACHE.user.email = user.email;
            }

            // Check if user has a tenant ID or needs onboarding
            const tenantId = userProfile.tenant_id || userProfile.tenantId;
            const onboardingStatus = userProfile.onboarding_status || userProfile.onboardingStatus;
            const setupDone = userProfile.setup_done || userProfile.setupDone;

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
                  router.push('/onboarding/setup');
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

          } else {
            logger.warn('[OAuth Success] Could not fetch user profile from API, proceeding with limited info');
            // Fallback: redirect to onboarding if we can't get user profile
            router.push('/onboarding');
          }

        } catch (apiError) {
          logger.warn('[OAuth Success] API call failed, proceeding with OAuth-only info:', apiError.message);
          
          // Fallback: For new OAuth users who might not exist in our system yet
          // Store basic user info from OAuth and redirect to onboarding
          if (typeof window !== 'undefined' && window.__APP_CACHE) {
            window.__APP_CACHE.user = window.__APP_CACHE.user || {};
            window.__APP_CACHE.user.email = user.email;
            window.__APP_CACHE.user.name = user.name;
            window.__APP_CACHE.user.picture = user.picture;
          }

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