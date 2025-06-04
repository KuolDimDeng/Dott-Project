// Auth0 Configuration and Utilities
// Version: 2025-06-04 - JWT Token Fix Deployment v2 - FORCE REDEPLOY
import { createAuth0Client } from '@auth0/auth0-spa-js';

// EMERGENCY: Force environment variables if not set correctly
if (typeof window !== 'undefined' && !process.env.NEXT_PUBLIC_AUTH0_AUDIENCE) {
  console.warn('🚨 EMERGENCY: Setting missing AUTH0_AUDIENCE environment variable');
  process.env.NEXT_PUBLIC_AUTH0_AUDIENCE = 'https://api.dottapps.com';
}

// Auth0 client instance
let auth0Client = null;

// FORCE JWT CONFIGURATION - Override environment variables if needed
const FORCE_JWT_CONFIG = {
  domain: 'dev-cbyy63jovi6zrcos.us.auth0.com',
  audience: 'https://api.dottapps.com', // Updated to match Auth0 API identifier
  useCustomDomain: false // CRITICAL: Must be false for JWT
};

// Debug logging for environment variables
console.log('[Auth0Config] Environment Variables:', {
  domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN,
  audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE,
  clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID ? '***' : 'missing'
});

console.log('[Auth0Config] Force JWT Config:', FORCE_JWT_CONFIG);

/**
 * Initialize Auth0 client
 */
export const initAuth0 = async () => {
  if (!auth0Client) {
    const config = {
      // PRIORITY: Use forced config if env vars are missing/incorrect
      domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN || FORCE_JWT_CONFIG.domain,
      clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
      authorizationParams: {
        redirect_uri: typeof window !== 'undefined' ? window.location.origin + '/auth/callback' : '',
        // PRIORITY: Use forced config for audience
        audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || FORCE_JWT_CONFIG.audience,
        // Explicitly request JWT tokens (NOT JWE)
        response_type: 'code',
        scope: 'openid profile email'
      },
      cacheLocation: 'localstorage',
      useRefreshTokens: true,
      // CRITICAL: FORCE disable custom domain to prevent JWE encryption
      useCustomDomain: FORCE_JWT_CONFIG.useCustomDomain
    };
    
    console.log('[Auth0Config] Final Configuration:', {
      domain: config.domain,
      audience: config.authorizationParams.audience,
      useCustomDomain: config.useCustomDomain,
      willGenerateJWT: !config.useCustomDomain
    });

    // Verify configuration will generate JWT
    if (config.useCustomDomain === true) {
      console.error('🚨 WARNING: useCustomDomain is true - this will generate JWE tokens!');
      config.useCustomDomain = false; // Force override
      console.log('✅ FORCED useCustomDomain to false for JWT generation');
    }
    
    auth0Client = await createAuth0Client(config);
  }
  return auth0Client;
};

/**
 * Get Auth0 client instance
 */
export const getAuth0Client = async () => {
  if (!auth0Client) {
    await initAuth0();
  }
  return auth0Client;
};

// Auth0 utility functions
export const auth0Utils = {
  /**
   * Get real access token from Auth0
   */
  getAccessToken: async () => {
    try {
      const client = await getAuth0Client();
      
      // EMERGENCY: Force fresh token request to avoid cached JWE tokens
      const token = await client.getTokenSilently({
        ignoreCache: true, // Force fresh token
        audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || FORCE_JWT_CONFIG.audience,
        cacheLocation: 'memory', // Avoid localStorage cache
        responseType: 'code', // Explicit response type
        grantType: 'authorization_code' // Explicit grant type
      });
      
      console.log('[Auth0] Real access token retrieved (forced fresh)');
      console.log('[Auth0] Using audience:', process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || FORCE_JWT_CONFIG.audience);
      
      // DEBUG: Check token format
      if (token.startsWith('eyJ')) {
        try {
          const header = JSON.parse(atob(token.split('.')[0]));
          console.log('[Auth0] Token header:', header);
          
          if (header.alg === 'dir' && header.enc) {
            console.error('🚨 ERROR: Still receiving JWE tokens!', header);
            console.error('🚨 This means Auth0 audience is not being used correctly');
          } else if (header.alg === 'RS256' || header.alg === 'HS256') {
            console.log('✅ SUCCESS: Received JWT token!', header);
          }
        } catch (e) {
          console.log('[Auth0] Could not parse token header');
        }
      }
      
      return token;
    } catch (error) {
      console.error('[Auth0] Error getting access token:', error);
      
      // Fallback: try from API route
      try {
        const response = await fetch('/api/auth/token');
        if (response.ok) {
          const data = await response.json();
          return data.accessToken;
        }
      } catch (apiError) {
        console.error('[Auth0] API fallback failed:', apiError);
      }
      
      return null;
    }
  },
  
  /**
   * Get user from Auth0
   */
  getUser: async () => {
    try {
      const client = await getAuth0Client();
      const user = await client.getUser();
      console.log('[Auth0] User retrieved from Auth0');
      return user;
    } catch (error) {
      console.error('[Auth0] Error getting user:', error);
      
      // Fallback: try from API route
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          return await response.json();
        }
      } catch (apiError) {
        console.error('[Auth0] API fallback failed:', apiError);
      }
      
      return null;
    }
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated: async () => {
    try {
      const client = await getAuth0Client();
      return await client.isAuthenticated();
    } catch (error) {
      console.error('[Auth0] Error checking authentication:', error);
      return false;
    }
  },

  /**
   * Login with Auth0
   */
  login: async (options = {}) => {
    try {
      const client = await getAuth0Client();
      await client.loginWithRedirect({
        authorizationParams: {
          screen_hint: 'login',
          ...options
        }
      });
    } catch (error) {
      console.error('[Auth0] Login failed:', error);
      throw error;
    }
  },

  /**
   * Logout from Auth0
   */
  logout: async () => {
    try {
      const client = await getAuth0Client();
      await client.logout({
        logoutParams: {
          returnTo: typeof window !== 'undefined' ? window.location.origin : ''
        }
      });
    } catch (error) {
      console.error('[Auth0] Logout failed:', error);
      throw error;
    }
  }
};

export default auth0Utils;
