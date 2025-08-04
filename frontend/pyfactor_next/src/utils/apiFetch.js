import API_CONFIG from '@/config/api';
import { logger } from '@/utils/logger';

/**
 * Wrapper around fetch to ensure all API calls use the correct URL
 * and handle common concerns like authentication and error handling
 */
export async function apiFetch(endpoint, options = {}) {
  // Ensure endpoint starts with /
  if (!endpoint.startsWith('/')) {
    endpoint = '/' + endpoint;
  }
  
  // Build the full URL
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;
  
  // Log the request
  logger.info('[apiFetch] Request:', {
    url,
    method: options.method || 'GET',
    hasBody: !!options.body
  });
  
  try {
    // Default options
    const fetchOptions = {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };
    
    const response = await fetch(url, fetchOptions);
    
    // Log the response
    logger.info('[apiFetch] Response:', {
      url,
      status: response.status,
      ok: response.ok
    });
    
    return response;
  } catch (error) {
    logger.error('[apiFetch] Error:', {
      url,
      error: error.message
    });
    throw error;
  }
}

// Export a convenience object with methods for common HTTP verbs
export const api = {
  get: (endpoint, options = {}) => apiFetch(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options = {}) => apiFetch(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body, options = {}) => apiFetch(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  patch: (endpoint, body, options = {}) => apiFetch(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
  delete: (endpoint, options = {}) => apiFetch(endpoint, { ...options, method: 'DELETE' })
};

export default api;
