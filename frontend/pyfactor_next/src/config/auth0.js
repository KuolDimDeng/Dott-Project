// Auth0 Configuration and Utilities
// Version: 2025-06-04 - JWT Token Fix Deployment
import { createAuth0Client } from '@auth0/auth0-spa-js';

// Auth0 client instance
let auth0Client = null;

// Debug logging for environment variables
console.log('[Auth0Config] Environment Variables:', {
  domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN,
  audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE,
  clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID ? '***' : 'missing'
});

/**
 * Initialize Auth0 client
 */
export const initAuth0 = async () => {
  if (!auth0Client) {
    const config = {
      // Use regular Auth0 domain for JWT tokens (NOT custom domain)
      domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'dev-cbyy63jovi6zrcos.us.auth0.com',
      clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
      authorizationParams: {
        redirect_uri: typeof window !== 'undefined' ? window.location.origin + '/auth/callback' : '',
        // Use Auth0 API audience for JWT tokens
        audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE,
        // Explicitly request JWT tokens (NOT JWE)
        response_type: 'code',
        scope: 'openid profile email'
      },
      cacheLocation: 'localstorage',
      useRefreshTokens: true,
      // CRITICAL: Disable custom domain to prevent JWE encryption
      useCustomDomain: false
    };
    
    console.log('[Auth0Config] Client Configuration:', {
      domain: config.domain,
      audience: config.authorizationParams.audience,
      useCustomDomain: config.useCustomDomain
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
      const token = await client.getTokenSilently();
      console.log('[Auth0] Real access token retrieved');
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
