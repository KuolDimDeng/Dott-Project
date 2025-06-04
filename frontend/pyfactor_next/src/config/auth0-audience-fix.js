// EMERGENCY AUTH0 AUDIENCE FIX - Based on Auth0 Community Solutions
// This addresses the JWE vs JWT token issue by ensuring audience is properly set

import { createAuth0Client } from '@auth0/auth0-spa-js';

// CRITICAL: Force audience at multiple levels
const FORCE_JWT_AUDIENCE = 'https://dev-cbyy63jovi6zrcos.us.auth0.com/api/v2/';
const FORCE_DOMAIN = 'dev-cbyy63jovi6zrcos.us.auth0.com';

console.log('🚨 EMERGENCY AUTH0 AUDIENCE FIX LOADING...');

/**
 * Create Auth0 client with FORCED audience to prevent JWE tokens
 * Based on Auth0 Community solution: "Auth0 will return an opaque token if you do not include an audience field"
 */
export const createFixedAuth0Client = async () => {
  const config = {
    domain: FORCE_DOMAIN,
    clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || 'GZ5tqWE0VWusmykGZXfoxRkKJ6MMvIvJ',
    authorizationParams: {
      redirect_uri: typeof window !== 'undefined' ? window.location.origin + '/auth/callback' : '',
      // CRITICAL: Audience MUST be set to get JWT instead of JWE
      audience: FORCE_JWT_AUDIENCE,
      scope: 'openid profile email',
      // FORCE response type for JWT
      response_type: 'code'
    },
    cacheLocation: 'localstorage',
    useRefreshTokens: true,
    // CRITICAL: Must be false for JWT tokens
    useCustomDomain: false
  };

  console.log('🔧 Auth0 Config with FORCED audience:', {
    domain: config.domain,
    audience: config.authorizationParams.audience,
    useCustomDomain: config.useCustomDomain,
    expectedTokenType: 'JWT (not JWE)'
  });

  return await createAuth0Client(config);
};

/**
 * Get access token with explicit audience to force JWT format
 */
export const getJWTAccessToken = async (auth0Client) => {
  try {
    // Method 1: Try with explicit options
    const token = await auth0Client.getTokenSilently({
      authorizationParams: {
        audience: FORCE_JWT_AUDIENCE,
        scope: 'openid profile email'
      }
    });

    console.log('✅ Token retrieved with forced audience');
    
    // Verify token format
    if (token && token.startsWith('eyJ')) {
      try {
        const header = JSON.parse(atob(token.split('.')[0]));
        console.log('🔍 Token header analysis:', header);
        
        if (header.alg === 'dir' && header.enc) {
          console.error('🚨 STILL JWE! Header:', header);
          throw new Error('Still receiving JWE tokens despite audience fix');
        } else {
          console.log('✅ SUCCESS: JWT token received! Header:', header);
        }
      } catch (parseError) {
        console.log('Token header parse failed, but token retrieved');
      }
    }
    
    return token;
  } catch (error) {
    console.error('❌ Token retrieval failed:', error);
    throw error;
  }
};

export default {
  createFixedAuth0Client,
  getJWTAccessToken,
  FORCE_JWT_AUDIENCE,
  FORCE_DOMAIN
}; 