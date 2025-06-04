// EMERGENCY AUTH0 JWT FIX - HARDCODED CONFIG
// Use this if environment variables aren't working

import { createAuth0Client } from '@auth0/auth0-spa-js';

// HARDCODED VALUES TO FORCE JWT TOKENS
const EMERGENCY_AUTH0_CONFIG = {
  // FORCE regular Auth0 domain (NOT custom domain)
  domain: 'dev-cbyy63jovi6zrcos.us.auth0.com',
  
  // Use environment variable for client ID, fallback to known value
  clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || 'GZ5tqWE0VWusmykGZXfoxRkKJ6MMvIvJ',
  
  authorizationParams: {
    redirect_uri: typeof window !== 'undefined' ? window.location.origin + '/auth/callback' : '',
    
    // FORCE Auth0 API audience for JWT tokens
    audience: 'https://dev-cbyy63jovi6zrcos.us.auth0.com/api/v2/',
    
    // EXPLICITLY request JWT tokens
    response_type: 'code',
    scope: 'openid profile email'
  },
  
  cacheLocation: 'localstorage',
  useRefreshTokens: true,
  
  // CRITICAL: FORCE disable custom domain to prevent JWE
  useCustomDomain: false,
  
  // ADDITIONAL JWT-SPECIFIC SETTINGS
  legacySameSiteCookie: false,
  cookieDomain: undefined
};

console.log('🚨 EMERGENCY AUTH0 CONFIG LOADED:');
console.log('Domain:', EMERGENCY_AUTH0_CONFIG.domain);
console.log('Audience:', EMERGENCY_AUTH0_CONFIG.authorizationParams.audience);
console.log('UseCustomDomain:', EMERGENCY_AUTH0_CONFIG.useCustomDomain);
console.log('Should Generate JWT:', !EMERGENCY_AUTH0_CONFIG.useCustomDomain);

let emergencyAuth0Client = null;

export const initEmergencyAuth0 = async () => {
  if (!emergencyAuth0Client) {
    console.log('🔧 Initializing EMERGENCY Auth0 client for JWT tokens...');
    emergencyAuth0Client = await createAuth0Client(EMERGENCY_AUTH0_CONFIG);
  }
  return emergencyAuth0Client;
};

export const emergencyAuth0Utils = {
  getAccessToken: async () => {
    try {
      const client = await initEmergencyAuth0();
      const token = await client.getTokenSilently();
      console.log('🎉 EMERGENCY: JWT token retrieved successfully');
      
      // Verify it's a JWT (not JWE)
      if (token.startsWith('eyJ')) {
        const header = JSON.parse(atob(token.split('.')[0]));
        console.log('✅ Token header:', header);
        
        if (header.alg === 'RS256' || header.alg === 'HS256') {
          console.log('✅ SUCCESS: Got JWT token (not JWE)');
        } else {
          console.log('⚠️ WARNING: Token algorithm:', header.alg);
        }
      }
      
      return token;
    } catch (error) {
      console.error('❌ Emergency Auth0 token failed:', error);
      return null;
    }
  },

  login: async () => {
    try {
      const client = await initEmergencyAuth0();
      await client.loginWithRedirect();
    } catch (error) {
      console.error('❌ Emergency Auth0 login failed:', error);
    }
  }
};

export default emergencyAuth0Utils; 