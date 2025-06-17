/**
 * Centralized Session Manager
 * Handles session synchronization between frontend and backend
 * Uses Django backend as the authoritative source of truth
 * 
 * This approach solves the cookie reading issues after cache clear by:
 * 1. Always verifying sessions with the backend
 * 2. Using backend session tokens stored in PostgreSQL
 * 3. Implementing proper retry logic for session propagation
 * 4. Caching sessions to reduce backend calls
 */

import { logger } from '@/utils/logger';

class SessionManager {
  constructor() {
    this.sessionCache = null;
    this.cacheExpiry = null;
    this.cacheDuration = 5 * 60 * 1000; // 5 minutes
    this.syncInProgress = false;
    this.sessionCheckInterval = null;
    
    // Legacy localStorage keys for migration
    this.LEGACY_SESSION_KEY = 'dott_session';
    this.LEGACY_EXPIRY_KEY = 'dott_session_expiry';
  }

  /**
   * Get current session from backend (authoritative source)
   * This bypasses any cookie reading issues by directly querying the backend
   */
  async fetchSessionFromBackend() {
    try {
      logger.info('[SessionManager] Fetching session from backend');
      
      // Try the session endpoint first (includes backend session token check)
      const sessionResponse = await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        if (sessionData && sessionData.authenticated) {
          logger.info('[SessionManager] Backend session retrieved successfully');
          
          // Store in localStorage as backup (for recovery after cache clear)
          this.storeSessionBackup(sessionData);
          
          return {
            authenticated: true,
            user: sessionData.user,
            accessToken: sessionData.accessToken,
            sessionToken: sessionData.sessionToken,
            csrfToken: sessionData.csrfToken,
            expiresAt: sessionData.expiresAt
          };
        }
      }

      // Fallback to profile endpoint if session endpoint fails
      const profileResponse = await fetch('/api/auth/profile', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        logger.info('[SessionManager] Profile data retrieved as fallback');
        return {
          authenticated: true,
          user: profileData,
          needsOnboarding: profileData.needsOnboarding,
          tenantId: profileData.tenantId || profileData.tenant_id
        };
      }

      logger.warn('[SessionManager] No valid session found in backend');
      return null;
    } catch (error) {
      logger.error('[SessionManager] Error fetching session from backend:', error);
      return null;
    }
  }

  /**
   * Store session backup in localStorage for recovery
   */
  storeSessionBackup(sessionData) {
    if (typeof window === 'undefined') return;
    
    try {
      const backup = {
        user: sessionData.user,
        expiresAt: sessionData.expiresAt,
        timestamp: Date.now()
      };
      localStorage.setItem(this.LEGACY_SESSION_KEY, JSON.stringify(backup));
      localStorage.setItem(this.LEGACY_EXPIRY_KEY, sessionData.expiresAt?.toString() || '');
    } catch (error) {
      // Ignore localStorage errors
    }
  }

  /**
   * Get session with caching to reduce backend calls
   */
  async getSession(forceRefresh = false) {
    // Return cached session if valid and not forcing refresh
    if (!forceRefresh && this.sessionCache && this.cacheExpiry && Date.now() < this.cacheExpiry) {
      logger.debug('[SessionManager] Returning cached session');
      return this.sessionCache;
    }

    // Prevent concurrent sync requests
    if (this.syncInProgress) {
      logger.debug('[SessionManager] Sync already in progress, waiting...');
      await new Promise(resolve => setTimeout(resolve, 500));
      return this.sessionCache;
    }

    this.syncInProgress = true;
    try {
      const session = await this.fetchSessionFromBackend();
      
      if (session) {
        // Cache the session
        this.sessionCache = session;
        this.cacheExpiry = Date.now() + this.cacheDuration;
        logger.info('[SessionManager] Session cached successfully');
      } else {
        // Clear cache if no valid session
        this.clearCache();
      }

      return session;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Wait for session to be available (useful after login)
   */
  async waitForSession(maxAttempts = 10, delayMs = 500) {
    logger.info('[SessionManager] Waiting for session availability');
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const session = await this.getSession(true); // Force refresh
      
      if (session && session.authenticated) {
        logger.info(`[SessionManager] Session available after ${attempt + 1} attempts`);
        return session;
      }

      if (attempt < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    logger.error('[SessionManager] Session not available after maximum attempts');
    return null;
  }

  /**
   * Update session data in backend
   */
  async updateSession(updates) {
    try {
      logger.info('[SessionManager] Updating session with:', updates);
      
      const response = await fetch('/api/auth/sync-session', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        // Clear cache to force refresh on next get
        this.clearCache();
        logger.info('[SessionManager] Session updated successfully');
        return true;
      } else {
        logger.error('[SessionManager] Failed to update session:', response.status);
        return false;
      }
    } catch (error) {
      logger.error('[SessionManager] Error updating session:', error);
      return false;
    }
  }

  /**
   * Force session sync with backend
   */
  async syncSession() {
    logger.info('[SessionManager] Forcing session sync');
    this.clearCache();
    return await this.getSession(true);
  }

  /**
   * Clear session cache
   */
  clearCache() {
    this.sessionCache = null;
    this.cacheExpiry = null;
    logger.debug('[SessionManager] Session cache cleared');
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated() {
    const session = await this.getSession();
    return session && session.authenticated;
  }

  /**
   * Check if user needs onboarding
   */
  async needsOnboarding() {
    const session = await this.getSession();
    return session && session.user && session.user.needsOnboarding;
  }

  /**
   * Get tenant ID
   */
  async getTenantId() {
    const session = await this.getSession();
    return session && session.user && (session.user.tenantId || session.user.tenant_id);
  }

  /**
   * Get access token
   */
  async getAccessToken() {
    const session = await this.getSession();
    return session?.accessToken || null;
  }

  /**
   * Get user
   */
  async getUser() {
    const session = await this.getSession();
    return session?.user || null;
  }

  /**
   * Start periodic session checks (useful for detecting session expiry)
   */
  startSessionMonitoring(intervalMs = 60000) { // Default: check every minute
    if (this.sessionCheckInterval) {
      return; // Already monitoring
    }

    this.sessionCheckInterval = setInterval(async () => {
      const session = await this.getSession(true);
      if (!session || !session.authenticated) {
        logger.warn('[SessionManager] Session expired or invalid');
        this.stopSessionMonitoring();
        // Dispatch custom event for components to handle
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('sessionExpired'));
        }
      }
    }, intervalMs);

    logger.info('[SessionManager] Started session monitoring');
  }

  /**
   * Stop periodic session checks
   */
  stopSessionMonitoring() {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
      logger.info('[SessionManager] Stopped session monitoring');
    }
  }

  /**
   * Handle post-login session establishment
   */
  async establishSession(authData) {
    try {
      logger.info('[SessionManager] Establishing new session');
      
      // Create session on backend
      const response = await fetch('/api/auth/session', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(authData)
      });

      if (response.ok) {
        // Wait for session to be available
        const session = await this.waitForSession();
        if (session) {
          logger.info('[SessionManager] Session established successfully');
          return session;
        }
      }

      logger.error('[SessionManager] Failed to establish session');
      return null;
    } catch (error) {
      logger.error('[SessionManager] Error establishing session:', error);
      return null;
    }
  }

  /**
   * Clear session (logout)
   */
  async clearSession() {
    try {
      logger.info('[SessionManager] Clearing session');
      
      // Clear backend session
      await fetch('/api/auth/session', {
        method: 'DELETE',
        credentials: 'include'
      });

      // Clear cache
      this.clearCache();
      
      // Clear localStorage backup
      if (typeof window !== 'undefined') {
        localStorage.removeItem(this.LEGACY_SESSION_KEY);
        localStorage.removeItem(this.LEGACY_EXPIRY_KEY);
      }
      
      // Stop monitoring
      this.stopSessionMonitoring();

      logger.info('[SessionManager] Session cleared');
      return true;
    } catch (error) {
      logger.error('[SessionManager] Error clearing session:', error);
      return false;
    }
  }

  // Legacy compatibility methods
  saveSession(sessionData, expiresIn = 86400) {
    // Convert to new establishSession call
    logger.warn('[SessionManager] Legacy saveSession called, using establishSession instead');
    return this.establishSession(sessionData);
  }

  hasValidSession() {
    // Synchronous check not supported, return false
    logger.warn('[SessionManager] Legacy hasValidSession called, use isAuthenticated() instead');
    return false;
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();

// Export default for backward compatibility
export default sessionManager;

// Export convenience functions
export const getSession = () => sessionManager.getSession();
export const isAuthenticated = () => sessionManager.isAuthenticated();
export const needsOnboarding = () => sessionManager.needsOnboarding();
export const getTenantId = () => sessionManager.getTenantId();
export const getAccessToken = () => sessionManager.getAccessToken();
export const getUser = () => sessionManager.getUser();
export const waitForSession = (maxAttempts, delayMs) => sessionManager.waitForSession(maxAttempts, delayMs);
export const updateSession = (updates) => sessionManager.updateSession(updates);
export const syncSession = () => sessionManager.syncSession();
export const establishSession = (authData) => sessionManager.establishSession(authData);
export const clearSession = () => sessionManager.clearSession();