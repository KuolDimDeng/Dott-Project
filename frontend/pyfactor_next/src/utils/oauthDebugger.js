/**
 * OAuth Debugging Utility
 * 
 * This utility provides debugging functions for OAuth authentication
 * that can be used from any page in the browser console.
 */

// Auth0 authentication is handled via useSession hook
import { setAuthCookies, determineOnboardingStep } from '@/utils/cookieManager';
import { logger } from '@/utils/logger';

/**
 * Manual OAuth retry function that can be called from browser console
 */
export const manualOAuthRetry = async () => {
  console.log('🔄 Manual OAuth Retry Started...');
  
  try {
    // Step 1: Force Amplify configuration
    console.log('  1. Configuring Amplify...');
    configureAmplify(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check configuration
    if (!isAmplifyConfigured()) {
      console.error('  ❌ Amplify configuration failed!');
      return { success: false, error: 'Amplify configuration failed' };
    }
    console.log('  ✅ Amplify configured successfully');
    
    // Step 2: Try to fetch current auth session
    console.log('  2. Fetching current auth session...');
    try {
      const authResponse = await fetchAuthSession({ forceRefresh: true });
      const tokens = authResponse?.tokens;
      
      console.log('  📊 Auth Response:', {
        isSignedIn: authResponse?.isSignedIn,
        hasTokens: !!tokens,
        hasAccessToken: !!tokens?.accessToken,
        hasIdToken: !!tokens?.idToken,
        accessTokenLength: tokens?.accessToken?.toString()?.length,
        idTokenLength: tokens?.idToken?.toString()?.length
      });
      
      if (tokens && (tokens.accessToken || tokens.idToken)) {
        console.log('  ✅ Tokens retrieved successfully!');
        
        // Step 3: Fetch user attributes
        console.log('  3. Fetching user attributes...');
    const userAttributes = {}; // Removed Amplify - using Auth0
        console.log('  ✅ User attributes:', userAttributes);
        
        // Step 4: Set cookies and determine next step
        console.log('  4. Setting auth cookies and determining next step...');
        setAuthCookies(tokens, userAttributes);
        const nextStep = determineOnboardingStep(userAttributes);
        
        let redirectUrl = nextStep === 'dashboard' ? '/dashboard' : `/onboarding/${nextStep}`;
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
        
        console.log(`  5. Ready to redirect to: ${redirectUrl}`);
        console.log('  🎯 Call window.oauthRedirect() to complete the redirect');
        
        // Store redirect URL for manual execution
        window.oauthRedirectUrl = redirectUrl;
        window.oauthRedirect = () => {
          console.log(`🚀 Redirecting to ${window.oauthRedirectUrl}...`);
          window.location.href = window.oauthRedirectUrl;
        };
        
        return { 
          success: true, 
          tokens, 
          userAttributes, 
          nextStep, 
          redirectUrl,
          message: 'OAuth retry successful! Call window.oauthRedirect() to complete.'
        };
      } else {
        console.error('  ❌ No valid tokens received');
        return { success: false, error: 'No valid tokens received' };
      }
    } catch (authError) {
      console.error('  ❌ Auth session error:', authError);
      return { success: false, error: authError.message };
    }
  } catch (error) {
    console.error('  ❌ Manual OAuth retry failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Debug current OAuth state
 */
export const debugOAuthState = () => {
  console.log('🔍 OAuth State Debug Info:');
  
  // Check current URL
  const currentUrl = window.location.href;
  const urlParams = new URLSearchParams(window.location.search);
  
  console.log('  📍 Current Location:', {
    url: currentUrl,
    pathname: window.location.pathname,
    search: window.location.search
  });
  
  // Check for OAuth parameters
  const oauthParams = {
    code: urlParams.get('code'),
    state: urlParams.get('state'),
    error: urlParams.get('error'),
    errorDescription: urlParams.get('error_description')
  };
  
  console.log('  🔑 OAuth Parameters:', oauthParams);
  
  // Check Amplify configuration
  console.log('  ⚙️ Amplify Configuration:', {
    isConfigured: isAmplifyConfigured(),
    userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
    userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID,
    region: process.env.NEXT_PUBLIC_AWS_REGION
  });
  
  // Check cookies
  const cookies = document.cookie.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    if (key && key.includes('auth') || key.includes('onboarding')) {
      acc[key] = value;
    }
    return acc;
  }, {});
  
  console.log('  🍪 Auth-related Cookies:', cookies);
  
  return {
    currentUrl,
    oauthParams,
    amplifyConfigured: isAmplifyConfigured(),
    cookies
  };
};

/**
 * Test onboarding logic with different user attribute scenarios
 */
export const testOnboardingLogic = (testAttributes = null) => {
  console.log('🧪 Testing Onboarding Logic...');
  
  if (testAttributes) {
    console.log('  📊 Testing with provided attributes:', testAttributes);
    const step = determineOnboardingStep(testAttributes);
    console.log('  📍 Determined step:', step);
    return step;
  }
  
  // Test different scenarios
  const scenarios = [
    { name: 'New User (no attributes)', attrs: {} },
    { name: 'Has Tenant ID only', attrs: { 'custom:tenant_ID': 'test-tenant-123' } },
    { name: 'Has Subscription', attrs: { 'custom:tenant_ID': 'test-tenant-123', 'custom:subplan': 'professional' } },
    { name: 'Free Plan Complete', attrs: { 'custom:tenant_ID': 'test-tenant-123', 'custom:subplan': 'free' } },
    { name: 'Paid Plan + Payment', attrs: { 'custom:tenant_ID': 'test-tenant-123', 'custom:subplan': 'professional', 'custom:payverified': 'true' } },
    { name: 'Setup Done', attrs: { 'custom:tenant_ID': 'test-tenant-123', 'custom:subplan': 'professional', 'custom:payverified': 'true', 'custom:setupdone': 'true' } },
    { name: 'Complete (lowercase)', attrs: { 'custom:onboarding': 'complete' } },
    { name: 'Complete (uppercase)', attrs: { 'custom:onboarding': 'COMPLETE' } },
    { name: 'Existing User Example', attrs: { 'custom:tenant_ID': 'existing-tenant', 'custom:subplan': 'enterprise', 'custom:payverified': 'true', 'custom:setupdone': 'true', 'custom:onboarding': 'complete' } }
  ];
  
  console.log('  🔍 Testing all scenarios:');
  const results = {};
  scenarios.forEach(scenario => {
    const result = determineOnboardingStep(scenario.attrs);
    console.log(`    ${scenario.name}: ${result}`);
    results[scenario.name] = result;
  });
  
  return results;
};

/**
 * Initialize OAuth debugger functions on window object
 */
export const initOAuthDebugger = () => {
  if (typeof window !== 'undefined') {
    window.manualOAuthRetry = manualOAuthRetry;
    window.debugOAuthState = debugOAuthState;
    window.testOnboardingLogic = testOnboardingLogic;
    
    console.log('🧪 OAuth Debugger Functions Available:');
    console.log('  - window.manualOAuthRetry() - Manually retry OAuth authentication');
    console.log('  - window.debugOAuthState() - Debug current OAuth state');
    console.log('  - window.testOnboardingLogic(attrs) - Test onboarding logic');
    console.log('  - window.oauthRedirect() - Complete redirect after successful retry');
  }
};

// Auto-initialize if in browser
if (typeof window !== 'undefined') {
  initOAuthDebugger();
} 