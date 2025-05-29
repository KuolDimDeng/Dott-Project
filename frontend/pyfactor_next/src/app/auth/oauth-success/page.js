'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cognitoAuth } from '@/lib/cognitoDirectAuth';
import CognitoAttributes from '@/utils/CognitoAttributes';

export default function OAuthSuccessPage() {
  const router = useRouter();
  const [status, setStatus] = useState('Completing authentication...');
  const [debugInfo, setDebugInfo] = useState({});

  useEffect(() => {
    const completeOAuthFlow = async () => {
      try {
        // Check if user is authenticated with direct OAuth
        if (!cognitoAuth.isAuthenticated()) {
          console.error('[OAuth Success] No authentication tokens found');
          router.push('/auth/signin?error=' + encodeURIComponent('Authentication failed'));
          return;
        }

        // Get user info from direct OAuth
        const user = cognitoAuth.getCurrentUser();
        if (!user) {
          console.error('[OAuth Success] No user information found');
          router.push('/auth/signin?error=' + encodeURIComponent('User information not found'));
          return;
        }

        console.log('[OAuth Success] User authenticated via direct OAuth:', user.email);

        // Get tenant ID using CognitoAttributes utility
        const userAttributes = cognitoAuth.getCustomAttributes() || {};
        const tenantIdFromAuth = CognitoAttributes.getTenantId(userAttributes);
        
        console.log('[OAuth Success] Tenant ID from CognitoAttributes.getTenantId():', tenantIdFromAuth);
        console.log('[OAuth Success] Custom attributes:', userAttributes);

        setDebugInfo({
          email: user.email,
          tenantId: tenantIdFromAuth,
          attributes: userAttributes,
          hasTokens: true
        });

        setStatus('Creating user account...');

        // Create/verify user account in backend
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://dott-env-fixed.eba-yek4sdqp.us-east-1.elasticbeanstalk.com';
          const signupResponse = await fetch(`${apiUrl}/api/auth/signup/`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('idToken')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              email: user.email,
              cognitoId: user.sub,
              firstName: user.given_name || '',
              lastName: user.family_name || '',
              userRole: 'owner',
              is_already_verified: true
            })
          });

          if (signupResponse.ok) {
            const signupData = await signupResponse.json();
            console.log('[OAuth Success] User account created/verified:', signupData);
            
            setStatus('Checking account status...');
            
            // Get the full user profile
            const profileResponse = await fetch(`${apiUrl}/api/auth/profile/`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('idToken')}`,
                'Content-Type': 'application/json'
              }
            });

            if (profileResponse.ok) {
              const userProfile = await profileResponse.json();
              console.log('[OAuth Success] User profile from API:', userProfile);
              
              // Store user info in localStorage and cache
              localStorage.setItem('user_profile', JSON.stringify(userProfile));
              
              if (typeof window !== 'undefined' && window.__APP_CACHE) {
                window.__APP_CACHE.user = window.__APP_CACHE.user || {};
                window.__APP_CACHE.user.profile = userProfile;
                window.__APP_CACHE.user.email = user.email;
              }

              // Check onboarding status
              const tenantId = userProfile.tenant_id || userProfile.tenantId || tenantIdFromAuth;
              const onboardingStatus = userProfile.onboarding_status || userProfile.onboardingStatus;
              const setupDone = userProfile.setup_done || userProfile.setupDone;

              // Store tenant ID if available
              if (tenantId) {
                localStorage.setItem('tenant_id', tenantId);
                if (typeof window !== 'undefined' && window.__APP_CACHE) {
                  window.__APP_CACHE.tenant = window.__APP_CACHE.tenant || {};
                  window.__APP_CACHE.tenant.id = tenantId;
                  window.__APP_CACHE.tenantId = tenantId;
                }
              }

              // Redirect based on onboarding status
              if (onboardingStatus === 'complete' || setupDone) {
                console.log('[OAuth Success] User is fully onboarded, redirecting to dashboard');
                setStatus('Redirecting to dashboard...');
                if (tenantId) {
                  router.push(`/tenant/${tenantId}/dashboard?fromAuth=true`);
                } else {
                  router.push('/dashboard?fromAuth=true');
                }
              } else {
                // User needs onboarding - redirect to onboarding
                console.log('[OAuth Success] User needs onboarding, redirecting...');
                setStatus('Setting up your account...');
                router.push('/onboarding?newUser=true&provider=google');
              }

            } else {
              // Profile fetch failed, but user was created - proceed with onboarding
              console.warn('[OAuth Success] Profile fetch failed but user exists, proceeding with onboarding');
              setStatus('Setting up your account...');
              router.push('/onboarding?newUser=true&provider=google');
            }

          } else {
            // Signup failed - try to get user profile directly (user might exist)
            const signupError = await signupResponse.text();
            console.warn('[OAuth Success] Signup failed:', signupError);
            
            const profileResponse = await fetch(`${apiUrl}/api/auth/profile/`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('idToken')}`,
                'Content-Type': 'application/json'
              }
            });

            if (profileResponse.ok) {
              const userProfile = await profileResponse.json();
              console.log('[OAuth Success] Existing user profile found:', userProfile);
              
              // Handle existing user flow
              const tenantId = userProfile.tenant_id || userProfile.tenantId;
              const onboardingStatus = userProfile.onboarding_status || userProfile.onboardingStatus;
              
              if (onboardingStatus === 'complete' && tenantId) {
                router.push(`/tenant/${tenantId}/dashboard?fromAuth=true`);
              } else {
                router.push('/onboarding?existingUser=true&provider=google');
              }
            } else {
              // Both signup and profile failed - fallback to onboarding
              console.error('[OAuth Success] Both signup and profile calls failed');
              setStatus('Starting account setup...');
              router.push('/onboarding?newUser=true&provider=google&fallback=true');
            }
          }

        } catch (apiError) {
          console.error('[OAuth Success] API error:', apiError);
          setStatus('There was an issue setting up your account. Redirecting to onboarding...');
          // Fallback - always redirect to onboarding if API calls fail
          setTimeout(() => {
            router.push('/onboarding?newUser=true&provider=google&error=api_failed');
          }, 2000);
        }

      } catch (error) {
        console.error('[OAuth Success] Error completing OAuth flow:', error);
        setStatus('Authentication error. Redirecting to sign in...');
        setTimeout(() => {
          router.push('/auth/signin?error=' + encodeURIComponent('OAuth completion failed'));
        }, 2000);
      }
    };

    completeOAuthFlow();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Completing Sign In
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {status}
          </p>
          
          {/* Debug info - only show in development */}
          {process.env.NODE_ENV === 'development' && Object.keys(debugInfo).length > 0 && (
            <div className="mt-4 p-4 bg-gray-100 rounded-lg text-left">
              <h3 className="text-sm font-medium text-gray-700">Debug Info:</h3>
              <pre className="text-xs text-gray-600 mt-2 overflow-auto">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
