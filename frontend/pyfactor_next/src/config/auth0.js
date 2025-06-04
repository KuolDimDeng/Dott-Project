// Auth0 Configuration and Utilities
// Version: 2025-06-04 - JWT Token Fix Deployment v3 - HARDCODED AUDIENCE FIX
import { createAuth0Client } from '@auth0/auth0-spa-js';

// EMERGENCY: HARDCODE correct values since environment variables aren't working
const HARDCODED_AUTH0_CONFIG = {
  domain: 'dev-cbyy63jovi6zrcos.us.auth0.com',
  audience: 'https://api.dottapps.com', // HARDCODED CORRECT VALUE
  clientId: 'GZ5tqWE0VWusmykGZXfoxRkKJ6MMvIvJ'
};

// Force environment variables if not set correctly
if (typeof window !== 'undefined') {
  console.warn('🚨 EMERGENCY: Forcing hardcoded Auth0 audience to fix JWE issue');
  // Override problematic environment variables
  process.env.NEXT_PUBLIC_AUTH0_AUDIENCE = HARDCODED_AUTH0_CONFIG.audience;
  process.env.NEXT_PUBLIC_AUTH0_DOMAIN = HARDCODED_AUTH0_CONFIG.domain;
  process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID = HARDCODED_AUTH0_CONFIG.clientId;
}

// Auth0 client instance
let auth0Client = null;

// Debug logging for configuration
console.log('[Auth0Config] EMERGENCY: Using hardcoded configuration to bypass environment variable issues');
console.log('[Auth0Config] Hardcoded Config:', HARDCODED_AUTH0_CONFIG);

/**
 * Initialize Auth0 client
 */
export const initAuth0 = async () => {
  if (!auth0Client) {
    const config = {
      // EMERGENCY: Use hardcoded values to bypass environment variable issues
      domain: HARDCODED_AUTH0_CONFIG.domain,
      clientId: HARDCODED_AUTH0_CONFIG.clientId,
      authorizationParams: {
        redirect_uri: typeof window !== 'undefined' ? window.location.origin + '/auth/callback' : '',
        // EMERGENCY: Use hardcoded audience to force JWT tokens
        audience: HARDCODED_AUTH0_CONFIG.audience,
        // Explicitly request JWT tokens (NOT JWE)
        response_type: 'code',
        scope: 'openid profile email'
      },
      cacheLocation: 'localstorage',
      useRefreshTokens: true,
      // CRITICAL: FORCE disable custom domain to prevent JWE encryption
      useCustomDomain: false
    };
    
    console.log('[Auth0Config] EMERGENCY Hardcoded Configuration:', {
      domain: config.domain,
      audience: config.authorizationParams.audience,
      useCustomDomain: config.useCustomDomain,
      willGenerateJWT: !config.useCustomDomain
    });

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
        audience: HARDCODED_AUTH0_CONFIG.audience, // Use hardcoded value
        cacheLocation: 'memory', // Avoid localStorage cache
        responseType: 'code', // Explicit response type
        grantType: 'authorization_code' // Explicit grant type
      });
      
      console.log('[Auth0] Real access token retrieved (forced fresh)');
      console.log('[Auth0] Using HARDCODED audience:', HARDCODED_AUTH0_CONFIG.audience);
      
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
