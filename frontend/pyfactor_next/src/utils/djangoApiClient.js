/**
 * Django API Client Helper
 * 
 * Industry standard approach for frontend-backend communication
 * This provides a consistent way to call Django REST API endpoints
 */

import { logger } from './logger';

class DjangoApiClient {
  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
  }

  /**
   * Get session token from cookies
   */
  getSessionToken() {
    // Check if we're in the browser
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      // Server-side rendering - try to get from Next.js cookies
      if (typeof window !== 'undefined' && window.__NEXT_DATA__?.props?.pageProps?.sessionToken) {
        return window.__NEXT_DATA__.props.pageProps.sessionToken;
      }
      return null;
    }
    
    // Browser environment - read from cookies
    // First check for the dott_auth_session cookie (encrypted session data)
    const dottAuthSession = document.cookie
      .split('; ')
      .find(row => row.startsWith('dott_auth_session='))
      ?.split('=')[1];
    
    if (dottAuthSession) {
      // The dott_auth_session contains encrypted session data
      // We need to extract the session ID from it or use a different approach
      // For now, let's check for the session ID cookie
    }
    
    // Check for various session token cookie names
    const sessionToken = document.cookie
      .split('; ')
      .find(row => 
        row.startsWith('sid=') || 
        row.startsWith('session_token=') ||
        row.startsWith('dott_session_id=') ||
        row.startsWith('sessionid=')
      )
      ?.split('=')[1];
    
    if (!sessionToken) {
      // Log available cookies for debugging (without values for security)
      const availableCookies = document.cookie
        .split('; ')
        .map(cookie => cookie.split('=')[0]);
      console.warn('[DjangoApiClient] Available cookies:', availableCookies);
      console.warn('[DjangoApiClient] No session token found in cookies');
      throw new Error('No session found. Please log in again.');
    }
    
    return sessionToken;
  }

  /**
   * Build headers for API requests
   */
  buildHeaders(sessionToken) {
    const headers = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest' // CSRF protection
    };
    
    if (sessionToken) {
      headers['Authorization'] = `Session ${sessionToken}`;
      headers['Cookie'] = `sid=${sessionToken}`;
    }
    
    return headers;
  }

  /**
   * Generic request method
   */
  async request(method, endpoint, data = null, params = {}) {
    try {
      let sessionToken = null;
      try {
        sessionToken = this.getSessionToken();
      } catch (error) {
        // If we can't get session token, log it but continue
        // The request might still work with credentials: 'include'
        logger.warn('[DjangoApiClient] Could not get session token:', error.message);
      }
      
      const url = new URL(`${this.baseURL}${endpoint}`);
      
      // Add query parameters
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          url.searchParams.append(key, params[key]);
        }
      });

      const options = {
        method,
        headers: this.buildHeaders(sessionToken),
        credentials: 'include'
      };

      if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
        options.body = JSON.stringify(data);
      }

      logger.debug(`[DjangoApiClient] ${method} ${url.toString()}`);
      
      const response = await fetch(url.toString(), options);
      
      // Handle different response statuses
      if (response.status === 204) {
        return { success: true }; // No content
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage;
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.detail || errorData.error || errorData.message || `HTTP ${response.status}`;
        } catch {
          errorMessage = errorText || `HTTP ${response.status}`;
        }
        
        throw new Error(errorMessage);
      }
      
      return await response.json();
    } catch (error) {
      logger.error(`[DjangoApiClient] ${method} ${endpoint} failed:`, error);
      throw error;
    }
  }

  // Convenience methods
  get(endpoint, params) {
    return this.request('GET', endpoint, null, params);
  }

  post(endpoint, data, params) {
    return this.request('POST', endpoint, data, params);
  }

  put(endpoint, data, params) {
    return this.request('PUT', endpoint, data, params);
  }

  patch(endpoint, data, params) {
    return this.request('PATCH', endpoint, data, params);
  }

  delete(endpoint, params) {
    return this.request('DELETE', endpoint, null, params);
  }
}

// Export singleton instance
export const djangoApi = new DjangoApiClient();

// Export class for testing or custom instances
export default DjangoApiClient;