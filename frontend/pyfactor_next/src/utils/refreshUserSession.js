import { logger } from '@/utils/logger';
import { parseJwt } from '@/lib/authUtils';
import { setCacheValue, getCacheValue } from './appCache';

/**
 * Migration function to convert ID tokens to access tokens
 * This should be called at application startup to handle any
 * existing authentication that might still be using ID tokens
 */
export function migrateToAccessTokens() {
  if (typeof window === 'undefined') return;
  
  try {
    // Initialize APP_CACHE if needed
    if (!window.__APP_CACHE) {
      window.__APP_CACHE = {};
    }
    
    if (!window.__APP_CACHE.auth) {
      window.__APP_CACHE.auth = {};
    }
    
    // Check if we need to migrate from ID token to access token
    const legacyIdToken = window.__APP_CACHE.auth.idToken || getCacheValue('idToken');
    const currentAccessToken = window.__APP_CACHE.auth.token || getCacheValue('token');
    
    if (legacyIdToken && !currentAccessToken) {
      logger.info('[Auth] Migrating from ID token to access token auth');
      
      // For Auth0, we prefer using access tokens for API calls
      // If we only have an ID token, we'll try to use it temporarily
      // but should trigger a proper token refresh
      window.__APP_CACHE.auth.token = legacyIdToken;
      setCacheValue('token', legacyIdToken);
      
      // Mark that we need a proper refresh
      window.__APP_CACHE.auth.needsRefresh = true;
      
      logger.info('[Auth] Temporary migration completed - refresh needed');
    }
    
    return true;
  } catch (error) {
    logger.error('[Auth] Error during token migration:', error);
    return false;
  }
}

/**
 * Set up Hub deduplication (no-op for Auth0 - keeping for compatibility)
 */
export function setupHubDeduplication() {
  logger.debug('[Auth] Hub deduplication not needed for Auth0');
  return true;
}

// Add a function to ensure the APP_CACHE auth provider is set
export function ensureAuthProvider() {
  if (typeof window !== 'undefined') {
    try {
      // Initialize APP_CACHE if needed
      if (!window.__APP_CACHE) {
        window.__APP_CACHE = {};
      }
      
      // Initialize auth section if needed
      if (!window.__APP_CACHE.auth) {
        window.__APP_CACHE.auth = {};
      }
      
      // Set provider to auth0 for the current authentication system
      if (!window.__APP_CACHE.auth.provider) {
        logger.info('[Auth] Setting missing auth provider to "auth0" in APP_CACHE');
        window.__APP_CACHE.auth.provider = 'auth0';
      }
      
      return true;
    } catch (error) {
      logger.error('[Auth] Error ensuring auth provider:', error);
      return false;
    }
  }
  return false;
}

// Rate limiting for refresh attempts
let lastSuccessfulRefresh = 0;
const REFRESH_COOLDOWN = 30000; // 30 seconds minimum between refreshes

export const refreshUserSession = async () => {
  try {
    // Check rate limiting
    const now = Date.now();
    if (now - lastSuccessfulRefresh < REFRESH_COOLDOWN) {
      logger.debug('[Auth] Refresh rate limited, skipping');
      return false;
    }

    logger.info('[Auth] Attempting to refresh user session');
    
    // Ensure auth provider is set correctly
    ensureAuthProvider();
    
    // For Auth0, we don't need to manually refresh tokens
    // Auth0 SDK handles this automatically
    // We just need to check if we have valid tokens
    
    const authProvider = window.__APP_CACHE?.auth?.provider || 'auth0';
    
    if (authProvider === 'auth0') {
      // For Auth0, check if we have a valid session
      // The Auth0 SDK will handle token refresh automatically
      logger.info('[Auth] Using Auth0 authentication - automatic token management');
      
      // Check if we have basic auth info
      const hasToken = !!(window.__APP_CACHE?.auth?.token || getCacheValue('token'));
      
      if (hasToken) {
        lastSuccessfulRefresh = Date.now();
        logger.info('[Auth] Auth0 session appears valid');
        return true;
      } else {
        logger.info('[Auth] No Auth0 token found - user may need to re-authenticate');
        return false;
      }
    }
    
    logger.warn('[Auth] Unknown auth provider:', authProvider);
    return false;
    
  } catch (error) {
    logger.error('[Auth] Session refresh failed:', error);
    return false;
  }
};

/**
 * Store tokens in APP_CACHE
 * @param {Object} tokens The tokens to store
 */
function storeTokensInAppCache(tokens) {
  try {
    if (!window.__APP_CACHE) {
      window.__APP_CACHE = {};
    }
    
    if (!window.__APP_CACHE.auth) {
      window.__APP_CACHE.auth = {};
    }
    
    // Store the access token in APP_CACHE as the primary token for API authorization
    if (tokens.accessToken) {
      window.__APP_CACHE.auth.token = tokens.accessToken; // Use access token as the primary token
      setCacheValue('token', tokens.accessToken);
      
      // Set the auth provider to 'auth0' for the current authentication system
      window.__APP_CACHE.auth.provider = 'auth0';
      
      // Parse and store token expiry
      const decodedToken = parseJwt(tokens.accessToken);
      if (decodedToken && decodedToken.exp) {
        const expiry = decodedToken.exp * 1000; // Convert to milliseconds
        window.__APP_CACHE.auth.tokenExpiry = expiry;
        setCacheValue('tokenExpiry', expiry);
      }
      
      logger.debug('[Auth] Access token stored in APP_CACHE');
    }
    
    // Store ID token separately if provided
    if (tokens.idToken) {
      window.__APP_CACHE.auth.idToken = tokens.idToken;
      setCacheValue('idToken', tokens.idToken);
      logger.debug('[Auth] ID token stored in APP_CACHE');
    }
    
    // Store refresh token if provided
    if (tokens.refreshToken) {
      window.__APP_CACHE.auth.refreshToken = tokens.refreshToken;
      setCacheValue('refreshToken', tokens.refreshToken);
      logger.debug('[Auth] Refresh token stored in APP_CACHE');
    }
    
    // Mark timestamp
    const timestamp = Date.now();
    window.__APP_CACHE.auth.tokenTimestamp = timestamp;
    setCacheValue('tokenTimestamp', timestamp);
    setCacheValue('hasSession', true);
    
    logger.info('[Auth] Tokens stored successfully in APP_CACHE');
  } catch (error) {
    logger.error('[Auth] Error storing tokens in APP_CACHE:', error);
  }
}

const forceRelogin = async () => {
  try {
    logger.warn('[Auth] Force relogin triggered');
    
    // Clear the session
    await clearUserSession();
    
    // For Auth0, redirect to login
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/signin';
    }
    
    return true;
  } catch (error) {
    logger.error('[Auth] Error during force relogin:', error);
    return false;
  }
};

export async function clearUserSession() {
  try {
    logger.debug('[Session] Starting session cleanup');
    
    // Clear tokens from APP_CACHE
    if (window.__APP_CACHE && window.__APP_CACHE.auth) {
      window.__APP_CACHE.auth = {
        provider: window.__APP_CACHE.auth.provider // Keep the provider info
      };
    }
    
    // Clear tokens from appCache utility
    setCacheValue('token', null); // Clear the primary token (access token)
    setCacheValue('idToken', null);
    setCacheValue('refreshToken', null);
    setCacheValue('tokenTimestamp', null);
    setCacheValue('tokenExpiry', null);
    setCacheValue('hasSession', false);
    
    logger.debug('[Session] Session cleared successfully');
    return true;
  } catch (error) {
    logger.error('[Session] Failed to clear session:', {
      error: error.message,
      stack: error.stack
    });
    return false;
  }
}

export const getStoredTokens = () => {
  try {
    const token = window.__APP_CACHE?.auth?.token || getCacheValue('token');
    const idToken = window.__APP_CACHE?.auth?.idToken || getCacheValue('idToken');
    const refreshToken = window.__APP_CACHE?.auth?.refreshToken || getCacheValue('refreshToken');
    
    return {
      accessToken: token,
      idToken: idToken,
      refreshToken: refreshToken,
      hasTokens: !!(token || idToken)
    };
  } catch (error) {
    logger.error('[Auth] Error getting stored tokens:', error);
    return {
      accessToken: null,
      idToken: null,
      refreshToken: null,
      hasTokens: false
    };
  }
};
