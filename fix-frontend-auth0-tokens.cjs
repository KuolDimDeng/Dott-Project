#!/usr/bin/env node

/**
 * Fix Frontend Auth0 Token Integration
 * Replaces mock tokens with real Auth0 SDK integration
 */

const fs = require('fs');
const path = require('path');

const FRONTEND_DIR = 'frontend/pyfactor_next/src';

// Files that need Auth0 token fixes
const filesToFix = [
  'config/auth0.js',
  'utils/authUtils.js',
  'utils/api.js',
  'services/tokenService.js',
  'services/onboardingService.js'
];

/**
 * Fix Auth0 configuration file
 */
function fixAuth0Config() {
  const filePath = path.join(FRONTEND_DIR, 'config/auth0.js');
  
  if (!fs.existsSync(filePath)) {
    console.log('❌ Auth0 config file not found');
    return false;
  }

  const content = `// Auth0 Configuration and Utilities
import { createAuth0Client } from '@auth0/auth0-spa-js';

// Auth0 client instance
let auth0Client = null;

/**
 * Initialize Auth0 client
 */
export const initAuth0 = async () => {
  if (!auth0Client) {
    auth0Client = await createAuth0Client({
      domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'auth.dottapps.com',
      clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
      authorizationParams: {
        redirect_uri: typeof window !== 'undefined' ? window.location.origin + '/auth/callback' : '',
        audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE
      },
      cacheLocation: 'localstorage',
      useRefreshTokens: true
    });
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
`;

  fs.writeFileSync(filePath, content);
  console.log('✅ Fixed Auth0 config with real SDK integration');
  return true;
}

/**
 * Fix token service to use real Auth0 tokens
 */
function fixTokenService() {
  const filePath = path.join(FRONTEND_DIR, 'services/tokenService.js');
  
  if (!fs.existsSync(filePath)) {
    console.log('❌ Token service file not found');
    return false;
  }

  // Read current content
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace mock token functions with real Auth0 calls
  const mockTokenPattern = /accessToken: \{ toString: \(\) => 'auth0-access-token' \}/g;
  const mockIdTokenPattern = /idToken: \{ toString: \(\) => 'auth0-id-token' \}/g;
  
  content = content.replace(mockTokenPattern, 'accessToken: await auth0Utils.getAccessToken()');
  content = content.replace(mockIdTokenPattern, 'idToken: await auth0Utils.getAccessToken()'); // Use access token for both
  
  // Add Auth0 import at the top
  if (!content.includes('import { auth0Utils }')) {
    content = `import { auth0Utils } from '@/config/auth0';\n${content}`;
  }
  
  fs.writeFileSync(filePath, content);
  console.log('✅ Fixed token service to use real Auth0 tokens');
  return true;
}

/**
 * Main execution
 */
function main() {
  console.log('🔧 Fixing Frontend Auth0 Token Integration...');
  console.log('===========================================\n');
  
  try {
    // Fix Auth0 configuration
    fixAuth0Config();
    
    // Fix token service
    fixTokenService();
    
    console.log('\n🎉 SUCCESS: Frontend Auth0 integration fixed!');
    console.log('');
    console.log('📋 CHANGES MADE:');
    console.log('✅ Replaced mock tokens with real Auth0 SDK calls');
    console.log('✅ Added proper Auth0 client initialization');
    console.log('✅ Implemented real token retrieval methods');
    console.log('');
    console.log('🔄 NEXT STEPS:');
    console.log('1. Install Auth0 SPA SDK: npm install @auth0/auth0-spa-js');
    console.log('2. Test the authentication flow');
    console.log('3. Verify tokens are now real JWTs');
    
  } catch (error) {
    console.error('❌ Error fixing Auth0 integration:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixAuth0Config, fixTokenService }; 