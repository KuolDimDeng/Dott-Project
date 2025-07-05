/**
 * Secure storage utility for admin portal
 * Uses httpOnly cookies for sensitive data
 */

class AdminSecureStorage {
  /**
   * Store tokens in httpOnly cookies via API
   */
  static async storeTokens(accessToken, refreshToken, csrfToken) {
    try {
      const response = await fetch('/api/admin/auth/store-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessToken,
          refreshToken,
          csrfToken,
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to store tokens');
      }

      return true;
    } catch (error) {
      console.error('Failed to store tokens:', error);
      return false;
    }
  }

  /**
   * Clear all auth tokens
   */
  static async clearTokens() {
    try {
      await fetch('/api/admin/auth/clear-tokens', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Failed to clear tokens:', error);
    }
  }

  /**
   * Get CSRF token from cookie
   */
  static getCSRFToken() {
    // This will be available as a non-httpOnly cookie
    const match = document.cookie.match(/admin_csrf_token=([^;]+)/);
    return match ? match[1] : null;
  }

  /**
   * Store non-sensitive admin data in sessionStorage
   */
  static setAdminData(data) {
    try {
      sessionStorage.setItem('admin_user', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to store admin data:', error);
    }
  }

  /**
   * Get non-sensitive admin data
   */
  static getAdminData() {
    try {
      const data = sessionStorage.getItem('admin_user');
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to get admin data:', error);
      return null;
    }
  }

  /**
   * Clear all admin data
   */
  static clearAll() {
    this.clearTokens();
    sessionStorage.removeItem('admin_user');
  }

  /**
   * Check if admin is authenticated
   */
  static isAuthenticated() {
    // Check for admin data and CSRF token
    return !!(this.getAdminData() && this.getCSRFToken());
  }

  /**
   * Get session timeout warning time
   */
  static getSessionWarningTime() {
    const data = this.getAdminData();
    if (data && data.sessionExpiry) {
      const expiryTime = new Date(data.sessionExpiry).getTime();
      const warningTime = expiryTime - (5 * 60 * 1000); // 5 minutes before expiry
      return warningTime;
    }
    return null;
  }
}

export default AdminSecureStorage;