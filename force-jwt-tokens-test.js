// Force JWT Tokens Test Script
// This script tests multiple approaches to force Auth0 to return JWT tokens instead of JWE tokens

console.log('🔧 Starting Force JWT Tokens Test...');

// Test 1: Clear all Auth0 related storage and cookies
function clearAllAuth0Data() {
  console.log('🧹 Clearing all Auth0 data...');
  
  // Clear localStorage
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('auth0') || key.includes('@@auth0spajs') || key.includes('token'))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
  
  // Clear sessionStorage
  const sessionKeysToRemove = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && (key.includes('auth0') || key.includes('@@auth0spajs') || key.includes('token'))) {
      sessionKeysToRemove.push(key);
    }
  }
  sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));
  
  console.log(`🧹 Cleared ${keysToRemove.length + sessionKeysToRemove.length} storage items`);
}

// Test 2: Direct Auth0 token request with explicit audience
async function directTokenRequest() {
  console.log('🎯 Testing direct Auth0 token request...');
  
  const authParams = new URLSearchParams({
    response_type: 'code',
    client_id: 'GZ5tqWE0VWusmykGZXfoxRkKJ6MMvIvJ', // Hardcoded
    redirect_uri: 'https://dottapps.com/api/auth/callback',
    scope: 'openid profile email',
    audience: 'https://api.dottapps.com', // Force JWT tokens
    state: 'test-jwt-' + Date.now(),
    // Additional parameters to force JWT
    response_mode: 'query',
    prompt: 'login', // Force fresh authentication
  });
  
  const authUrl = `https://dev-cbyy63jovi6zrcos.us.auth0.com/authorize?${authParams}`;
  console.log('🔗 Auth URL:', authUrl);
  
  return authUrl;
}

// Test 3: Check current token format
async function checkCurrentTokenFormat() {
  console.log('🔍 Checking current token format...');
  
  try {
    const response = await fetch('/api/auth/session');
    const sessionData = await response.json();
    
    if (sessionData && sessionData.accessToken) {
      const token = sessionData.accessToken;
      
      if (token.startsWith('eyJ')) {
        try {
          const header = JSON.parse(atob(token.split('.')[0]));
          console.log('📋 Token header:', header);
          
          if (header.alg === 'dir' && header.enc) {
            console.log('❌ Current token is JWE (encrypted)');
            console.log('🎯 Algorithm:', header.alg);
            console.log('🎯 Encryption:', header.enc);
            return { type: 'JWE', header };
          } else if (header.alg === 'RS256' || header.alg === 'HS256') {
            console.log('✅ Current token is JWT (signed)');
            console.log('🎯 Algorithm:', header.alg);
            return { type: 'JWT', header };
          } else {
            console.log('❓ Unknown token format');
            return { type: 'UNKNOWN', header };
          }
        } catch (e) {
          console.log('❌ Could not parse token header');
          return { type: 'UNPARSEABLE', error: e.message };
        }
      } else {
        console.log('❌ Token does not appear to be JWT/JWE format');
        return { type: 'NOT_JWT', token: token.substring(0, 50) + '...' };
      }
    } else {
      console.log('❌ No access token found in session');
      return { type: 'NO_TOKEN' };
    }
  } catch (error) {
    console.log('❌ Error checking token:', error.message);
    return { type: 'ERROR', error: error.message };
  }
}

// Test 4: Auth0 SPA SDK with forced audience
async function testAuth0SpaSDK() {
  console.log('🔧 Testing Auth0 SPA SDK with forced audience...');
  
  try {
    // Import Auth0 SPA SDK dynamically
    const { createAuth0Client } = await import('https://cdn.auth0.com/js/auth0-spa-js/2.0/auth0-spa-js.production.js');
    
    const auth0 = await createAuth0Client({
      domain: 'dev-cbyy63jovi6zrcos.us.auth0.com',
      clientId: 'GZ5tqWE0VWusmykGZXfoxRkKJ6MMvIvJ',
      authorizationParams: {
        redirect_uri: window.location.origin + '/auth/callback',
        audience: 'https://api.dottapps.com', // Force JWT
        scope: 'openid profile email'
      },
      cacheLocation: 'memory', // Avoid cache
      useRefreshTokens: false // Disable refresh tokens
    });
    
    console.log('✅ Auth0 SPA client created');
    
    // Check if already authenticated
    const isAuthenticated = await auth0.isAuthenticated();
    console.log('🔐 Is authenticated:', isAuthenticated);
    
    if (isAuthenticated) {
      try {
        const token = await auth0.getTokenSilently({
          audience: 'https://api.dottapps.com',
          ignoreCache: true
        });
        
        console.log('🎯 Got token from Auth0 SPA SDK');
        
        if (token.startsWith('eyJ')) {
          const header = JSON.parse(atob(token.split('.')[0]));
          console.log('📋 SPA SDK Token header:', header);
          
          if (header.alg === 'dir' && header.enc) {
            console.log('❌ SPA SDK also returns JWE token');
            return { success: false, type: 'JWE', header };
          } else {
            console.log('✅ SPA SDK returns JWT token!');
            return { success: true, type: 'JWT', header };
          }
        }
      } catch (tokenError) {
        console.log('❌ Error getting token from SPA SDK:', tokenError.message);
        return { success: false, error: tokenError.message };
      }
    } else {
      console.log('❌ Not authenticated with SPA SDK');
      return { success: false, error: 'Not authenticated' };
    }
    
  } catch (error) {
    console.log('❌ Error with Auth0 SPA SDK:', error.message);
    return { success: false, error: error.message };
  }
}

// Test 5: Manual token exchange with different parameters
async function manualTokenExchange() {
  console.log('🔄 Testing manual token exchange...');
  
  // This would require an authorization code, so we'll simulate the request
  const tokenRequestBody = {
    grant_type: 'authorization_code',
    client_id: 'GZ5tqWE0VWusmykGZXfoxRkKJ6MMvIvJ',
    client_secret: 'nJCBudVjUDw1pHl8w-vA4WbwCdVtAOWuo8mhZucTIKOoIXF_ScXmUKPwY24071uz',
    code: 'PLACEHOLDER_CODE',
    redirect_uri: 'https://dottapps.com/api/auth/callback',
    audience: 'https://api.dottapps.com', // Force JWT
    scope: 'openid profile email'
  };
  
  console.log('📋 Token exchange parameters:', {
    grant_type: tokenRequestBody.grant_type,
    client_id: tokenRequestBody.client_id,
    audience: tokenRequestBody.audience,
    scope: tokenRequestBody.scope
  });
  
  console.log('💡 This request would be made to: https://dev-cbyy63jovi6zrcos.us.auth0.com/oauth/token');
  
  return tokenRequestBody;
}

// Main test function
async function runAllTests() {
  console.log('🚀 Running comprehensive Auth0 JWT force tests...');
  
  const results = {};
  
  // Test 1: Check current token
  results.currentToken = await checkCurrentTokenFormat();
  
  // Test 2: Clear storage
  clearAllAuth0Data();
  
  // Test 3: Direct auth URL
  results.directAuthUrl = directTokenRequest();
  
  // Test 4: SPA SDK test
  results.spaSDK = await testAuth0SpaSDK();
  
  // Test 5: Manual token exchange params
  results.manualExchange = manualTokenExchange();
  
  console.log('📊 Test Results:', results);
  
  // Generate recommendations
  console.log('\n🎯 RECOMMENDATIONS:');
  
  if (results.currentToken.type === 'JWE') {
    console.log('❌ PROBLEM: Still receiving JWE tokens');
    console.log('💡 Try these solutions:');
    console.log('1. Clear all browser data and try fresh login');
    console.log('2. Check Auth0 Application settings in dashboard');
    console.log('3. Verify OIDC Conformant is disabled');
    console.log('4. Check if application has "Encrypted Response" enabled');
    console.log('5. Try the direct auth URL generated above');
  } else if (results.currentToken.type === 'JWT') {
    console.log('✅ GOOD: Already receiving JWT tokens');
  } else {
    console.log('❓ UNCLEAR: Token format unknown or missing');
  }
  
  return results;
}

// Auto-run if this script is executed directly
if (typeof window !== 'undefined') {
  // Browser environment
  runAllTests().then(results => {
    console.log('✅ All tests completed');
    window.auth0TestResults = results;
  }).catch(error => {
    console.error('❌ Test failed:', error);
  });
} else {
  // Export for use in other scripts
  module.exports = {
    clearAllAuth0Data,
    directTokenRequest,
    checkCurrentTokenFormat,
    testAuth0SpaSDK,
    manualTokenExchange,
    runAllTests
  };
} 