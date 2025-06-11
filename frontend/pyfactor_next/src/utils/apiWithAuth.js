/**
 * Secure API utility with authentication
 * Uses cookies for authentication instead of localStorage
 */

import { getSecureSession } from './secureAuth';

/**
 * Make an authenticated API request using secure cookies
 * @param {string} url - The API endpoint URL
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>} The fetch response
 */
export async function apiWithAuth(url, options = {}) {
  // Default options for secure requests
  const defaultOptions = {
    credentials: 'include', // Always include cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  };

  // For backward compatibility, check if we need to add auth header
  // This should be removed once all backend endpoints support cookie auth
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    const session = await getSecureSession();
    if (session && session.accessToken && !options.headers?.Authorization) {
      console.warn('[apiWithAuth] Using Authorization header for backward compatibility');
      defaultOptions.headers.Authorization = `Bearer ${session.accessToken}`;
    }
  }

  try {
    const response = await fetch(url, {
      ...options,
      ...defaultOptions,
      headers: {
        ...defaultOptions.headers,
        ...options.headers
      }
    });

    // Handle unauthorized responses
    if (response.status === 401) {
      console.error('[apiWithAuth] Unauthorized - redirecting to login');
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/signin';
      }
    }

    return response;
  } catch (error) {
    console.error('[apiWithAuth] Request error:', error);
    throw error;
  }
}

/**
 * Convenience methods for common HTTP verbs
 */
export const api = {
  get: (url, options = {}) => 
    apiWithAuth(url, { ...options, method: 'GET' }),
  
  post: (url, data, options = {}) => 
    apiWithAuth(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    }),
  
  put: (url, data, options = {}) => 
    apiWithAuth(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  
  patch: (url, data, options = {}) => 
    apiWithAuth(url, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data)
    }),
  
  delete: (url, options = {}) => 
    apiWithAuth(url, { ...options, method: 'DELETE' })
};

export default apiWithAuth;