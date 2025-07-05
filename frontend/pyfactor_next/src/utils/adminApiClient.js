/**
 * Admin API client with automatic token management
 */
import AdminSecureStorage from './adminSecureStorage';

class AdminApiClient {
  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.dottapps.com';
    this.refreshPromise = null;
  }

  /**
   * Make an authenticated request to the admin API
   */
  async request(path, options = {}) {
    // Get CSRF token
    const csrfToken = AdminSecureStorage.getCSRFToken();
    
    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add CSRF token if available
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }

    // Make the request through our Next.js API proxy
    const response = await fetch(`/api/admin/proxy${path}`, {
      ...options,
      headers,
      credentials: 'include', // Include cookies
    });

    // Handle token refresh
    if (response.status === 401) {
      // Avoid multiple simultaneous refresh attempts
      if (!this.refreshPromise) {
        this.refreshPromise = this.refreshToken();
      }

      const refreshSuccess = await this.refreshPromise;
      this.refreshPromise = null;

      if (refreshSuccess) {
        // Retry the original request
        return fetch(`/api/admin/proxy${path}`, {
          ...options,
          headers,
          credentials: 'include',
        });
      }
    }

    return response;
  }

  /**
   * Refresh the access token
   */
  async refreshToken() {
    try {
      const response = await fetch('/api/admin/refresh', {
        method: 'POST',
        credentials: 'include',
      });

      return response.ok;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  /**
   * GET request
   */
  async get(path) {
    const response = await this.request(path, {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  /**
   * POST request
   */
  async post(path, data) {
    const response = await this.request(path, {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  /**
   * PATCH request
   */
  async patch(path, data) {
    const response = await this.request(path, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  /**
   * DELETE request
   */
  async delete(path) {
    const response = await this.request(path, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }
}

// Export singleton instance
export default new AdminApiClient();