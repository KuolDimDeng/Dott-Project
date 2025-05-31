'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cognitoAuth } from '@/lib/cognitoDirectAuth';
import { CognitoAttributes } from '@/utils/CognitoAttributes';
import { OAuthDebugUtils } from '@/utils/oauthDebugUtils';
import { logger } from '@/utils/logger';

export default function OAuthSuccessPage() {
  const router = useRouter();
  const [status, setStatus] = useState('Processing authentication...');
  const [debugInfo, setDebugInfo] = useState({});

  useEffect(() => {
    const completeOAuthFlow = async () => {
      try {
        // Set a flag to prevent layout scripts from interfering during OAuth flow
        if (typeof window !== 'undefined') {
          window.__OAUTH_IN_PROGRESS = true;
          if (window.__APP_CACHE) {
            window.__APP_CACHE.oauth_in_progress = true;
          }
        }

        // Log initial authentication status
        console.log('[OAuth Success] Starting OAuth completion flow');
        const initialStatus = OAuthDebugUtils.logAuthInfo();
        
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

        // Enhanced tenant ID extraction with multiple fallback methods
        let tenantId = null;
        let extractionMethod = 'none';
        
        // Method 1: Direct from cognitoAuth
        tenantId = cognitoAuth.getTenantId();
        if (tenantId) {
          extractionMethod = 'cognitoAuth.getTenantId()';
          console.log('[OAuth Success] Tenant ID from cognitoAuth.getTenantId():', tenantId);
        }
        
        // Method 2: From user object properties
        if (!tenantId) {
          tenantId = user.tenantId || user.tenant_id || user.businessId || user.business_id;
          if (tenantId) {
            extractionMethod = 'user object properties';
            console.log('[OAuth Success] Tenant ID from user object:', tenantId);
          }
        }
        
        // Method 3: Using CognitoAttributes utility
        if (!tenantId) {
          const userAttributes = cognitoAuth.getCustomAttributes() || {};
          tenantId = CognitoAttributes.getTenantId(userAttributes);
          if (tenantId) {
            extractionMethod = 'CognitoAttributes.getTenantId()';
            console.log('[OAuth Success] Tenant ID from CognitoAttributes.getTenantId():', tenantId);
          }
        }
        
        // Method 4: Direct ID token parsing with comprehensive attribute checking
        if (!tenantId) {
          try {
            const idToken = localStorage.getItem('idToken');
            if (idToken) {
              const payload = JSON.parse(atob(idToken.split('.')[1]));
              
              // Check all possible tenant ID attribute variations
              const tenantAttributes = [
                'custom:tenant_ID',
                'custom:tenant_id', 
                'custom:businessid',
                'custom:business_id',
                'custom:tenantId',
                'custom:businessID',
                'custom:business_ID',
                'tenant_ID',
                'tenant_id',
                'businessid',
                'business_id'
              ];
              
              for (const attr of tenantAttributes) {
                if (payload[attr]) {
                  tenantId = payload[attr];
                  extractionMethod = `ID token: ${attr}`;
                  console.log('[OAuth Success] Tenant ID from ID token attribute:', attr, '=', tenantId);
                  break;
                }
              }
            }
          } catch (e) {
            console.warn('[OAuth Success] Error decoding ID token:', e);
          }
        }
        
        // Method 5: Check localStorage for previously stored tenant ID
        if (!tenantId) {
          const storedTenantId = localStorage.getItem('tenant_id') || 
                                localStorage.getItem('tenantId') ||
                                localStorage.getItem('businessId');
          if (storedTenantId) {
            tenantId = storedTenantId;
            extractionMethod = 'localStorage fallback';
            console.log('[OAuth Success] Tenant ID from localStorage:', tenantId);
          }
        }

        // Get comprehensive user attributes for analysis
        const customAttributes = cognitoAuth.getCustomAttributes() || {};
        const allUserAttributes = cognitoAuth.getUserAttributes() || {};
        
        // Enhanced onboarding status detection
        const onboardingStatus = customAttributes['custom:onboarding'] || 
                               allUserAttributes['custom:onboarding'] ||
                               'not_started';
        
        const setupDone = (customAttributes['custom:setupdone'] === 'true' || 
                          customAttributes['custom:setupdone'] === 'TRUE' ||
                          allUserAttributes['custom:setupdone'] === 'true' ||
                          allUserAttributes['custom:setupdone'] === 'TRUE');

        // Enhanced debug information
        setDebugInfo({
          email: user.email,
          userId: user.sub,
          tenantId: tenantId,
          extractionMethod: extractionMethod,
          userObject: user,
          customAttributes: customAttributes,
          allUserAttributes: allUserAttributes,
          hasTokens: true,
          onboardingStatus: onboardingStatus,
          setupDone: setupDone,
          hasExistingTenant: !!tenantId,
          authStatus: initialStatus
        });

        setStatus('Determining user status...');

        // Determine user status based on available information
        const hasExistingTenant = !!tenantId;
        const isNewUser = !hasExistingTenant;
        
        console.log('[OAuth Success] Enhanced user status analysis:', {
          email: user.email,
          hasExistingTenant,
          isNewUser,
          tenantId,
          extractionMethod,
          onboardingStatus,
          setupDone,
          customAttributesCount: Object.keys(customAttributes).length,
          allAttributesCount: Object.keys(allUserAttributes).length
        });

        // Store comprehensive user info in localStorage and cache
        const userProfile = {
          id: user.sub,
          email: user.email,
          first_name: user.given_name || user.name?.split(' ')[0] || '',
          last_name: user.family_name || user.name?.split(' ')[1] || '',
          cognito_id: user.sub,
          tenant_id: tenantId,
          tenantId: tenantId,
          onboarding_status: onboardingStatus,
          setup_done: setupDone,
          is_verified: true,
          customAttributes: customAttributes,
          allAttributes: allUserAttributes,
          extraction_method: extractionMethod
        };

        localStorage.setItem('user_profile', JSON.stringify(userProfile));
        localStorage.setItem('user_email', user.email);
        localStorage.setItem('cognito_sub', user.sub);
        
        if (tenantId) {
          localStorage.setItem('tenant_id', tenantId);
          localStorage.setItem('tenantId', tenantId); // Alternative storage
        }

        // Enhanced app cache storage
        if (typeof window !== 'undefined' && window.__APP_CACHE) {
          window.__APP_CACHE.user = window.__APP_CACHE.user || {};
          window.__APP_CACHE.user.profile = userProfile;
          window.__APP_CACHE.user.email = user.email;
          window.__APP_CACHE.user.lastLogin = new Date().toISOString();
          
          if (tenantId) {
            window.__APP_CACHE.tenant = window.__APP_CACHE.tenant || {};
            window.__APP_CACHE.tenant.id = tenantId;
            window.__APP_CACHE.tenantId = tenantId;
          }
          
          // Store OAuth completion status
          window.__APP_CACHE.oauth = {
            completed: true,
            timestamp: new Date().toISOString(),
            provider: 'google'
          };
        }

        // Use debug utilities to get recommended redirect
        const recommendation = OAuthDebugUtils.getRecommendedRedirect();
        console.log('[OAuth Success] Redirect recommendation:', recommendation);

        // Enhanced redirect logic based on user status and onboarding progress
        setStatus('Redirecting...');
        
        // Clear the OAuth in progress flag before redirect
        if (typeof window !== 'undefined') {
          window.__OAUTH_IN_PROGRESS = false;
          if (window.__APP_CACHE) {
            window.__APP_CACHE.oauth_in_progress = false;
          }
        }
        
        // Priority logic:
        // 1. If setup is complete and has tenant -> go to tenant dashboard
        // 2. If has tenant but setup not complete -> continue onboarding at appropriate step
        // 3. If no tenant -> start fresh onboarding
        // 4. Special handling for edge cases
        
        if (setupDone && tenantId) {
          console.log('[OAuth Success] User setup complete, redirecting to tenant dashboard');
          router.push(`/tenant/${tenantId}/dashboard?fromAuth=true&provider=google`);
        } else if (tenantId && onboardingStatus !== 'not_started') {
          // User has a tenant but onboarding is incomplete - continue where they left off
          console.log('[OAuth Success] User has tenant but incomplete onboarding, continuing from:', onboardingStatus);
          
          // Enhanced step determination based on onboarding status
          let nextStep = '/onboarding';
          const normalizedStatus = onboardingStatus.toLowerCase().replace(/[_-]/g, '');
          
          switch (normalizedStatus) {
            case 'businessinfo':
            case 'business':
              nextStep = '/onboarding/subscription';
              break;
            case 'subscription':
            case 'plan':
              nextStep = '/onboarding/payment';
              break;
            case 'payment':
            case 'billing':
              nextStep = '/onboarding/setup';
              break;
            case 'setup':
            case 'configuration':
              nextStep = '/onboarding/setup';
              break;
            case 'complete':
            case 'completed':
            case 'done':
              if (tenantId) {
                nextStep = `/tenant/${tenantId}/dashboard`;
              } else {
                nextStep = '/dashboard';
              }
              break;
            default:
              // For unknown statuses, start from business info
              nextStep = '/onboarding/business-info';
          }
          
          router.push(`${nextStep}?fromAuth=true&provider=google&tenantId=${tenantId}`);
        } else if (tenantId && onboardingStatus === 'not_started') {
          // User has tenant but onboarding not started - this might be an existing user
          console.log('[OAuth Success] User has tenant but onboarding not started, checking if setup is done');
          
          if (setupDone) {
            // Setup is done, go to dashboard
            router.push(`/tenant/${tenantId}/dashboard?fromAuth=true&provider=google`);
          } else {
            // Start onboarding with existing tenant
            router.push(`/onboarding/business-info?fromAuth=true&provider=google&tenantId=${tenantId}&existingTenant=true`);
          }
        } else {
          // New user or no tenant - start fresh onboarding
          console.log('[OAuth Success] New user or no tenant, starting fresh onboarding');
          router.push('/onboarding/business-info?newUser=true&provider=google&fromAuth=true');
        }

        // Log final status after redirect decision
        OAuthDebugUtils.logAuthInfo();

      } catch (error) {
        console.error('[OAuth Success] Error completing OAuth flow:', error);
        setStatus('Authentication error. Redirecting to sign in...');
        
        // Clear the OAuth in progress flag on error
        if (typeof window !== 'undefined') {
          window.__OAUTH_IN_PROGRESS = false;
          if (window.__APP_CACHE) {
            window.__APP_CACHE.oauth_in_progress = false;
          }
        }
        
        // Enhanced error handling with specific error types
        let errorMessage = 'OAuth completion failed';
        if (error.message.includes('tenant')) {
          errorMessage = 'Unable to determine account status';
        } else if (error.message.includes('token')) {
          errorMessage = 'Authentication token error';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network connection error';
        }
        
        // Log error details for debugging
        console.error('[OAuth Success] Error details:', {
          message: error.message,
          stack: error.stack,
          debugInfo: debugInfo
        });
        
        setTimeout(() => {
          router.push('/auth/signin?error=' + encodeURIComponent(errorMessage));
        }, 3000);
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
          
          {/* Enhanced debug info - show in development and when there are issues */}
          {(process.env.NODE_ENV === 'development' || status.includes('error')) && Object.keys(debugInfo).length > 0 && (
            <div className="mt-4 p-4 bg-gray-100 rounded-lg text-left">
              <h3 className="text-sm font-medium text-gray-700">Debug Info:</h3>
              <div className="text-xs text-gray-600 mt-2 space-y-1">
                <div><strong>Email:</strong> {debugInfo.email}</div>
                <div><strong>User ID:</strong> {debugInfo.userId}</div>
                <div><strong>Tenant ID:</strong> {debugInfo.tenantId || 'Not found'}</div>
                <div><strong>Extraction Method:</strong> {debugInfo.extractionMethod}</div>
                <div><strong>Onboarding Status:</strong> {debugInfo.onboardingStatus}</div>
                <div><strong>Setup Done:</strong> {debugInfo.setupDone ? 'Yes' : 'No'}</div>
                <div><strong>Has Existing Tenant:</strong> {debugInfo.hasExistingTenant ? 'Yes' : 'No'}</div>
                <div><strong>Custom Attributes:</strong> {Object.keys(debugInfo.customAttributes || {}).length} found</div>
                <div><strong>All Attributes:</strong> {Object.keys(debugInfo.allUserAttributes || {}).length} found</div>
              </div>
              
              {process.env.NODE_ENV === 'development' && (
                <details className="mt-2">
                  <summary className="text-xs cursor-pointer text-blue-600">Show Raw Data</summary>
                  <pre className="text-xs text-gray-600 mt-2 overflow-auto max-h-64 bg-white p-2 rounded">
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                </details>
              )}
              
              {/* Quick debug actions in development */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-2 space-x-2">
                  <button
                    onClick={() => console.log('Debug Export:', OAuthDebugUtils.exportDebugData())}
                    className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                  >
                    Export Debug Data
                  </button>
                  <button
                    onClick={() => window.open('/auth/debug', '_blank')}
                    className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200"
                  >
                    Open Debug Page
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
