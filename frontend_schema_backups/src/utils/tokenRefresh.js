import { logger } from '@/utils/logger';
import { getCacheValue, setCacheValue, removeCacheValue } from '@/utils/appCache';
import { fetchUserAttributes, updateUserAttributes } from '@/config/amplifyUnified';

/**
 * TokenRefreshService
 * Handles token refresh for the frontend application
 */
class TokenRefreshService {
  constructor() {
    this.isRefreshing = false;
    this.refreshPromise = null;
    this.refreshSubscribers = [];
    this.tokenRefreshInterval = null;
    this.refreshThreshold = 5 * 60 * 1000; // 5 minutes in milliseconds
  }

  /**
   * Subscribe to token refresh
   * @param {Function} callback - Function to call when token is refreshed
   */
  subscribeToRefresh(callback) {
    this.refreshSubscribers.push(callback);
    return () => {
      this.refreshSubscribers = this.refreshSubscribers.filter(cb => cb !== callback);
    };
  }

  /**
   * Notify all subscribers about token refresh
   */
  notifySubscribers() {
    this.refreshSubscribers.forEach(callback => callback());
  }

  /**
   * Check if token needs refresh
   * @returns {boolean} True if token needs refresh
   */
  needsRefresh() {
    try {
      // Skip refresh check if onboarding is in progress with fallback data
      const onboardingInProgress = getCacheValue('onboardingInProgress') === 'true';
      const businessInfo = getCacheValue('businessInfo');
      
      // If we're in onboarding and have fallback data, don't keep refreshing
      if (onboardingInProgress && businessInfo) {
        logger.debug('[TokenRefresh] Skipping refresh during onboarding with fallback data');
        return false;
      }

      // Check for direct token expired flag
      const tokenExpired = getCacheValue('tokenExpired') === 'true';
      if (tokenExpired) {
        return true;
      }

      // Get token from AppCache
      const idToken = getCacheValue('idToken');
      if (!idToken) return true;

      // Parse token to get expiration
      const tokenParts = idToken.split('.');
      if (tokenParts.length !== 3) return true;

      const payload = JSON.parse(atob(tokenParts[1]));
      const expiration = payload.exp * 1000; // Convert to milliseconds
      const now = Date.now();

      // Calculate time until expiration for logging
      const minutesToExpiration = Math.round((expiration - now) / (60 * 1000));
      
      // Log expiration time if debug enabled
      if (minutesToExpiration < 10) {
        logger.debug(`[TokenRefresh] Token expires in ${minutesToExpiration} minutes`);
      }

      // Check if token will expire soon
      return now + this.refreshThreshold > expiration;
    } catch (error) {
      logger.error('[TokenRefresh] Error checking token expiration:', error);
      return true; // Refresh on error to be safe
    }
  }

  /**
   * Refresh the token
   * @returns {Promise} Promise that resolves when token is refreshed
   */
  async refreshToken() {
    // If already refreshing, return the existing promise
    if (this.isRefreshing) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = new Promise(async (resolve, reject) => {
      try {
        logger.debug('[TokenRefresh] Refreshing token');

        // Check for circuit breaker
        if (window.__CIRCUIT_BREAKER_ACTIVE) {
          logger.warn('[TokenRefresh] Circuit breaker active, skipping refresh');
          return resolve({ success: false, circuitBreaker: true });
        }

        // Add timestamp to prevent caching
        const timestamp = Date.now();
        const response = await fetch(`/api/auth/refresh?t=${timestamp}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          credentials: 'include', // Important for cookies
        });

        if (!response.ok) {
          // Special handling for onboarding scenario
          const pathname = window.location.pathname;
          if (pathname.includes('/onboarding/')) {
            // Store the current onboarding state in AppCache
            setCacheValue('onboardingInProgress', 'true', { ttl: 24 * 60 * 60 * 1000 });
            setCacheValue('onboardingStep', pathname.split('/').pop(), { ttl: 24 * 60 * 60 * 1000 });
            
            // Also try to update Cognito attributes
            try {
              await updateUserAttributes({
                userAttributes: {
                  'custom:onboardingInProgress': 'true',
                  'custom:onboardingStep': pathname.split('/').pop()
                }
              }).catch(err => logger.warn('[TokenRefresh] Failed to update Cognito:', err));
            } catch (cognitoError) {
              logger.warn('[TokenRefresh] Error updating Cognito attributes:', cognitoError);
            }
            
            logger.warn('[TokenRefresh] Token refresh failed during onboarding, saved state');
          }

          const error = await response.json().catch(() => ({}));
          throw new Error(error.message || 'Failed to refresh token');
        }

        const result = await response.json();
        logger.debug('[TokenRefresh] Token refreshed successfully');

        // Clear any token expired flags
        removeCacheValue('tokenExpired');
        
        // Notify subscribers
        this.notifySubscribers();
        resolve(result);
      } catch (error) {
        logger.error('[TokenRefresh] Token refresh failed:', error);
        
        // If the refresh token is invalid or expired, redirect to sign-in
        if (error.message?.includes('expired') || error.message?.includes('invalid token')) {
          logger.warn('[TokenRefresh] Session expired, redirecting to sign-in');
          
          // Only redirect if we're not already on the sign-in page
          const isSignInPage = window.location.pathname.includes('/auth/signin');
          const isOnboarding = window.location.pathname.includes('/onboarding/');
          
          if (!isSignInPage) {
            // If we're in onboarding, save the current step
            if (isOnboarding) {
              const step = window.location.pathname.split('/').pop();
              const url = `/auth/signin?from=onboarding&step=${step}&t=${Date.now()}`;
              window.location.href = url;
            } else {
              window.location.href = `/auth/signin?t=${Date.now()}`;
            }
          }
        }
        
        reject(error);
      } finally {
        this.isRefreshing = false;
      }
    });

    return this.refreshPromise;
  }

  /**
   * Start automatic token refresh
   */
  startAutoRefresh() {
    if (this.tokenRefreshInterval) {
      this.stopAutoRefresh();
    }

    // Check token every minute
    this.tokenRefreshInterval = setInterval(async () => {
      if (this.needsRefresh()) {
        try {
          await this.refreshToken();
        } catch (error) {
          // Error already logged in refreshToken
        }
      }
    }, 60 * 1000); // Check every minute
  }

  /**
   * Stop automatic token refresh
   */
  stopAutoRefresh() {
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
      this.tokenRefreshInterval = null;
    }
  }

  /**
   * Handle a fetch request with automatic token refresh
   * @param {string} url - URL to fetch
   * @param {Object} options - Fetch options
   * @returns {Promise} - Fetch promise
   */
  async fetchWithTokenRefresh(url, options = {}) {
    // If token needs refresh, refresh first
    if (this.needsRefresh()) {
      try {
        await this.refreshToken();
      } catch (error) {
        // Continue with request even if refresh fails
        // The request will fail if tokens are invalid
      }
    }

    // Ensure credentials are included
    const fetchOptions = {
      ...options,
      credentials: 'include', // Always include credentials
    };

    try {
      // Make the request
      const response = await fetch(url, fetchOptions);

      // If unauthorized and not already refreshing, try to refresh and retry
      if (response.status === 401 && !this.isRefreshing) {
        try {
          await this.refreshToken();
          // Retry the request with fresh token
          return fetch(url, fetchOptions);
        } catch (refreshError) {
          // If refresh fails, return original failed response
          return response;
        }
      }

      return response;
    } catch (error) {
      logger.error('[TokenRefresh] Fetch error:', error);
      throw error;
    }
  }
}

// Create singleton instance
const tokenRefreshService = new TokenRefreshService();
export default tokenRefreshService;