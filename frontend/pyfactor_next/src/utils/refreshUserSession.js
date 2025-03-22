import { fetchAuthSession, getCurrentUser, signOut } from 'aws-amplify/auth';
import { logger } from '@/utils/logger';
import { parseJwt } from '@/lib/authUtils';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

const setCookie = (name, value, options = {}) => {
  try {
    const isDev = process.env.NODE_ENV === 'development';
    const cookieOptions = [
      `${name}=${value}`,
      'path=/',
      options.maxAge ? `max-age=${options.maxAge}` : '',
      isDev ? '' : 'secure',
      isDev ? 'samesite=lax' : 'samesite=strict'
    ].filter(Boolean);

    // Only set domain in production
    if (!isDev) {
      cookieOptions.push(`domain=${window.location.hostname}`);
    }

    document.cookie = cookieOptions.join('; ');
    logger.debug(`[Session] Setting cookie: ${name}`, {
      isDev,
      maxAge: options.maxAge,
      secure: !isDev,
      sameSite: isDev ? 'lax' : 'strict'
    });
    return true;
  } catch (error) {
    logger.error(`[Session] Failed to set cookie ${name}:`, {
      error: error.message,
      stack: error.stack
    });
    return false;
  }
};

const clearCookie = (name) => {
  try {
    const isDev = process.env.NODE_ENV === 'development';
    const cookieOptions = [
      `${name}=`,
      'path=/',
      'expires=Thu, 01 Jan 1970 00:00:00 GMT',
      isDev ? '' : 'secure',
      isDev ? 'samesite=lax' : 'samesite=strict'
    ].filter(Boolean);

    if (!isDev) {
      cookieOptions.push(`domain=${window.location.hostname}`);
    }

    document.cookie = cookieOptions.join('; ');
    logger.debug(`[Session] Clearing cookie: ${name}`, {
      isDev,
      secure: !isDev,
      sameSite: isDev ? 'lax' : 'strict'
    });
    return true;
  } catch (error) {
    logger.error(`[Session] Failed to clear cookie ${name}:`, {
      error: error.message,
      stack: error.stack
    });
    return false;
  }
};

export async function refreshUserSession() {
  try {
    logger.debug('[RefreshSession] Attempting to refresh session');
    
    // Use the new fetchAuthSession with forceRefresh option
    const { tokens, hasValidSession } = await fetchAuthSession({ forceRefresh: true });
    
    if (!hasValidSession || !tokens?.idToken) {
      logger.warn('[RefreshSession] No valid session after refresh attempt');
      // Sign out user if session is invalid
      await signOut();
      return false;
    }

    logger.info('[RefreshSession] Successfully refreshed session');
    return true;
  } catch (error) {
    logger.error('[RefreshSession] Failed to refresh session:', {
      error: error.message,
      name: error.name,
      code: error.code
    });
    
    // If the error is related to invalid/expired tokens, sign out the user
    if (error.name === 'NotAuthorizedException' || error.name === 'TokenExpiredError') {
      await signOut();
    }
    
    return false;
  }
}

export async function clearUserSession() {
  try {
    logger.debug('[Session] Starting session cleanup');

    // Clear cookies using the API route
    try {
      const response = await fetch('/api/auth/clear-cookies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to clear cookies via API: ${errorData.error || response.statusText}`);
      }

      logger.debug('[Session] Session cleared successfully');
      return true;
    } catch (cookieError) {
      // Fallback to client-side cookie clearing if API fails
      logger.warn('[Session] Failed to clear cookies via API, falling back to client-side:', {
        error: cookieError.message
      });
      
      const cookiesCleared = [
        clearCookie('idToken'),
        clearCookie('accessToken'),
        clearCookie('refreshToken')
      ];

      if (!cookiesCleared.every(Boolean)) {
        throw new Error('Failed to clear one or more cookies');
      }
      
      logger.debug('[Session] Session cleared successfully (client-side fallback)');
      return true;
    }
  } catch (error) {
    logger.error('[Session] Failed to clear session:', {
      error: error.message,
      stack: error.stack
    });
    return false;
  }
}
