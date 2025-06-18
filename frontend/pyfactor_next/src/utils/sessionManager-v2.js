/**
 * Session Manager V2 - Server-side session management
 * Following Wave/Stripe pattern: Only session ID in cookies
 * This replaces the old client-side session management
 */

class SessionManagerV2 {
  constructor() {
    this.cache = null;
    this.cacheExpiry = 0;
  }
  
  /**
   * Get current session from backend
   * Includes 5-second cache to reduce API calls
   */
  async getSession() {
    // Check cache first
    if (this.cache && Date.now() < this.cacheExpiry) {
      return this.cache;
    }
    
    try {
      const response = await fetch('/api/auth/session-v2', {
        credentials: 'include',
        cache: 'no-store'
      });
      
      if (!response.ok) {
        this.cache = null;
        return null;
      }
      
      const session = await response.json();
      
      // Cache for 5 seconds to reduce backend calls
      this.cache = session;
      this.cacheExpiry = Date.now() + 5000;
      
      return session;
    } catch (error) {
      console.error('[SessionManager-V2] Error:', error);
      return null;
    }
  }
  
  /**
   * Create new session (login)
   */
  async createSession(email, password, accessToken = null) {
    try {
      const response = await fetch('/api/auth/session-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, accessToken }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Authentication failed');
      }
      
      // Clear cache to force refresh
      this.clearCache();
      
      return await response.json();
    } catch (error) {
      console.error('[SessionManager-V2] Create session error:', error);
      throw error;
    }
  }
  
  /**
   * Logout and revoke session
   */
  async logout() {
    try {
      await fetch('/api/auth/session-v2', {
        method: 'DELETE',
        credentials: 'include'
      });
      
      this.cache = null;
      
      // Redirect to home page
      window.location.href = '/';
    } catch (error) {
      console.error('[SessionManager-V2] Logout error:', error);
      // Still redirect even if backend call fails
      window.location.href = '/';
    }
  }
  
  /**
   * Clear the session cache (force refresh on next getSession)
   */
  clearCache() {
    this.cache = null;
    this.cacheExpiry = 0;
  }
  
  /**
   * Check if user is authenticated
   */
  async isAuthenticated() {
    const session = await this.getSession();
    return session?.authenticated === true;
  }
  
  /**
   * Get current user
   */
  async getCurrentUser() {
    const session = await this.getSession();
    return session?.user || null;
  }
  
  /**
   * Check if user needs onboarding
   */
  async needsOnboarding() {
    const session = await this.getSession();
    return session?.user?.needsOnboarding === true;
  }
  
  /**
   * Get tenant ID
   */
  async getTenantId() {
    const session = await this.getSession();
    return session?.user?.tenantId || null;
  }
}

// Export singleton instance
export default new SessionManagerV2();