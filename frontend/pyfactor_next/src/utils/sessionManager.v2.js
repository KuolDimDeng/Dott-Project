/**
 * Centralized Session Manager v2
 * 
 * Single source of truth for session management
 * Backend is the authoritative source, cookies are just transport
 */

import { logger } from '@/utils/logger';

class SessionManagerV2 {
  constructor() {
    this.sessionCache = null;
    this.cacheExpiry = null;
    this.syncInProgress = false;
    this.retryAttempts = 0;
    this.maxRetries = 3;
    this.retryDelay = 1000; // Start with 1 second
  }

  /**
   * Get current session with automatic sync
   */
  async getSession(forceRefresh = false) {
    logger.debug('[SessionManager] getSession called', {
      forceRefresh,
      hasCachedSession: !!this.sessionCache,
      cacheExpiry: this.cacheExpiry,
      currentTime: Date.now(),
      cacheValid: this.sessionCache && this.cacheExpiry > Date.now()
    });
    
    // Return cached session if valid and not forcing refresh
    if (!forceRefresh && this.sessionCache && this.cacheExpiry > Date.now()) {
      logger.debug('[SessionManager] Returning cached session', {
        user: this.sessionCache?.user?.email,
        authenticated: this.sessionCache?.authenticated,
        hasAccessToken: !!this.sessionCache?.accessToken,
        hasSessionToken: !!this.sessionCache?.sessionToken
      });
      return this.sessionCache;
    }

    // Sync with backend
    logger.debug('[SessionManager] Cache miss or expired, syncing with backend');
    return await this.syncWithBackend();
  }

  /**
   * Sync session with backend (single source of truth)
   */
  async syncWithBackend() {
    if (this.syncInProgress) {
      logger.debug('[SessionManager] Sync already in progress, waiting...');
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!this.syncInProgress) {
            clearInterval(checkInterval);
            resolve(this.sessionCache);
          }
        }, 100);
      });
    }

    this.syncInProgress = true;

    try {
      const response = await this.fetchWithRetry('/api/auth/session', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        logger.error('[SessionManager] Session sync failed', {
          status: response.status,
          statusText: response.statusText
        });
        throw new Error(`Session sync failed: ${response.status}`);
      }

      const sessionData = await response.json();
      
      logger.debug('[SessionManager] Raw session data received', {
        hasUser: !!sessionData?.user,
        hasAccessToken: !!sessionData?.accessToken,
        hasSessionToken: !!sessionData?.sessionToken,
        authenticated: sessionData?.authenticated,
        userEmail: sessionData?.user?.email,
        needsOnboarding: sessionData?.user?.needsOnboarding,
        tenantId: sessionData?.user?.tenantId || sessionData?.tenantId
      });
      
      // Cache the session for 5 minutes
      this.sessionCache = sessionData;
      this.cacheExpiry = Date.now() + (5 * 60 * 1000);
      
      logger.info('[SessionManager] Session synced with backend', {
        hasUser: !!sessionData?.user,
        needsOnboarding: sessionData?.user?.needsOnboarding || sessionData?.needsOnboarding,
        tenantId: sessionData?.user?.tenantId || sessionData?.tenantId,
        authenticated: sessionData?.authenticated
      });

      return sessionData;

    } catch (error) {
      logger.error('[SessionManager] Failed to sync with backend', error);
      
      // Return cached session if available
      if (this.sessionCache) {
        logger.warn('[SessionManager] Using stale cached session');
        return this.sessionCache;
      }
      
      // Return empty session
      return {
        authenticated: false,
        user: null,
        needsOnboarding: true,
        error: error.message
      };

    } finally {
      this.syncInProgress = false;
      this.retryAttempts = 0;
    }
  }

  /**
   * Update session with optimistic updates and backend sync
   */
  async updateSession(updates) {
    logger.info('[SessionManager] Updating session', updates);

    // Optimistic update
    if (this.sessionCache) {
      this.sessionCache = {
        ...this.sessionCache,
        ...updates,
        lastUpdated: new Date().toISOString()
      };
    }

    try {
      const response = await this.fetchWithRetry('/api/auth/update-session', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error(`Session update failed: ${response.status}`);
      }

      // Sync to get latest state
      return await this.syncWithBackend();

    } catch (error) {
      logger.error('[SessionManager] Failed to update session', error);
      
      // Revert optimistic update
      this.sessionCache = null;
      this.cacheExpiry = null;
      
      throw error;
    }
  }

  /**
   * Clear session (logout)
   */
  async clearSession() {
    logger.info('[SessionManager] Clearing session');
    
    this.sessionCache = null;
    this.cacheExpiry = null;

    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      logger.error('[SessionManager] Error during logout', error);
    }
  }

  /**
   * Fetch with retry logic
   */
  async fetchWithRetry(url, options) {
    const attempt = async () => {
      try {
        const response = await fetch(url, options);
        
        // Reset retry count on success
        if (response.ok) {
          this.retryAttempts = 0;
        }
        
        return response;
      } catch (error) {
        this.retryAttempts++;
        
        if (this.retryAttempts < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, this.retryAttempts - 1);
          logger.warn(`[SessionManager] Retry attempt ${this.retryAttempts} after ${delay}ms`);
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return attempt();
        }
        
        throw error;
      }
    };

    return attempt();
  }

  /**
   * Get specific session properties with defaults
   */
  async getUserEmail() {
    const session = await this.getSession();
    return session?.user?.email || null;
  }

  async getTenantId() {
    const session = await this.getSession();
    return session?.tenantId || session?.tenant_id || null;
  }

  async needsOnboarding() {
    const session = await this.getSession();
    return session?.needsOnboarding !== false;
  }

  async isAuthenticated() {
    const session = await this.getSession();
    return session?.authenticated === true || !!session?.user;
  }

  /**
   * Get onboarding progress
   */
  async getOnboardingProgress() {
    const session = await this.getSession();
    return {
      currentStep: session?.currentStep || 'business_info',
      completedSteps: session?.completedSteps || [],
      paymentPending: session?.paymentPending || false,
      businessName: session?.businessName,
      selectedPlan: session?.selectedPlan
    };
  }
}

// Export singleton instance
export const sessionManager = new SessionManagerV2();

// Also export class for testing
export default SessionManagerV2;