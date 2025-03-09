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

    // Extract onboarding status from user attributes if available
    let onboardingStep;
    let onboardedStatus;
    
    try {
      const userAttributes = await user.fetchUserAttributes();
      logger.debug('[Session] User attributes fetched:', {
        attributeKeys: Object.keys(userAttributes)
      });
      
      // Check for onboarding attributes
      if (userAttributes['custom:onboarding_step']) {
        onboardingStep = userAttributes['custom:onboarding_step'];
      }
      
      if (userAttributes['custom:onboarding_status']) {
        onboardedStatus = userAttributes['custom:onboarding_status'];
      }
    } catch (attrError) {
      logger.warn('[Session] Failed to fetch user attributes:', {
        error: attrError.message
      });
    }
    
    // Set cookies using the API route
    try {
      const response = await fetch('/api/auth/set-cookies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idToken: tokens.idToken.toString(),
          accessToken: tokens.accessToken.toString(),
          refreshToken: tokens.refreshToken ? tokens.refreshToken.toString() : undefined,
          onboardingStep,
          onboardedStatus
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to set cookies via API: ${errorData.error || response.statusText}`);
      }

      logger.debug('[Session] Session refresh completed successfully:', {
        username: user.username,
        hasRefreshToken: !!tokens.refreshToken,
        onboardingStep,
        onboardedStatus
      });
    } catch (cookieError) {
      logger.error('[Session] Failed to set cookies via API:', {
        error: cookieError.message,
        stack: cookieError.stack
      });
      throw cookieError;
    }

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
