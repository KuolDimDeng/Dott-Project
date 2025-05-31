///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/layout.js
import '../lib/amplifyConfig'; // Import Amplify config early
// Add reconfiguration script for Amplify
import { Inter, Montserrat } from 'next/font/google';
import './globals.css';
import Providers from './providers';
import Script from 'next/script';
import { Toaster } from 'react-hot-toast';
import TenantRecoveryWrapper from '@/components/TenantRecoveryWrapper';
import AuthInitializer from '@/components/AuthInitializer';
import ClientSideScripts from '@/components/ClientSideScripts';
import DynamicComponents from '@/components/DynamicComponents';
// Menu privilege system has been replaced with page privileges
// import MenuPrivilegeInitializer from '@/components/MenuPrivilegeInitializer';
// DO NOT directly import scripts here as they will run in server context
// Scripts will be loaded via next/script in the component

const inter = Inter({ subsets: ['latin'] });
const montserrat = Montserrat({ subsets: ['latin'] });

// Using local font styling instead of next/font/google to prevent build errors
export const metadata = {
  title: 'Dott: Small Business Software',
  description: 'Streamline your business operations with Dott',
};

// Root layout component (Server Component)
export default async function RootLayout({ children, params }) {
  return (
    <html lang="en" className={`${inter.variable} ${montserrat.variable}`} suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        
        {/* Direct inline menu fix - highest priority */}
        <script 
          dangerouslySetInnerHTML={{ 
            __html: `
              // Force menu item visibility with inline script
              (function() {
                try {
                  // Add extremely high priority style
                  const style = document.createElement('style');
                  style.innerHTML = '/* Force all second spans in menu buttons to be visible */ body #main-menu-container button span + span, body nav[aria-label="Main Navigation"] button span + span { display: inline-block !important; visibility: visible !important; opacity: 1 !important; position: static !important; color: #1f2937 !important; font-weight: 500 !important; margin-left: 12px !important; }';
                  document.head.appendChild(style);
                  console.log('[InlineMenuFix] Applied emergency inline fix');
                } catch(e) {
                  console.error('[InlineMenuFix] Error applying inline fix:', e);
                }
              })();
            `
          }}
        />
        
        {/* Simplified tenant initialization */}
        <script 
          dangerouslySetInnerHTML={{ 
            __html: `
            // Direct OAuth tenant ID extraction - works with localStorage tokens
            // Replaces Amplify-based extraction with direct token approach
            async function initializeTenantFromDirectOAuth() {
              try {
                console.log('[Layout] Initializing tenant ID from direct OAuth tokens');
                
                // Check if OAuth is in progress and skip to avoid interference
                if (window.__OAUTH_IN_PROGRESS || (window.__APP_CACHE && window.__APP_CACHE.oauth_in_progress)) {
                  console.log('[Layout] OAuth in progress, skipping tenant initialization to avoid interference');
                  return null;
                }
                
                // Check if we have direct OAuth tokens
                const idToken = localStorage.getItem('idToken');
                const accessToken = localStorage.getItem('accessToken');
                
                if (!idToken && !accessToken) {
                  // Check AppCache for cached user profile
                  const cachedProfile = window.__APP_CACHE?.user?.profile;
                  const cachedTenantId = window.__APP_CACHE?.tenantId || window.__APP_CACHE?.tenant?.id;
                  
                  if (cachedTenantId) {
                    console.log('[Layout] Found cached tenant ID:', cachedTenantId);
                    return cachedTenantId;
                  }
                  
                  if (Math.random() < 0.1) { // Only log 10% of the time
                    console.debug('[Layout] No OAuth tokens or cached tenant ID found');
                  }
                  return null;
                }
                
                // Try to get tenant ID from cached user profile first
                let tenantId = window.__APP_CACHE?.tenantId || window.__APP_CACHE?.tenant?.id;
                if (tenantId) {
                  console.log('[Layout] Found tenant ID in AppCache:', tenantId);
                  return tenantId;
                }
                
                // Skip API calls if we're on OAuth-related pages to prevent interference
                const currentPath = window.location.pathname;
                if (currentPath.includes('/auth/') || currentPath.includes('/oauth') || currentPath.includes('/callback')) {
                  console.log('[Layout] Skipping API calls on auth pages to prevent OAuth interference');
                  return null;
                }
                
                // If no cached tenant ID, try to get user profile from API (only if not in OAuth flow)
                try {
                  const apiUrl = 'https://api.dottapps.com';
                  const response = await fetch(apiUrl + '/api/users/profile', {
                    method: 'GET',
                    headers: {
                      'Authorization': 'Bearer ' + (idToken || accessToken),
                      'Content-Type': 'application/json'
                    }
                  });
                  
                  if (response.ok) {
                    const userProfile = await response.json();
                    console.log('[Layout] Got user profile from API:', !!userProfile);
                    
                    // Extract tenant ID from profile using various possible field names
                    tenantId = userProfile.tenant_id || 
                              userProfile.tenantId || 
                              userProfile['custom:tenant_ID'] ||
                              userProfile['custom:tenant_id'] ||
                              userProfile['custom:businessid'];
                    
                    if (tenantId) {
                      console.log('[Layout] Found tenant ID from API profile:', tenantId);
                      
                      // Store in AppCache
                      if (window.__APP_CACHE) {
                        window.__APP_CACHE.tenantId = tenantId;
                        window.__APP_CACHE.tenant = { id: tenantId };
                        window.__APP_CACHE.user = window.__APP_CACHE.user || {};
                        window.__APP_CACHE.user.profile = userProfile;
                      }
                      
                      // Redirect to tenant-specific URL if on root
                      const path = window.location.pathname;
                      if (path === '/' || path === '') {
                        window.location.href = '/tenant/' + tenantId;
                      }
                      
                      return tenantId;
                    } else {
                      console.log('[Layout] No tenant ID found in user profile - new user may need onboarding');
                    }
                  } else {
                    console.log('[Layout] API call failed:', response.status, response.statusText);
                  }
                } catch (apiError) {
                  console.log('[Layout] Error calling user profile API:', apiError.message);
                }
                
                // If we have tokens but no tenant ID from API, decode the ID token to check for attributes
                if (idToken) {
                  try {
                    // Basic JWT decode (not verification, just reading payload)
                    const payload = JSON.parse(atob(idToken.split('.')[1]));
                    
                    tenantId = payload['custom:tenant_ID'] || 
                              payload['custom:tenant_id'] ||
                              payload['custom:businessid'] ||
                              payload['custom:tenantId'];
                    
                    if (tenantId) {
                      console.log('[Layout] Found tenant ID in JWT token:', tenantId);
                      
                      // Store in AppCache
                      if (window.__APP_CACHE) {
                        window.__APP_CACHE.tenantId = tenantId;
                        window.__APP_CACHE.tenant = { id: tenantId };
                      }
                      
                      // Redirect to tenant-specific URL if on root
                      const path = window.location.pathname;
                      if (path === '/' || path === '') {
                        window.location.href = '/tenant/' + tenantId;
                      }
                      
                      return tenantId;
                    }
                  } catch (jwtError) {
                    console.log('[Layout] Error decoding JWT token:', jwtError.message);
                  }
                }
                
                // Reduced logging frequency for production
                if (Math.random() < 0.1) { // Only log 10% of the time
                  console.debug('[Layout] No tenant ID found in OAuth tokens or API');
                }
                return null;
              } catch (error) {
                console.error('[Layout] Error initializing tenant from direct OAuth:', error);
                return null;
              }
            }
            
            // Initialize tenant ID on page load
            if (typeof window !== 'undefined') {
              // Initialize AppCache if not present
              if (!window.__APP_CACHE) {
                window.__APP_CACHE = { 
                  auth: { provider: 'direct-oauth', initialized: true }, 
                  user: {}, 
                  tenant: {},
                  tenants: {}
                };
              }
              
              // Initialize tenant after a longer delay to avoid OAuth interference
              // Check if OAuth was recently completed before running
              setTimeout(() => {
                // Only run if OAuth is not in progress and hasn't been completed recently
                const recentOAuthCompletion = window.__APP_CACHE?.oauth?.completed && 
                  window.__APP_CACHE?.oauth?.timestamp &&
                  (Date.now() - new Date(window.__APP_CACHE.oauth.timestamp).getTime()) < 10000; // 10 seconds
                
                if (!window.__OAUTH_IN_PROGRESS && 
                    !(window.__APP_CACHE && window.__APP_CACHE.oauth_in_progress) &&
                    !recentOAuthCompletion) {
                  initializeTenantFromDirectOAuth();
                } else {
                  console.log('[Layout] Skipping tenant initialization - OAuth recently completed or in progress');
                }
              }, 3000); // Increased from 1000ms to 3000ms
            }
            `
          }}
        />
      </head>
      <body className={inter.className}>
        <AuthInitializer />
        <ClientSideScripts />
        <Providers>
          {children}
        </Providers>
        <Toaster position="top-right" />
        <Script id="user-session-info" strategy="afterInteractive">
          {`
            // Use app cache functions from window global
            const getCacheValue = window.__APP_CACHE ? (key, defaultValue = null) => {
              const entry = window.__APP_CACHE[key];
              return entry ? (entry.value !== undefined ? entry.value : entry) : defaultValue;
            } : () => null;
            
            console.log('[RootLayout] Page loaded:', {
              pathname: window.location.pathname,
              tenantId: getCacheValue('tenantId'),
              businessId: getCacheValue('businessid')
            });
            
            // Client-side redirection based on AppCache instead of localStorage
            try {
              const path = window.location.pathname;
              if (path === '/' || path === '') {
                const tenantId = getCacheValue('tenantId') || getCacheValue('businessid');
                if (tenantId) {
                  window.location.href = '/tenant/' + tenantId;
                }
              }
            } catch (e) {
              console.error('Error during client-side redirect:', e);
            }
          `}
        </Script>
        
        {/* HTTPS is handled by AWS Certificate Manager and Vercel - no self-signed certificates needed */}
        
        {/* Dashboard redirect fix script initialization */}
        <Script id="dashboard-redirect-fix" strategy="beforeInteractive">
          {`
            // Ensure script is loaded early for dashboard redirects
            if (typeof window !== 'undefined' && !window.__APP_CACHE) {
              window.__APP_CACHE = { 
                auth: { provider: 'direct-oauth', initialized: true }, 
                user: {}, 
                tenant: {},
                tenants: {}
              };
              console.log('[Layout] AppCache initialized for dashboard redirect fix (beforeInteractive)');
            }
          `}
        </Script>
        
        {/* OAuth debugging functions - available globally */}
        <script 
          dangerouslySetInnerHTML={{ 
            __html: `
              // Direct OAuth Debugging Functions - Available Globally
              (function() {
                console.log('🧪 Initializing Direct OAuth debugging functions...');
                
                // Manual OAuth retry function for direct OAuth
                window.manualOAuthRetry = async function() {
                  console.log('🔄 Manual Direct OAuth Retry Started...');
                  
                  try {
                    // Check if we have direct OAuth tokens
                    const idToken = localStorage.getItem('idToken');
                    const accessToken = localStorage.getItem('accessToken');
                    
                    if (!idToken && !accessToken) {
                      console.error('  ❌ No OAuth tokens found in localStorage');
                      return { success: false, error: 'No OAuth tokens found' };
                    }
                    
                    console.log('  1. Direct OAuth tokens found:', {
                      hasIdToken: !!idToken,
                      hasAccessToken: !!accessToken,
                      idTokenLength: idToken?.length,
                      accessTokenLength: accessToken?.length
                    });
                    
                    // Try to get user profile from API
                    try {
                      const apiUrl = 'https://api.dottapps.com';
                      const response = await fetch(apiUrl + '/api/users/profile', {
                        method: 'GET',
                        headers: {
                          'Authorization': 'Bearer ' + (idToken || accessToken),
                          'Content-Type': 'application/json'
                        }
                      });
                      
                      if (response.ok) {
                        const userProfile = await response.json();
                        console.log('  ✅ User profile retrieved from API:', userProfile);
                        
                        // Determine next step based on onboarding status
                        let nextStep = 'business-info'; // Default
                        const tenantId = userProfile.tenant_id || userProfile.tenantId;
                        const onboardingStatus = userProfile.onboarding_status || userProfile.onboardingStatus;
                        const subplan = userProfile.subplan || userProfile.subscription_plan;
                        const paymentVerified = userProfile.payment_verified || userProfile.payverified;
                        const setupDone = userProfile.setup_done || userProfile.setupDone;
                        
                        if (onboardingStatus === 'complete' || setupDone) {
                          nextStep = 'complete';
                        } else if (paymentVerified) {
                          nextStep = 'setup';
                        } else if (subplan) {
                          nextStep = 'payment';
                        } else if (tenantId) {
                          nextStep = 'subscription';
                        }
                        
                        let redirectUrl = nextStep === 'complete' ? 
                          (tenantId ? '/tenant/' + tenantId + '/dashboard' : '/dashboard') : 
                          '/onboarding/' + nextStep;
                        redirectUrl += '?from=oauth_manual_retry';
                        
                        console.log('  📍 Next step determined:', {
                          nextStep,
                          redirectUrl,
                          userProfile: {
                            onboarding: onboardingStatus,
                            tenantId: tenantId,
                            subplan: subplan,
                            paymentVerified: paymentVerified,
                            setupDone: setupDone
                          }
                        });
                        
                        console.log('  🎯 Call window.oauthRedirect() to complete the redirect');
                        
                        // Store redirect URL for manual execution
                        window.oauthRedirectUrl = redirectUrl;
                        window.oauthRedirect = function() {
                          console.log('🚀 Redirecting to ' + window.oauthRedirectUrl + '...');
                          window.location.href = window.oauthRedirectUrl;
                        };
                        
                        return { 
                          success: true, 
                          userProfile, 
                          nextStep, 
                          redirectUrl,
                          message: 'Direct OAuth retry successful! Call window.oauthRedirect() to complete.'
                        };
                      } else {
                        console.error('  ❌ API call failed:', response.status, response.statusText);
                        
                        // Fallback: decode JWT token for basic info
                        if (idToken) {
                          try {
                            const payload = JSON.parse(atob(idToken.split('.')[1]));
                            console.log('  📋 JWT token payload:', payload);
                            
                            const tenantId = payload['custom:tenant_ID'] || payload['custom:tenant_id'];
                            const redirectUrl = tenantId ? '/tenant/' + tenantId + '/dashboard' : '/onboarding';
                            
                            window.oauthRedirectUrl = redirectUrl;
                            window.oauthRedirect = function() {
                              console.log('🚀 Redirecting to ' + window.oauthRedirectUrl + '...');
                              window.location.href = window.oauthRedirectUrl;
                            };
                            
                            return { 
                              success: true, 
                              tokenPayload: payload, 
                              redirectUrl,
                              message: 'Direct OAuth with JWT fallback! Call window.oauthRedirect() to complete.'
                            };
                          } catch (jwtError) {
                            return { success: false, error: 'API call failed and JWT decode failed: ' + jwtError.message };
                          }
                        }
                        
                        return { success: false, error: 'API call failed: ' + response.status };
                      }
                    } catch (apiError) {
                      console.error('  ❌ Error calling API:', apiError);
                      return { success: false, error: 'API error: ' + apiError.message };
                    }
                  } catch (error) {
                    console.error('  ❌ OAuth retry failed:', error);
                    return { success: false, error: error.message };
                  }
                };
                
                // Debug OAuth state function
                window.debugOAuthState = function() {
                  console.log('🔍 Direct OAuth State Debug:');
                  
                  const idToken = localStorage.getItem('idToken');
                  const accessToken = localStorage.getItem('accessToken');
                  const refreshToken = localStorage.getItem('refreshToken');
                  
                  console.log('  Tokens:', {
                    hasIdToken: !!idToken,
                    hasAccessToken: !!accessToken,
                    hasRefreshToken: !!refreshToken,
                    idTokenLength: idToken?.length,
                    accessTokenLength: accessToken?.length,
                    refreshTokenLength: refreshToken?.length
                  });
                  
                  if (idToken) {
                    try {
                      const payload = JSON.parse(atob(idToken.split('.')[1]));
                      console.log('  JWT Payload:', payload);
                      console.log('  User Info:', {
                        email: payload.email,
                        name: payload.name,
                        tenantId: payload['custom:tenant_ID'] || payload['custom:tenant_id'],
                        onboarding: payload['custom:onboarding'],
                        subplan: payload['custom:subplan']
                      });
                    } catch (e) {
                      console.error('  Error decoding JWT:', e);
                    }
                  }
                  
                  console.log('  AppCache:', window.__APP_CACHE);
                  console.log('  Current URL:', window.location.href);
                  
                  return {
                    tokens: { hasIdToken: !!idToken, hasAccessToken: !!accessToken, hasRefreshToken: !!refreshToken },
                    appCache: window.__APP_CACHE,
                    url: window.location.href
                  };
                };
                
                // Test onboarding logic function (updated for direct OAuth)
                window.testOnboardingLogic = function(testAttributes) {
                  console.log('🧪 Testing onboarding logic with attributes:', testAttributes);
                  
                  // Use the same logic as oauth-success page
                  const tenantId = testAttributes.tenant_id || testAttributes.tenantId;
                  const onboardingStatus = testAttributes.onboarding_status || testAttributes.onboardingStatus;
                  const setupDone = testAttributes.setup_done || testAttributes.setupDone;
                  const subplan = testAttributes.subplan || testAttributes.subscription_plan;
                  const paymentVerified = testAttributes.payment_verified || testAttributes.payverified;
                  
                  let nextStep = 'business-info'; // Default
                  let redirectUrl = '/onboarding';
                  
                  if (onboardingStatus === 'complete' || setupDone) {
                    nextStep = 'complete';
                    redirectUrl = tenantId ? '/tenant/' + tenantId + '/dashboard' : '/dashboard';
                  } else if (paymentVerified) {
                    nextStep = 'setup';
                    redirectUrl = '/onboarding/setup';
                  } else if (subplan) {
                    nextStep = 'payment';
                    redirectUrl = '/onboarding/setup';
                  } else if (tenantId) {
                    nextStep = 'subscription';
                    redirectUrl = '/onboarding/subscription';
                  }
                  
                  console.log('📍 Determined step:', nextStep);
                  console.log('🎯 Redirect URL:', redirectUrl);
                  
                  return { nextStep, redirectUrl, analysis: { tenantId, onboardingStatus, setupDone, subplan, paymentVerified } };
                };
                
                console.log('🧪 Direct OAuth Debugger Functions Available:');
                console.log('  - window.manualOAuthRetry() - Manually retry Direct OAuth authentication');
                console.log('  - window.debugOAuthState() - Debug current Direct OAuth state');
                console.log('  - window.testOnboardingLogic(attrs) - Test onboarding logic');
                console.log('  - window.oauthRedirect() - Complete redirect after successful retry');
              })();
            `
          }}
        />
      </body>
    </html>
  );
}
