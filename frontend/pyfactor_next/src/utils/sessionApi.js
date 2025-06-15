/**
 * Session-based API utility
 * Handles API calls with backend session token authentication
 */

import { logger } from '@/utils/logger';

/**
 * Get current session token
 * @returns {Promise<string|null>} Session token or null
 */
async function getSessionToken() {
  try {
    const response = await fetch('/api/auth/session', {
      credentials: 'include',
      cache: 'no-store'
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.sessionToken || null;
    }
  } catch (error) {
    logger.error('Failed to get session token:', error);
  }
  
  return null;
}

/**
 * Make authenticated API request with session token
 * @param {string} url - API endpoint URL
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>} Fetch response
 */
export async function sessionFetch(url, options = {}) {
  try {
    // Get current session token
    const sessionToken = await getSessionToken();
    
    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    // Add session token if available
    if (sessionToken) {
      headers['Authorization'] = `Session ${sessionToken}`;
    } else {
      // Fallback to cookie-based auth
      logger.warn('No session token available, using cookie-based auth');
    }
    
    // Make the request
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include' // Always include cookies for backward compatibility
    });
    
    // Handle 401 Unauthorized
    if (response.status === 401) {
      logger.warn('Session expired or invalid, redirecting to login');
      // Clear session and redirect to login
      await fetch('/api/auth/session', {
        method: 'DELETE',
        credentials: 'include'
      });
      window.location.href = '/auth/email-signin';
      return response;
    }
    
    return response;
  } catch (error) {
    logger.error('Session API request failed:', error);
    throw error;
  }
}

/**
 * Session API helper methods
 */
export const sessionApi = {
  /**
   * GET request with session authentication
   */
  async get(url) {
    return sessionFetch(url, {
      method: 'GET'
    });
  },
  
  /**
   * POST request with session authentication
   */
  async post(url, data) {
    return sessionFetch(url, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  
  /**
   * PATCH request with session authentication
   */
  async patch(url, data) {
    return sessionFetch(url, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },
  
  /**
   * PUT request with session authentication
   */
  async put(url, data) {
    return sessionFetch(url, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  
  /**
   * DELETE request with session authentication
   */
  async delete(url) {
    return sessionFetch(url, {
      method: 'DELETE'
    });
  }
};

/**
 * Check if user has an active session
 * @returns {Promise<boolean>} True if authenticated
 */
export async function isAuthenticated() {
  const token = await getSessionToken();
  return !!token;
}

/**
 * Get current session details
 * @returns {Promise<Object|null>} Session data or null
 */
export async function getCurrentSession() {
  try {
    const response = await fetch('/api/auth/session', {
      credentials: 'include',
      cache: 'no-store'
    });
    
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    logger.error('Failed to get current session:', error);
  }
  
  return null;
}

/**
 * Update current session data
 * @param {Object} updates - Session updates
 * @returns {Promise<boolean>} Success status
 */
export async function updateSession(updates) {
  try {
    const sessionToken = await getSessionToken();
    
    if (!sessionToken) {
      logger.error('No session token available for update');
      return false;
    }
    
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    const response = await fetch(`${apiUrl}/api/sessions/current/`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Session ${sessionToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });
    
    return response.ok;
  } catch (error) {
    logger.error('Failed to update session:', error);
    return false;
  }
}

/**
 * Invalidate current session (logout)
 * @returns {Promise<void>}
 */
export async function invalidateSession() {
  try {
    // Delete session via API
    await fetch('/api/auth/session', {
      method: 'DELETE',
      credentials: 'include'
    });
    
    // Also call backend to invalidate
    const sessionToken = await getSessionToken();
    if (sessionToken) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
      await fetch(`${apiUrl}/api/sessions/current/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Session ${sessionToken}`
        }
      });
    }
  } catch (error) {
    logger.error('Failed to invalidate session:', error);
  }
}