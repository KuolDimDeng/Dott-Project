/**
 * OAuth Debugging Utility
 * Provides manual testing functions for OAuth callback issues
 */

import { fetchAuthSession, fetchUserAttributes, configureAmplify } from '@/config/amplifyUnified';
import { logger } from '@/utils/logger';

/**
 * Manual OAuth callback retry function
 * Tests the enhanced OAuth callback logic with proper timing
 */
export async function manualOAuthCallbackTest() {
  console.log('🧪 Starting manual OAuth callback test...');
  
  try {
    // Step 1: Check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const authCode = urlParams.get('code');
    const state = urlParams.get('state');
    const urlError = urlParams.get('error');
    
    console.log('📋 URL Parameters:', {
      hasCode: !!authCode,
      codeLength: authCode?.length,
      codePreview: authCode ? authCode.substring(0, 20) + '...' : null,
      hasState: !!state,
      stateValue: state,
      hasError: !!urlError,
      errorDescription: urlParams.get('error_description')
    });
    
    if (urlError) {
      throw new Error(`OAuth error: ${urlError} - ${urlParams.get('error_description') || 'Unknown error'}`);
    }
    
    if (!authCode) {
      throw new Error('No authorization code found in URL');
    }
    
    // Step 2: Ensure Amplify is configured
    console.log('⚙️ Configuring Amplify...');
    configureAmplify(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Step 3: Wait for Cognito processing (enhanced timing)
    console.log('⏳ Waiting 3 seconds for Cognito to process authorization code...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 4: Enhanced token retrieval with retry logic
    let tokens;
    let attempts = 0;
    const maxAttempts = 8;
    const baseDelay = 2000;
    
    while (attempts < maxAttempts && !tokens) {
      attempts++;
      console.log(`🔄 Token retrieval attempt ${attempts}/${maxAttempts}...`);
      
      try {
        // Import raw auth function
        const { fetchAuthSession: rawFetchAuthSession } = await import('aws-amplify/auth');
        
        // Create timeout promise
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Token retrieval timeout')), 15000)
        );
        
        // Attempt to fetch session
        const authPromise = rawFetchAuthSession({ forceRefresh: true });
        const authResponse = await Promise.race([authPromise, timeoutPromise]);
        
        console.log(`📦 Auth response on attempt ${attempts}:`, {
          hasTokens: !!authResponse?.tokens,
          hasAccessToken: !!authResponse?.tokens?.accessToken,
          hasIdToken: !!authResponse?.tokens?.idToken,
          accessTokenLength: authResponse?.tokens?.accessToken?.toString()?.length,
          idTokenLength: authResponse?.tokens?.idToken?.toString()?.length
        });
        
        // Check token validity
        const receivedTokens = authResponse?.tokens;
        if (receivedTokens && (receivedTokens.accessToken || receivedTokens.idToken)) {
          const accessToken = receivedTokens.accessToken?.toString();
          const idToken = receivedTokens.idToken?.toString();
          
          if ((accessToken && accessToken.length > 100) || (idToken && idToken.length > 100)) {
            console.log('✅ Valid tokens received!');
            tokens = receivedTokens;
            break;
          } else {
            console.log(`⚠️ Tokens too short on attempt ${attempts}, retrying...`);
          }
        } else {
          console.log(`❌ No tokens on attempt ${attempts}, retrying...`);
        }
        
        // Wait before next attempt
        if (!tokens && attempts < maxAttempts) {
          const delay = baseDelay + (attempts * 1000);
          console.log(`⏳ Waiting ${delay}ms before next attempt...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
      } catch (sessionError) {
        console.error(`❌ Session fetch error on attempt ${attempts}:`, sessionError);
        
        // Handle configuration errors
        if (sessionError.message?.includes('Auth UserPool not configured') || 
            sessionError.message?.includes('UserPool')) {
          console.log('🔧 Attempting configuration recovery...');
          configureAmplify(true);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Continue to next attempt unless it's the last one
        if (attempts >= maxAttempts) {
          throw sessionError;
        }
        
        const delay = baseDelay + (attempts * 1000);
        console.log(`⏳ Waiting ${delay}ms before retry after error...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // Final check
    if (!tokens || (!tokens.accessToken && !tokens.idToken)) {
      console.log('🔄 Attempting fallback authentication check...');
      try {
        const { fetchUserAttributes: rawFetchUserAttributes } = await import('aws-amplify/auth');
        const userAttributes = await rawFetchUserAttributes();
        if (userAttributes && userAttributes.email) {
          console.log('✅ User authenticated via fallback method');
          tokens = { 
            accessToken: 'authenticated', 
            idToken: 'authenticated',
            _fallback: true 
          };
        } else {
          throw new Error('No valid authentication found');
        }
      } catch (fallbackError) {
        console.error('❌ Fallback check failed:', fallbackError);
        throw new Error(`Authentication failed - no tokens received after ${maxAttempts} attempts`);
      }
    }
    
    console.log('🎉 OAuth callback test completed successfully!');
    console.log('📊 Final result:', {
      hasTokens: !!tokens,
      isFallback: tokens?._fallback,
      totalAttempts: attempts
    });
    
    return tokens;
    
  } catch (error) {
    console.error('❌ OAuth callback test failed:', error);
    throw error;
  }
}

/**
 * Debug current OAuth state
 */
export function debugOAuthState() {
  console.log('🔍 OAuth State Debug:');
  
  const urlParams = new URLSearchParams(window.location.search);
  console.log('📋 URL Parameters:', Object.fromEntries(urlParams.entries()));
  
  // Check Amplify configuration
  try {
    const { Amplify } = require('@/config/amplifyUnified');
    const config = Amplify.getConfig();
    console.log('⚙️ Amplify Configuration:', {
      hasConfig: !!config,
      hasAuth: !!config?.Auth,
      hasCognito: !!config?.Auth?.Cognito,
      userPoolId: config?.Auth?.Cognito?.userPoolId,
      hasOAuth: !!config?.Auth?.Cognito?.loginWith?.oauth,
      oauthDomain: config?.Auth?.Cognito?.loginWith?.oauth?.domain
    });
  } catch (configError) {
    console.error('❌ Error checking Amplify config:', configError);
  }
  
  // Check current authentication status
  fetchAuthSession()
    .then(session => {
      console.log('🔐 Current Auth Session:', {
        hasTokens: !!session?.tokens,
        hasAccessToken: !!session?.tokens?.accessToken,
        hasIdToken: !!session?.tokens?.idToken
      });
    })
    .catch(error => {
      console.error('❌ Error fetching auth session:', error);
    });
}

/**
 * Test OAuth redirect functionality
 */
export function testOAuthRedirect() {
  console.log('🚀 Testing OAuth redirect...');
  
  const redirectUrl = '/dashboard?from=oauth-test';
  console.log('📍 Redirecting to:', redirectUrl);
  
  setTimeout(() => {
    window.location.href = redirectUrl;
  }, 1000);
}

// Make functions available globally for browser console testing
if (typeof window !== 'undefined') {
  window.manualOAuthCallbackTest = manualOAuthCallbackTest;
  window.debugOAuthState = debugOAuthState;
  window.testOAuthRedirect = testOAuthRedirect;
  
  console.log('🧪 OAuth Debug Functions Available:');
  console.log('  - window.manualOAuthCallbackTest() - Test enhanced OAuth callback logic');
  console.log('  - window.debugOAuthState() - Debug current OAuth state');
  console.log('  - window.testOAuthRedirect() - Test OAuth redirect functionality');
} 