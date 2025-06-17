/**
 * Session Propagation Middleware
 * Handles cookie propagation delays between server-side and client-side components
 */

import { logger } from '@/utils/logger';

export class SessionPropagationHandler {
  constructor() {
    this.maxRetries = 3;
    this.retryDelay = 500; // ms
    this.propagationTimeout = 5000; // 5 seconds max wait
  }

  /**
   * Check if session is pending propagation
   */
  isSessionPending() {
    if (typeof window === 'undefined') return false;
    
    // Check for pending markers
    const pendingMarker = document.cookie.includes('session_pending=1');
    const justAuthenticated = sessionStorage.getItem('auth_timestamp');
    
    if (justAuthenticated) {
      const authTime = parseInt(justAuthenticated);
      const timeSinceAuth = Date.now() - authTime;
      
      // If authenticated within last 5 seconds, consider pending
      if (timeSinceAuth < 5000) {
        logger.info('[SessionPropagation] Recently authenticated, session may be pending');
        return true;
      }
    }
    
    return pendingMarker;
  }

  /**
   * Wait for session cookies to propagate
   */
  async waitForPropagation() {
    const startTime = Date.now();
    let attempts = 0;
    
    while (attempts < this.maxRetries) {
      attempts++;
      
      // Check if we have session cookies
      const hasDottSession = document.cookie.includes('dott_auth_session=');
      const hasAppSession = document.cookie.includes('appSession=');
      const hasSessionToken = document.cookie.includes('session_token=');
      const hasOnboardingStatus = document.cookie.includes('onboarding_status=');
      
      logger.info(`[SessionPropagation] Attempt ${attempts}/${this.maxRetries}:`, {
        hasDottSession,
        hasAppSession,
        hasSessionToken,
        hasOnboardingStatus,
        elapsed: Date.now() - startTime
      });
      
      // If we have any session cookie, propagation is complete
      if (hasDottSession || hasAppSession || hasSessionToken) {
        logger.info('[SessionPropagation] Session cookies detected, propagation complete');
        
        // Clear pending marker
        sessionStorage.removeItem('auth_timestamp');
        
        return true;
      }
      
      // Check if we've exceeded timeout
      if (Date.now() - startTime > this.propagationTimeout) {
        logger.error('[SessionPropagation] Timeout waiting for cookie propagation');
        return false;
      }
      
      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, this.retryDelay));
    }
    
    logger.error('[SessionPropagation] Max retries reached, cookies not propagated');
    return false;
  }

  /**
   * Enhanced fetch with session propagation handling
   */
  async fetchWithPropagation(url, options = {}) {
    const isPending = this.isSessionPending();
    
    // Add pending auth header if needed
    if (isPending) {
      options.headers = {
        ...options.headers,
        'x-pending-auth': 'true',
        'x-retry-count': '0'
      };
    }
    
    // Initial request
    let response = await fetch(url, options);
    
    // If we get 401 and session is pending, wait and retry
    if (response.status === 401 && isPending) {
      logger.info('[SessionPropagation] Got 401 with pending session, waiting for propagation');
      
      const propagated = await this.waitForPropagation();
      if (propagated) {
        // Retry with updated cookies
        options.headers['x-retry-count'] = '1';
        response = await fetch(url, options);
      }
    }
    
    return response;
  }

  /**
   * Mark session as pending after authentication
   */
  markAuthenticationComplete() {
    if (typeof window === 'undefined') return;
    
    sessionStorage.setItem('auth_timestamp', Date.now().toString());
    logger.info('[SessionPropagation] Marked authentication as complete');
  }

  /**
   * Clear propagation markers
   */
  clearMarkers() {
    if (typeof window === 'undefined') return;
    
    sessionStorage.removeItem('auth_timestamp');
    
    // Clear session_pending cookie if it exists
    document.cookie = 'session_pending=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  }
}

// Export singleton instance
export const sessionPropagation = new SessionPropagationHandler();

// Export convenience functions
export const waitForSessionPropagation = () => sessionPropagation.waitForPropagation();
export const fetchWithSessionPropagation = (url, options) => sessionPropagation.fetchWithPropagation(url, options);
export const markAuthComplete = () => sessionPropagation.markAuthenticationComplete();