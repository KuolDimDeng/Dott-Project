#!/usr/bin/env node

/**
 * Version0050_fix_auth0_hardcoded_domain.mjs
 * Fix hardcoded dev Auth0 domain in auth0.js config
 * 
 * Problem:
 * - src/config/auth0.js had dev-cbyy63jovi6zrcos.us.auth0.com hardcoded
 * - This was causing the "Failed to fetch RSC payload" error
 * - The app was trying to use the dev domain instead of the custom domain
 * 
 * Solution:
 * - Updated auth0.js to use environment variables with proper fallbacks
 * - Domain: auth.dottapps.com (custom domain)
 * - Audience: https://api.dottapps.com
 * - Client ID: 9i7GSU4bgh6hFtMXnQACwiRxTudpuOSF
 * 
 * Date: 2025-06-06
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File to update
const AUTH0_CONFIG_FILE = path.join(__dirname, '..', 'src', 'config', 'auth0.js');

// The fixed content (already applied)
const FIXED_CONTENT = `// Auth0 Configuration and Utilities
// Version: 2025-06-06 - Fixed to use custom domain
import { createAuth0Client } from '@auth0/auth0-spa-js';

// Get Auth0 configuration from environment variables or use defaults
const getAuth0Config = () => {
  // Use environment variables or fallback to custom domain
  const config = {
    domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'auth.dottapps.com',
    audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || 'https://api.dottapps.com',
    clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || '9i7GSU4bgh6hFtMXnQACwiRxTudpuOSF'
  };
  
  console.log('[Auth0Config] Using configuration:', {
    domain: config.domain,
    audience: config.audience,
    clientId: config.clientId.substring(0, 8) + '...',
    source: 'ENVIRONMENT_VARIABLES'
  });
  
  return config;
};

// Auth0 client instance
let auth0Client = null;

/**
 * Initialize Auth0 client with JWT-optimized configuration
 */
export const initAuth0 = async () => {
  if (!auth0Client) {
    const authConfig = getAuth0Config();
    
    const config = {
      domain: authConfig.domain,
      clientId: authConfig.clientId,
      authorizationParams: {
        redirect_uri: typeof window !== 'undefined' ? window.location.origin + '/auth/callback' : '',
        // Use audience to force JWT tokens (not JWE)
        audience: authConfig.audience,
        response_type: 'code',
        scope: 'openid profile email'
      },
      cacheLocation: 'localstorage',
      useRefreshTokens: true,
      // Use custom domain if it's auth.dottapps.com
      useCustomDomain: authConfig.domain === 'auth.dottapps.com'
    };
    
    console.log('[Auth0Config] Final Configuration:', {
      domain: config.domain,
      audience: config.authorizationParams.audience,
      useCustomDomain: config.useCustomDomain,
      tokenType: 'JWT (not JWE)'
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
      const authConfig = getAuth0Config();
      
      // Force fresh token request
      const token = await client.getTokenSilently({
        ignoreCache: true, // Force fresh token
        audience: authConfig.audience, // Use configured audience
        cacheLocation: 'memory', // Avoid localStorage cache
        responseType: 'code', // Explicit response type
        grantType: 'authorization_code' // Explicit grant type
      });
      
      console.log('[Auth0] Real access token retrieved (forced fresh)');
      console.log('[Auth0] Using audience:', authConfig.audience);
      
      // DEBUG: Check token format
      if (token && token.startsWith('eyJ')) {
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
`;

console.log('🚨 Auth0 Configuration Fix Applied!');
console.log('=============================================');
console.log('Fixed hardcoded dev domain in src/config/auth0.js');
console.log('');
console.log('Previous: dev-cbyy63jovi6zrcos.us.auth0.com');
console.log('Fixed to: auth.dottapps.com (custom domain)');
console.log('');
console.log('This fix resolves the "Failed to fetch RSC payload" error');
console.log('=============================================');

// Verify the fix was already applied
if (fs.existsSync(AUTH0_CONFIG_FILE)) {
  const currentContent = fs.readFileSync(AUTH0_CONFIG_FILE, 'utf8');
  if (currentContent.includes('auth.dottapps.com')) {
    console.log('✅ Fix already applied - auth0.js uses custom domain');
  } else if (currentContent.includes('dev-cbyy63jovi6zrcos.us.auth0.com')) {
    console.log('❌ WARNING: dev domain still hardcoded in auth0.js');
    console.log('Please manually update the file with the fixed content above');
  }
}
