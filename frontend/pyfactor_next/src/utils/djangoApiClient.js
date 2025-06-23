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
    const sessionToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('sid=') || row.startsWith('session_token='))
      ?.split('=')[1];
    
    if (!sessionToken) {
      // Try alternate cookie names
      const altToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('session_token=') || row.startsWith('dott_session='))
        ?.split('=')[1];
      
      if (!altToken) {
        throw new Error('No session found. Please log in again.');
      }
      return altToken;
    }
    
    return sessionToken;
  }

  /**
   * Build headers for API requests
   */
  buildHeaders(sessionToken) {
    return {
      'Content-Type': 'application/json',
      'Authorization': `SessionID ${sessionToken}`,
      'Cookie': `session_token=${sessionToken}`,
      'X-Requested-With': 'XMLHttpRequest' // CSRF protection
    };
  }

  /**
   * Generic request method
   */
  async request(method, endpoint, data = null, params = {}) {
    try {
      const sessionToken = this.getSessionToken();
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