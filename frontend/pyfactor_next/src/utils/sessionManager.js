/**
 * Session Manager - Handles session storage with fallback mechanisms
 * This provides a more reliable way to persist sessions in production
 */

const SESSION_KEY = 'dott_session';
const SESSION_EXPIRY_KEY = 'dott_session_expiry';

export const sessionManager = {
  /**
   * Save session data
   * @param {Object} sessionData - The session data to save
   * @param {number} expiresIn - Expiration time in seconds (default 24 hours)
   */
  saveSession: (sessionData, expiresIn = 86400) => {
    if (typeof window === 'undefined') return;
    
    try {
      const expiryTime = Date.now() + (expiresIn * 1000);
      
      // Store in localStorage as backup
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
      localStorage.setItem(SESSION_EXPIRY_KEY, expiryTime.toString());
      
      // Also try sessionStorage for current session
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
      
      console.log('[SessionManager] Session saved successfully');
    } catch (error) {
      console.error('[SessionManager] Error saving session:', error);
    }
  },

  /**
   * Get session data
   * @returns {Object|null} The session data or null if not found/expired
   */
  getSession: () => {
    if (typeof window === 'undefined') return null;
    
    try {
      // Try sessionStorage first (current session)
      let sessionData = sessionStorage.getItem(SESSION_KEY);
      
      // Fallback to localStorage
      if (!sessionData) {
        sessionData = localStorage.getItem(SESSION_KEY);
      }
      
      if (!sessionData) return null;
      
      // Check expiry
      const expiryTime = localStorage.getItem(SESSION_EXPIRY_KEY);
      if (expiryTime && Date.now() > parseInt(expiryTime)) {
        console.log('[SessionManager] Session expired');
        sessionManager.clearSession();
        return null;
      }
      
      return JSON.parse(sessionData);
    } catch (error) {
      console.error('[SessionManager] Error getting session:', error);
      return null;
    }
  },

  /**
   * Clear session data
   */
  clearSession: () => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(SESSION_EXPIRY_KEY);
      sessionStorage.removeItem(SESSION_KEY);
      console.log('[SessionManager] Session cleared');
    } catch (error) {
      console.error('[SessionManager] Error clearing session:', error);
    }
  },

  /**
   * Check if session exists and is valid
   * @returns {boolean}
   */
  hasValidSession: () => {
    const session = sessionManager.getSession();
    return session !== null && session.accessToken && session.user;
  },

  /**
   * Get access token from session
   * @returns {string|null}
   */
  getAccessToken: () => {
    const session = sessionManager.getSession();
    return session?.accessToken || session?.access_token || null;
  },

  /**
   * Get user from session
   * @returns {Object|null}
   */
  getUser: () => {
    const session = sessionManager.getSession();
    return session?.user || null;
  }
};

export default sessionManager;