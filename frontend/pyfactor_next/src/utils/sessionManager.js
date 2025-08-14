'use client';

/**
 * Session Manager - Industry-standard session management with auto-recovery
 * Handles session validation, refresh, and recovery for all API calls
 */
class SessionManager {
  constructor() {
    this.refreshing = false;
    this.refreshPromise = null;
    this.sessionCheckInterval = null;
  }

  /**
   * Initialize session monitoring
   */
  init() {
    // Check session every 5 minutes
    this.sessionCheckInterval = setInterval(() => {
      this.checkSessionStatus();
    }, 5 * 60 * 1000);

    // Check on page visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.checkSessionStatus();
      }
    });
  }

  /**
   * Clean up intervals
   */
  destroy() {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
    }
  }

  /**
   * Check if session exists and is valid
   */
  async ensureValidSession() {
    const sid = this.getSessionCookie();
    
    if (!sid) {
      console.warn('[SessionManager] No session cookie found');
      return this.handleNoSession();
    }

    // Quick check - if we checked recently, skip
    const lastCheck = sessionStorage.getItem('last_session_check');
    if (lastCheck) {
      const timeSinceCheck = Date.now() - parseInt(lastCheck);
      if (timeSinceCheck < 60000) { // Less than 1 minute
        return true;
      }
    }

    try {
      const response = await fetch('/api/auth/session-verify', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        sessionStorage.setItem('last_session_check', Date.now().toString());
        return true;
      }

      // Session invalid, try to refresh
      console.warn('[SessionManager] Session validation failed, attempting refresh');
      return await this.refreshSession();
      
    } catch (error) {
      console.error('[SessionManager] Session verification error:', error);
      // Network error, assume session is ok for now
      return true;
    }
  }

  /**
   * Refresh the current session
   */
  async refreshSession() {
    // Prevent multiple simultaneous refreshes
    if (this.refreshing) {
      return this.refreshPromise;
    }

    this.refreshing = true;
    this.refreshPromise = this._doRefresh();

    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.refreshing = false;
      this.refreshPromise = null;
    }
  }

  /**
   * Internal refresh implementation
   */
  async _doRefresh() {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[SessionManager] Session refreshed successfully');
        
        // Update last check time
        sessionStorage.setItem('last_session_check', Date.now().toString());
        
        // If new session ID provided, update cookie
        if (data.session_id) {
          this.setSessionCookie(data.session_id);
        }
        
        return true;
      }

      console.error('[SessionManager] Session refresh failed');
      return this.handleNoSession();
      
    } catch (error) {
      console.error('[SessionManager] Session refresh error:', error);
      return this.handleNoSession();
    }
  }

  /**
   * Check session status proactively
   */
  async checkSessionStatus() {
    const sid = this.getSessionCookie();
    if (!sid) {
      return;
    }

    try {
      const response = await fetch('/api/auth/session-status', {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        
        // If session expires in less than 1 hour, refresh it
        if (data.expires_in_seconds && data.expires_in_seconds < 3600) {
          console.log('[SessionManager] Session expiring soon, refreshing...');
          await this.refreshSession();
        }
      }
    } catch (error) {
      // Silent fail for background checks
    }
  }

  /**
   * Handle missing or expired session
   */
  handleNoSession() {
    // Check if we're already on the signin page
    if (window.location.pathname === '/signin') {
      return false;
    }

    // Store current URL for redirect after login
    sessionStorage.setItem('redirect_after_login', window.location.href);
    
    // Show user-friendly message
    const message = 'Your session has expired. Please log in again.';
    
    // Use toast if available, otherwise alert
    if (window.showToast) {
      window.showToast(message, 'warning');
    } else {
      alert(message);
    }

    // Redirect to signin
    setTimeout(() => {
      window.location.href = '/signin';
    }, 1000);

    return false;
  }

  /**
   * Get session cookie value
   */
  getSessionCookie() {
    const cookies = document.cookie.split('; ');
    const sidCookie = cookies.find(row => row.startsWith('sid='));
    return sidCookie ? sidCookie.split('=')[1] : null;
  }

  /**
   * Set session cookie
   */
  setSessionCookie(sessionId) {
    const domain = window.location.hostname.includes('dottapps.com') 
      ? '.dottapps.com' 
      : window.location.hostname;
    
    // Set cookie with appropriate settings
    const cookieString = `sid=${sessionId}; path=/; domain=${domain}; secure; samesite=lax; max-age=86400`;
    document.cookie = cookieString;
  }

  /**
   * Clear session
   */
  clearSession() {
    // Clear cookie
    document.cookie = 'sid=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.dottapps.com';
    document.cookie = 'sid=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
    
    // Clear session storage
    sessionStorage.removeItem('last_session_check');
    sessionStorage.removeItem('redirect_after_login');
  }

  /**
   * Wrap API call with session management
   */
  async withSession(apiCall) {
    // Ensure valid session first
    const isValid = await this.ensureValidSession();
    if (!isValid) {
      throw new Error('No valid session');
    }

    try {
      // Make the API call
      const result = await apiCall();
      return result;
    } catch (error) {
      // If 401, try to refresh and retry once
      if (error.message && error.message.includes('401')) {
        console.log('[SessionManager] Got 401, attempting refresh and retry');
        
        const refreshed = await this.refreshSession();
        if (refreshed) {
          // Retry the call once
          return await apiCall();
        }
      }
      
      throw error;
    }
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();

// Initialize on load
if (typeof window !== 'undefined') {
  sessionManager.init();
}