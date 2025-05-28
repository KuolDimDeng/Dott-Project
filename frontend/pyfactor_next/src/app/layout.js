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
            // Clean tenant ID extraction using CognitoAttributes utility
            // Replaces test-tenant prevention with proper dynamic extraction
            async function initializeTenantFromCognito() {
              try {
                console.log('[Layout] Initializing tenant ID from Cognito attributes');
                
                // Wait for Amplify to be available
                let attempts = 0;
                while (!window.Amplify && attempts < 10) {
                  await new Promise(resolve => setTimeout(resolve, 500));
                  attempts++;
                }
                
                if (window.Amplify && window.Amplify.Auth) {
                  try {
                    const session = await window.Amplify.Auth.currentSession();
                    if (session && session.idToken && session.idToken.payload) {
                      const payload = session.idToken.payload;
                      
                      // Use proper attribute priority as defined in CognitoAttributes
                      const tenantId = payload['custom:tenant_ID'] || 
                                      payload['custom:businessid'] ||
                                      payload['custom:tenant_id'] ||
                                      payload['custom:tenantId'];
                      
                      if (tenantId) {
                        console.log('[Layout] Found tenant ID from Cognito:', tenantId);
                        
                        // Store in AppCache (no localStorage per requirements)
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
                    }
                  } catch (error) {
                    console.log('[Layout] Could not get Cognito session:', error.message);
                  }
                }
                
                // Reduced logging frequency for production
                if (Math.random() < 0.1) { // Only log 10% of the time
                  console.debug('[Layout] No tenant ID found in Cognito attributes');
                }
                return null;
              } catch (error) {
                console.error('[Layout] Error initializing tenant from Cognito:', error);
                return null;
              }
            }
            
            // Initialize tenant ID on page load
            if (typeof window !== 'undefined') {
              // Initialize AppCache if not present
              if (!window.__APP_CACHE) {
                window.__APP_CACHE = { 
                  auth: { provider: 'cognito', initialized: true }, 
                  user: {}, 
                  tenant: {},
                  tenants: {}
                };
              }
              
              // Initialize tenant after a short delay to allow Amplify to load
              setTimeout(initializeTenantFromCognito, 1000);
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
                auth: { provider: 'cognito', initialized: true }, 
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
              // OAuth Debugging Functions - Available Globally
              (function() {
                console.log('🧪 Initializing OAuth debugging functions...');
                
                // Manual OAuth retry function
                window.manualOAuthRetry = async function() {
                  console.log('🔄 Manual OAuth Retry Started...');
                  
                  try {
                    // Check if Amplify is available
                    if (!window.Amplify || !window.Amplify.Auth) {
                      console.error('  ❌ Amplify not available');
                      return { success: false, error: 'Amplify not available' };
                    }
                    
                    console.log('  1. Amplify is available, attempting to get current session...');
                    
                    try {
                      const session = await window.Amplify.Auth.currentSession();
                      console.log('  ✅ Current session retrieved:', {
                        isValid: session && session.isValid(),
                        hasAccessToken: !!(session && session.getAccessToken()),
                        hasIdToken: !!(session && session.getIdToken()),
                        accessTokenLength: session?.getAccessToken()?.getJwtToken()?.length,
                        idTokenLength: session?.getIdToken()?.getJwtToken()?.length
                      });
                      
                      if (session && session.isValid()) {
                        console.log('  2. Session is valid, getting user attributes...');
                        
                        try {
                          const user = await window.Amplify.Auth.currentAuthenticatedUser();
                          const userAttributes = user.attributes;
                          console.log('  ✅ User attributes:', userAttributes);
                          
                          // Determine next step based on onboarding status
                          let nextStep = 'business-info'; // Default
                          
                          if (userAttributes['custom:onboarding']?.toLowerCase() === 'complete') {
                            nextStep = 'complete';
                          } else if (userAttributes['custom:setupdone'] === 'true') {
                            nextStep = 'complete';
                          } else if (userAttributes['custom:payverified'] === 'true') {
                            nextStep = 'setup';
                          } else if (userAttributes['custom:subplan']) {
                            nextStep = 'payment';
                          } else if (userAttributes['custom:tenant_ID']) {
                            nextStep = 'subscription';
                          }
                          
                          let redirectUrl = nextStep === 'complete' ? '/dashboard' : '/onboarding/' + nextStep;
                          redirectUrl += '?from=oauth_manual_retry';
                          
                          console.log('  📍 Next step determined:', {
                            nextStep,
                            redirectUrl,
                            userAttributes: {
                              onboarding: userAttributes['custom:onboarding'],
                              tenantId: userAttributes['custom:tenant_ID'],
                              subplan: userAttributes['custom:subplan'],
                              payverified: userAttributes['custom:payverified'],
                              setupdone: userAttributes['custom:setupdone']
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
                            session, 
                            userAttributes, 
                            nextStep, 
                            redirectUrl,
                            message: 'OAuth retry successful! Call window.oauthRedirect() to complete.'
                          };
                        } catch (userError) {
                          console.error('  ❌ Error getting user attributes:', userError);
                          return { success: false, error: 'Error getting user attributes: ' + userError.message };
                        }
                      } else {
                        console.error('  ❌ Session is not valid');
                        return { success: false, error: 'Session is not valid' };
                      }
                    } catch (sessionError) {
                      console.error('  ❌ Error getting current session:', sessionError);
                      return { success: false, error: 'Error getting session: ' + sessionError.message };
                    }
                  } catch (error) {
                    console.error('  ❌ Manual OAuth retry failed:', error);
                    return { success: false, error: error.message };
                  }
                };
                
                // Debug OAuth state function
                window.debugOAuthState = function() {
                  console.log('🔍 OAuth State Debug Info:');
                  
                  const currentUrl = window.location.href;
                  const urlParams = new URLSearchParams(window.location.search);
                  
                  console.log('  📍 Current Location:', {
                    url: currentUrl,
                    pathname: window.location.pathname,
                    search: window.location.search
                  });
                  
                  const oauthParams = {
                    code: urlParams.get('code'),
                    state: urlParams.get('state'),
                    error: urlParams.get('error'),
                    errorDescription: urlParams.get('error_description')
                  };
                  
                  console.log('  🔑 OAuth Parameters:', oauthParams);
                  
                  console.log('  ⚙️ Amplify Availability:', {
                    amplifyAvailable: !!(window.Amplify),
                    authAvailable: !!(window.Amplify && window.Amplify.Auth),
                    configuredUserPoolId: window.Amplify?.Auth?._config?.userPoolId,
                    configuredRegion: window.Amplify?.Auth?._config?.region
                  });
                  
                  const cookies = document.cookie.split(';').reduce(function(acc, cookie) {
                    const parts = cookie.trim().split('=');
                    const key = parts[0];
                    const value = parts[1];
                    if (key && (key.includes('auth') || key.includes('onboarding'))) {
                      acc[key] = value;
                    }
                    return acc;
                  }, {});
                  
                  console.log('  🍪 Auth-related Cookies:', cookies);
                  
                  return {
                    currentUrl: currentUrl,
                    oauthParams: oauthParams,
                    amplifyAvailable: !!(window.Amplify),
                    cookies: cookies
                  };
                };
                
                // Test onboarding logic function
                window.testOnboardingLogic = function(testAttributes) {
                  console.log('🧪 Testing Onboarding Logic...');
                  
                  if (testAttributes) {
                    console.log('  📊 Testing with provided attributes:', testAttributes);
                    // Simple onboarding logic test
                    let step = 'business-info';
                    if (testAttributes['custom:onboarding']?.toLowerCase() === 'complete') {
                      step = 'complete';
                    } else if (testAttributes['custom:setupdone'] === 'true') {
                      step = 'complete';
                    } else if (testAttributes['custom:payverified'] === 'true') {
                      step = 'setup';
                    } else if (testAttributes['custom:subplan']) {
                      step = 'payment';
                    } else if (testAttributes['custom:tenant_ID']) {
                      step = 'subscription';
                    }
                    console.log('  📍 Determined step:', step);
                    return step;
                  }
                  
                  const scenarios = [
                    { name: 'New User (no attributes)', attrs: {} },
                    { name: 'Has Tenant ID only', attrs: { 'custom:tenant_ID': 'test-tenant-123' } },
                    { name: 'Has Subscription', attrs: { 'custom:tenant_ID': 'test-tenant-123', 'custom:subplan': 'professional' } },
                    { name: 'Paid Plan + Payment', attrs: { 'custom:tenant_ID': 'test-tenant-123', 'custom:subplan': 'professional', 'custom:payverified': 'true' } },
                    { name: 'Setup Done', attrs: { 'custom:tenant_ID': 'test-tenant-123', 'custom:subplan': 'professional', 'custom:payverified': 'true', 'custom:setupdone': 'true' } },
                    { name: 'Complete', attrs: { 'custom:onboarding': 'complete' } }
                  ];
                  
                  console.log('  🔍 Testing all scenarios:');
                  const results = {};
                  scenarios.forEach(function(scenario) {
                    let step = 'business-info';
                    if (scenario.attrs['custom:onboarding']?.toLowerCase() === 'complete') {
                      step = 'complete';
                    } else if (scenario.attrs['custom:setupdone'] === 'true') {
                      step = 'complete';
                    } else if (scenario.attrs['custom:payverified'] === 'true') {
                      step = 'setup';
                    } else if (scenario.attrs['custom:subplan']) {
                      step = 'payment';
                    } else if (scenario.attrs['custom:tenant_ID']) {
                      step = 'subscription';
                    }
                    console.log('    ' + scenario.name + ': ' + step);
                    results[scenario.name] = step;
                  });
                  
                  return results;
                };
                
                console.log('🧪 OAuth Debugger Functions Available:');
                console.log('  - window.manualOAuthRetry() - Manually retry OAuth authentication');
                console.log('  - window.debugOAuthState() - Debug current OAuth state');
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
