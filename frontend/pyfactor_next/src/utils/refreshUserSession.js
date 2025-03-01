import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';
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

export async function refreshUserSession(retryCount = 0) {
  try {
    logger.debug('[Session] Starting session refresh:', {
      attempt: retryCount + 1,
      maxAttempts: MAX_RETRIES
    });

    // Get current session using v6 API with force refresh
    const { tokens } = await fetchAuthSession({
      forceRefresh: true
    });

    if (!tokens?.idToken) {
      throw new Error('No valid session');
    }

    // Parse tokens for logging
    const idTokenData = parseJwt(tokens.idToken.toString());
    const accessTokenData = parseJwt(tokens.accessToken.toString());

    logger.debug('[Session] Tokens fetched:', {
      hasIdToken: !!tokens.idToken,
      hasAccessToken: !!tokens.accessToken,
      hasRefreshToken: !!tokens.refreshToken,
      idTokenExp: idTokenData?.exp ? new Date(idTokenData.exp * 1000) : null,
      accessTokenExp: accessTokenData?.exp ? new Date(accessTokenData.exp * 1000) : null,
      username: idTokenData?.username
    });

    // Get current user using v6 API
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('No current user found');
    }

    logger.debug('[Session] Current user fetched:', {
      username: user.username,
      attributes: Object.keys(user.attributes)
    });

    // Set cookies with proper durations
    const cookiesSet = [
      setCookie('idToken', tokens.idToken.toString(), { maxAge: 3600 }), // 1 hour
      setCookie('accessToken', tokens.accessToken.toString(), { maxAge: 3600 }), // 1 hour
    ];

    if (tokens.refreshToken) {
      cookiesSet.push(
        setCookie('refreshToken', tokens.refreshToken.toString(), { maxAge: 86400 }) // 24 hours
      );
      logger.debug('[Session] Refresh token cookie set');
    }

    // Check if all cookies were set successfully
    if (!cookiesSet.every(Boolean)) {
      throw new Error('Failed to set one or more cookies');
    }

    logger.debug('[Session] Session refresh completed successfully:', {
      username: user.username,
      cookiesSet: cookiesSet.length,
      hasRefreshToken: !!tokens.refreshToken
    });

    return true;
  } catch (error) {
    logger.error('[Session] Failed to refresh session:', {
      error: error.message,
      code: error.code,
      retryCount,
      stack: error.stack
    });

    // Implement exponential backoff for retries
    if (retryCount < MAX_RETRIES) {
      const delay = Math.pow(2, retryCount) * RETRY_DELAY;
      logger.debug(`[Session] Retrying refresh after ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return refreshUserSession(retryCount + 1);
    }

    // Clear cookies on failure
    clearCookie('idToken');
    clearCookie('accessToken');
    clearCookie('refreshToken');

    logger.debug('[Session] Cookies cleared after refresh failure');
    return false;
  }
}

export async function clearUserSession() {
  try {
    logger.debug('[Session] Starting session cleanup');

    // Clear cookies
    const cookiesCleared = [
      clearCookie('idToken'),
      clearCookie('accessToken'),
      clearCookie('refreshToken')
    ];

    // Check if all cookies were cleared successfully
    if (!cookiesCleared.every(Boolean)) {
      throw new Error('Failed to clear one or more cookies');
    }

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
