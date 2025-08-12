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
  
  // Determine which domain to use
  let url;
  
  // These are Next.js API routes that should stay on the frontend domain
  const frontendRoutes = [
    '/api/auth/consolidated-login',
    '/api/auth/authenticate',
    '/api/auth/bridge-session',
    '/api/auth/establish-session',
    '/api/auth/forgot-password',
    '/api/auth/resend-verification',
    '/api/auth/signup',
    '/api/pricing',
    '/api/settings'
  ];
  
  // Check if this is a frontend route
  const isFrontendRoute = frontendRoutes.some(route => endpoint.startsWith(route));
  
  if (isFrontendRoute) {
    // Frontend routes stay on current domain
    url = endpoint;
  } else if (endpoint.startsWith('/api/')) {
    // All other API endpoints go to the backend API domain
    url = `${API_CONFIG.BASE_URL}${endpoint}`;
  } else {
    // Non-API endpoints stay on current domain
    url = endpoint;
  }
  
  // Log the request
  logger.info('[apiFetch] Request:', {
    url,
    method: options.method || 'GET',
    hasBody: !!options.body,
    endpoint
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
    
    // If body is already stringified, use it as is
    if (options.body && typeof options.body === 'string') {
      fetchOptions.body = options.body;
    } else if (options.body) {
      fetchOptions.body = JSON.stringify(options.body);
    }
    
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
  post: (endpoint, body, options = {}) => {
    const opts = { ...options, method: 'POST' };
    if (body) opts.body = body;
    return apiFetch(endpoint, opts);
  },
  put: (endpoint, body, options = {}) => {
    const opts = { ...options, method: 'PUT' };
    if (body) opts.body = body;
    return apiFetch(endpoint, opts);
  },
  patch: (endpoint, body, options = {}) => {
    const opts = { ...options, method: 'PATCH' };
    if (body) opts.body = body;
    return apiFetch(endpoint, opts);
  },
  delete: (endpoint, options = {}) => apiFetch(endpoint, { ...options, method: 'DELETE' })
};

export default api;
