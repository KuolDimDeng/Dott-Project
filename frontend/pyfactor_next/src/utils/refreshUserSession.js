import { fetchAuthSession, getCurrentUser, signOut } from 'aws-amplify/auth';
import { logger } from '@/utils/logger';
import { parseJwt } from '@/lib/authUtils';

const MAX_RETRIES = 5;
const RETRY_DELAY = 1000;

const setCookie = (name, value, options = {}) => {
  try {
    const isDev = process.env.NODE_ENV === 'development';
    const defaultMaxAge = 2 * 24 * 60 * 60; // 2 days
    
    const cookieOptions = [
      `${name}=${encodeURIComponent(value)}`,
      'path=/',
      options.maxAge ? `max-age=${options.maxAge}` : `max-age=${defaultMaxAge}`,
      isDev ? '' : 'secure',
      options.sameSite || (isDev ? 'samesite=lax' : 'samesite=strict')
    ].filter(Boolean);

    if (!isDev) {
      cookieOptions.push(`domain=${window.location.hostname}`);
    }

    document.cookie = cookieOptions.join('; ');
    logger.debug(`[Session] Setting cookie: ${name}`, {
      isDev,
      maxAge: options.maxAge || defaultMaxAge,
      secure: !isDev,
      sameSite: options.sameSite || (isDev ? 'lax' : 'strict')
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
  let retryCount = 0;
  const maxRetries = MAX_RETRIES;
  
  async function attemptRefresh() {
    try {
      logger.debug(`[RefreshSession] Attempting to refresh session (attempt ${retryCount + 1}/${maxRetries})`);
      
      try {
        const currentSession = await fetchAuthSession();
        if (currentSession?.tokens?.idToken) {
          const decodedToken = parseJwt(currentSession.tokens.idToken.toString());
          const tokenExpiry = decodedToken.exp * 1000;
          const now = Date.now();
          const timeRemaining = tokenExpiry - now;
          
          if (timeRemaining > 10 * 60 * 1000) {
            logger.debug(`[RefreshSession] Current token still valid for ${Math.round(timeRemaining/60000)} minutes, using it`);
            
            storeTokensInCookies(currentSession.tokens);
            return true;
          }
          
          logger.debug(`[RefreshSession] Current token expiring soon (${Math.round(timeRemaining/60000)} minutes), forcing refresh`);
        }
      } catch (currentSessionError) {
        logger.warn('[RefreshSession] Error checking current session:', currentSessionError);
      }
      
      const { tokens, hasValidSession } = await fetchAuthSession({ forceRefresh: true });
      
      if (!hasValidSession || !tokens?.idToken) {
        logger.warn('[RefreshSession] No valid session after refresh attempt');
        
        try {
          const user = await getCurrentUser();
          if (user) {
            logger.debug('[RefreshSession] Got user without tokens, preserving some state');
            setCookie('userId', user.userId, { maxAge: 7 * 24 * 60 * 60, sameSite: 'lax' });
            setCookie('hasUser', 'true', { maxAge: 7 * 24 * 60 * 60, sameSite: 'lax' });
          }
        } catch (userError) {
          logger.warn('[RefreshSession] Could not get current user:', userError);
        }
        
        if (retryCount < maxRetries - 1) {
          retryCount++;
          const delay = RETRY_DELAY * Math.pow(2, retryCount - 1);
          logger.debug(`[RefreshSession] Retrying after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return attemptRefresh();
        }
        
        if (document.cookie.includes('idToken=') || document.cookie.includes('accessToken=')) {
          logger.warn('[RefreshSession] No valid session but found token cookies, attempting to work with those');
          return true;
        }
        
        try {
          logger.warn('[RefreshSession] Max retries reached, signing out');
          await signOut();
        } catch (signOutError) {
          logger.error('[RefreshSession] Error during sign-out after failed refresh:', signOutError);
        }
        return false;
      }

      storeTokensInCookies(tokens);
      
      logger.info('[RefreshSession] Successfully refreshed session');
      return true;
    } catch (error) {
      logger.error('[RefreshSession] Failed to refresh session:', {
        error: error.message,
        name: error.name,
        code: error.code,
        attempt: retryCount + 1
      });
      
      if (retryCount < maxRetries - 1) {
        retryCount++;
        const delay = RETRY_DELAY * Math.pow(2, retryCount - 1);
        logger.debug(`[RefreshSession] Retrying after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return attemptRefresh();
      }
      
      if (retryCount === maxRetries - 1) {
        logger.debug('[RefreshSession] Final retry with longer delay...');
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, 3000));
        return attemptRefresh();
      }
      
      if (error.name === 'NotAuthorizedException' || error.name === 'TokenExpiredError') {
        try {
          await signOut();
        } catch (signOutError) {
          logger.error('[RefreshSession] Error during sign-out after failed refresh:', signOutError);
        }
      }
      
      return false;
    }
  }
  
  return attemptRefresh();
}

function storeTokensInCookies(tokens) {
  try {
    if (tokens.idToken) {
      const decodedToken = parseJwt(tokens.idToken.toString());
      const tokenExpiry = decodedToken.exp * 1000;
      const now = Date.now();
      const maxAgeSeconds = Math.floor((tokenExpiry - now) / 1000);
      
      setCookie('idToken', tokens.idToken.toString(), { 
        maxAge: Math.min(maxAgeSeconds, 2 * 24 * 60 * 60),
        sameSite: 'lax'
      });
      
      if (decodedToken.sub) {
        setCookie('userId', decodedToken.sub, { 
          maxAge: 7 * 24 * 60 * 60,
          sameSite: 'lax'
        });
      }
      
      setCookie('tokenExpiry', tokenExpiry.toString(), { 
        maxAge: Math.min(maxAgeSeconds, 2 * 24 * 60 * 60),
        sameSite: 'lax'
      });
    }
    
    if (tokens.accessToken) {
      setCookie('accessToken', tokens.accessToken.toString(), { 
        maxAge: 24 * 60 * 60,
        sameSite: 'lax'
      });
    }
    
    setCookie('hasSession', 'true', { 
      maxAge: 24 * 60 * 60,
      sameSite: 'lax'
    });
    
    logger.debug('[RefreshSession] Stored tokens in cookies with enhanced security');
    return true;
  } catch (cookieError) {
    logger.warn('[RefreshSession] Failed to update cookies with new tokens:', cookieError);
    return false;
  }
}

export async function clearUserSession() {
  try {
    logger.debug('[Session] Starting session cleanup');

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
