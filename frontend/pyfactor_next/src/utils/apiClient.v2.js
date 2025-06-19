/**
 * Enhanced API Client v2
 * 
 * Provides automatic retry, error handling, and session management
 */

import { logger } from '@/utils/logger';
import { errorHandler } from '@/utils/errorHandler.v2';
import { sessionManagerEnhanced as sessionManager } from '@/utils/sessionManager-v2-enhanced';

class ApiClientV2 {
  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || '';
    this.maxRetries = 3;
    this.retryDelay = 1000;
    this.timeout = 30000; // 30 seconds
  }

  /**
   * Make API request with automatic retry and error handling
   */
  async request(url, options = {}) {
    logger.debug('[ApiClient] Request started', {
      url,
      method: options.method || 'GET',
      hasBody: !!options.body
    });
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    
    const requestOptions = {
      ...options,
      credentials: 'include',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    // Add auth headers if available
    // Note: The session endpoint doesn't return accessToken for security
    // We'll check for authenticated status instead
    const session = await sessionManager.getSession();
    logger.debug('[ApiClient] Session check:', {
      hasSession: !!session,
      authenticated: session?.authenticated,
      hasSessionToken: !!session?.sessionToken,
      hasAccessToken: !!session?.accessToken,
      sessionTokenType: session?.sessionToken ? typeof session.sessionToken : 'none',
      sessionTokenPreview: session?.sessionToken ? session.sessionToken.substring(0, 20) + '...' : 'none'
    });
    
    if (session?.authenticated) {
      // For v2 onboarding, we need to pass the session token
      // Django backend now accepts Session tokens via SessionTokenAuthentication
      if (session.sessionToken) {
        requestOptions.headers['Authorization'] = `Session ${session.sessionToken}`;
        logger.debug('[ApiClient] Added session token to Authorization header');
      } else if (session.accessToken) {
        // Fallback to access token if no session token
        requestOptions.headers['Authorization'] = `Bearer ${session.accessToken}`;
        logger.debug('[ApiClient] Added access token to Authorization header (fallback)');
      } else {
        // Fallback: rely on cookies for authentication
        logger.debug('[ApiClient] Session is authenticated, relying on cookies (no session/access token available)');
      }
    }

    // Log final headers being sent
    logger.debug('[ApiClient] Final request headers:', {
      ...requestOptions.headers,
      credentials: requestOptions.credentials
    });

    let lastError;
    let attempt = 0;

    while (attempt < this.maxRetries) {
      try {
        attempt++;
        logger.debug(`[ApiClient] Request attempt ${attempt}`, { url, method: options.method });

        const response = await fetch(url, requestOptions);
        clearTimeout(timeoutId);

        // Handle non-2xx responses
        if (!response.ok) {
          const error = await this.parseErrorResponse(response);
          
          // Don't retry client errors (4xx)
          if (response.status >= 400 && response.status < 500) {
            throw error;
          }
          
          // Retry server errors (5xx)
          lastError = error;
          if (attempt < this.maxRetries) {
            const delay = errorHandler.getRetryDelay(error, attempt);
            logger.warn(`[ApiClient] Retrying after ${delay}ms due to:`, error.message);
            await this.delay(delay);
            continue;
          }
        }

        // Success
        return await this.parseResponse(response);

      } catch (error) {
        clearTimeout(timeoutId);
        
        // Handle abort
        if (error.name === 'AbortError') {
          lastError = new Error('Request timeout');
          lastError.code = 'timeout';
        } else {
          lastError = error;
        }

        // Check if retryable
        if (attempt < this.maxRetries && errorHandler.isRetryable(lastError)) {
          const delay = errorHandler.getRetryDelay(lastError, attempt);
          logger.warn(`[ApiClient] Retrying after ${delay}ms due to:`, lastError.message);
          await this.delay(delay);
          continue;
        }

        break;
      }
    }

    // All retries failed
    throw lastError;
  }

  /**
   * Parse error response
   */
  async parseErrorResponse(response) {
    let errorData;
    
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
    }

    const error = new Error(errorData.message || errorData.error || 'Request failed');
    error.status = response.status;
    error.code = errorData.code || this.getErrorCode(response.status);
    error.details = errorData;

    return error;
  }

  /**
   * Parse successful response
   */
  async parseResponse(response) {
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      return await response.json();
    }
    
    return await response.text();
  }

  /**
   * Get error code from status
   */
  getErrorCode(status) {
    switch (status) {
      case 401: return 'unauthorized';
      case 403: return 'forbidden';
      case 404: return 'not_found';
      case 429: return 'rate_limit';
      case 500: return 'server_error';
      case 503: return 'maintenance';
      default: return 'unknown_error';
    }
  }

  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Convenience methods
   */
  async get(url, options = {}) {
    return this.request(url, { ...options, method: 'GET' });
  }

  async post(url, data, options = {}) {
    return this.request(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async put(url, data, options = {}) {
    return this.request(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async delete(url, options = {}) {
    return this.request(url, { ...options, method: 'DELETE' });
  }

  /**
   * Special methods for common operations
   */
  async updateSession(updates) {
    return this.post('/api/auth/update-session', updates);
  }

  async completeOnboarding(data) {
    return this.post('/api/onboarding/complete-all', data);
  }

  async createPaymentSession(plan, billingCycle) {
    return this.post('/api/payments/create-session', { plan, billingCycle });
  }

  async verifyPayment(sessionId) {
    return this.post('/api/payments/verify', { sessionId });
  }
}

// Export singleton instance
export const apiClient = new ApiClientV2();

// Also export class for testing
export default ApiClientV2;