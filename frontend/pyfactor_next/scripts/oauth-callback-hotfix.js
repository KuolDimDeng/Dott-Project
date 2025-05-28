// OAuth Callback Hotfix Script
// This script can be injected into the browser console to fix OAuth callback issues
// Usage: Copy and paste this entire script into the browser console on the callback page

(async function() {
  console.log('🚀 OAuth Callback Hotfix Starting...');
  
  // Check if we're on the callback page
  if (!window.location.pathname.includes('/auth/callback')) {
    console.error('❌ This script must be run on the /auth/callback page');
    return;
  }
  
  // Check for authorization code
  const urlParams = new URLSearchParams(window.location.search);
  const authCode = urlParams.get('code');
  
  if (!authCode) {
    console.error('❌ No authorization code found in URL');
    return;
  }
  
  console.log('✅ Authorization code found:', authCode.substring(0, 20) + '...');
  
  // Import Amplify modules dynamically
  console.log('📦 Loading Amplify modules...');
  
  try {
    // Wait for Amplify to be available
    let attempts = 0;
    while (!window.Amplify && attempts < 10) {
      console.log(`  Waiting for Amplify... (${attempts + 1}/10)`);
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
    }
    
    if (!window.Amplify) {
      console.error('❌ Amplify not found. Please ensure the page has loaded completely.');
      return;
    }
    
    // Configure Amplify
    console.log('🔧 Configuring Amplify...');
    const amplifyConfig = {
      Auth: {
        Cognito: {
          userPoolId: 'us-east-1_JPL8vGfb6',
          userPoolClientId: '1o5v84mrgn4gt87khtr179uc5b',
          region: 'us-east-1',
          loginWith: {
            oauth: {
              domain: 'us-east-1jpl8vgfb6.auth.us-east-1.amazoncognito.com',
              scopes: ['openid', 'profile', 'email'],
              redirectSignIn: ['https://dottapps.com/auth/callback'],
              redirectSignOut: ['https://dottapps.com/auth/signin'],
              responseType: 'code'
            }
          }
        }
      }
    };
    
    window.Amplify.configure(amplifyConfig);
    console.log('✅ Amplify configured');
    
    // Try to fetch auth session
    console.log('🔐 Fetching auth session...');
    
    let tokens = null;
    let retryCount = 0;
    const maxRetries = 10;
    
    while (retryCount < maxRetries && !tokens) {
      try {
        console.log(`  Attempt ${retryCount + 1}/${maxRetries}...`);
        
        // Re-configure Amplify each time to ensure it's set
        window.Amplify.configure(amplifyConfig);
        
        // Import auth functions
        const { fetchAuthSession, fetchUserAttributes } = await import('aws-amplify/auth');
        
        const authResponse = await fetchAuthSession({ forceRefresh: true });
        tokens = authResponse?.tokens;
        
        if (tokens && (tokens.accessToken || tokens.idToken)) {
          console.log('✅ Tokens retrieved successfully!');
          break;
        }
        
        console.log('  No tokens yet, waiting...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        retryCount++;
      } catch (error) {
        console.error(`  Error on attempt ${retryCount + 1}:`, error.message);
        
        if (error.message.includes('Auth UserPool not configured')) {
          console.log('  Re-configuring Amplify...');
          window.Amplify.configure(amplifyConfig);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        retryCount++;
      }
    }
    
    if (!tokens) {
      console.error('❌ Failed to retrieve tokens after', maxRetries, 'attempts');
      console.log('🔄 You can try running this script again or use window.retryOAuthCallback()');
      return;
    }
    
    // Fetch user attributes
    console.log('👤 Fetching user attributes...');
    const { fetchUserAttributes } = await import('aws-amplify/auth');
    const userAttributes = await fetchUserAttributes();
    console.log('✅ User attributes retrieved:', userAttributes);
    
    // Determine redirect URL based on onboarding status
    let redirectUrl = '/dashboard';
    
    if (!userAttributes['custom:tenant_ID']) {
      redirectUrl = '/onboarding/business-info';
    } else if (!userAttributes['custom:subplan']) {
      redirectUrl = '/onboarding/subscription';
    } else if (userAttributes['custom:subplan'] !== 'free' && userAttributes['custom:payverified'] !== 'true') {
      redirectUrl = '/onboarding/payment';
    } else if (userAttributes['custom:setupdone'] !== 'true') {
      redirectUrl = '/onboarding/setup';
    }
    
    console.log('🎯 Redirecting to:', redirectUrl);
    
    // Set auth cookies
    document.cookie = `accessToken=${tokens.accessToken}; path=/; secure; samesite=strict`;
    document.cookie = `idToken=${tokens.idToken}; path=/; secure; samesite=strict`;
    document.cookie = `isAuthenticated=true; path=/; secure; samesite=strict`;
    
    // Redirect
    window.location.href = redirectUrl + '?from=oauth_hotfix';
    
  } catch (error) {
    console.error('❌ Hotfix failed:', error);
    console.log('💡 Try refreshing the page and running this script again');
  }
})(); 