import { logger } from '@/utils/logger';
import { getCacheValue, setCacheValue } from '@/utils/appCache';
import { sessionManagerEnhanced } from '@/utils/sessionManager-v2-enhanced';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * Gets authentication headers
 * @returns {Promise<Object>} Object containing auth headers
 */
async function getAuthHeaders() {
  try {
    // First try to get backend session token
    const session = await sessionManagerEnhanced.getSession();
    
    // Build headers object
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Add authentication
    if (session?.sessionToken) {
      logger.debug('[API] Using backend session token for auth');
      headers['Authorization'] = `Session ${session.sessionToken}`;
    } else {
      // Fallback to legacy Auth0/cookie-based approach
      let idToken = null;
      let accessToken = null;
      
      // Try to get session data from the session API (legacy)
      if (session?.authenticated && session?.user) {
        // Check if we have tokens stored in session data
        const response = await fetch('/api/auth/access-token');
        if (response.ok) {
          const tokenData = await response.json();
          accessToken = tokenData.access_token;
          idToken = tokenData.id_token || accessToken;
        }
      }
      
      // If no token from session, try AppCache
      if (!idToken && typeof window !== 'undefined') {
        idToken = getCacheValue('idToken');
        accessToken = getCacheValue('accessToken');
        
        if (idToken) {
          logger.debug('[API] Using cached auth tokens');
        }
      }
      
      // If we have a token, use Bearer auth (legacy)
      if (idToken || accessToken) {
        headers['Authorization'] = `Bearer ${idToken || accessToken}`;
      } else {
        // No authentication available
        throw new Error('No valid authentication token available');
      }
    }
    
    // Add tenant ID header if available
    if (session?.user?.tenantId) {
      headers['X-Tenant-ID'] = session.user.tenantId;
      logger.debug('[API] Added tenant ID header:', session.user.tenantId);
    } else if (typeof window !== 'undefined') {
      // Fallback to localStorage
      const tenantId = localStorage.getItem('tenantId');
      if (tenantId) {
        headers['X-Tenant-ID'] = tenantId;
        logger.debug('[API] Added tenant ID header from localStorage:', tenantId);
      }
    }
    
    return headers;
  } catch (error) {
    logger.error('[API] Failed to get auth headers:', error);
    throw error;
  }
}

/**
 * Enhanced fetch function that automatically includes Cognito auth tokens
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>} Fetch response
 */
export async function fetchWithAuth(url, options = {}) {
  try {
    // Get authentication headers from Cognito or AppCache
    const authHeaders = await getAuthHeaders();
    
    // Merge provided headers with auth headers
    const headers = {
      ...authHeaders,
      ...(options.headers || {})
    };

    // Execute the fetch with auth headers
    const response = await fetch(url, {
      ...options,
      headers,
      // Important: DO NOT include credentials option to avoid cookies
    });

    // Handle 401 errors by throwing a specific error
    if (response.status === 401) {
      const error = new Error('Authentication failed');
      error.status = 401;
      throw error;
    }

    return response;
  } catch (error) {
    logger.error('[API] Fetch error:', { url, error: error.message });
    throw error;
  }
}

/**
 * GET request with authentication
 * @param {string} url - API endpoint URL
 * @returns {Promise<any>} Response data
 */
export async function get(url) {
  const response = await fetchWithAuth(url);
  const data = await response.json();
  
  // If response is not ok and data contains error, throw it
  if (!response.ok && data) {
    const error = new Error(data.error || 'Request failed');
    error.response = { data, status: response.status };
    throw error;
  }
  
  return data;
}

/**
 * POST request with authentication
 * @param {string} url - API endpoint URL
 * @param {Object} data - Data to send
 * @returns {Promise<any>} Response data
 */
export async function post(url, data) {
  const response = await fetchWithAuth(url, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  const responseData = await response.json();
  
  // If response is not ok and data contains error, throw it
  if (!response.ok && responseData) {
    const error = new Error(responseData.error || responseData.detail || 'Request failed');
    error.response = { data: responseData, status: response.status };
    throw error;
  }
  
  return responseData;
}

/**
 * PUT request with authentication
 * @param {string} url - API endpoint URL
 * @param {Object} data - Data to send
 * @returns {Promise<any>} Response data
 */
export async function put(url, data) {
  const response = await fetchWithAuth(url, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  const responseData = await response.json();
  
  // If response is not ok and data contains error, throw it
  if (!response.ok && responseData) {
    const error = new Error(responseData.error || responseData.detail || 'Request failed');
    error.response = { data: responseData, status: response.status };
    throw error;
  }
  
  return responseData;
}

/**
 * DELETE request with authentication
 * @param {string} url - API endpoint URL
 * @returns {Promise<any>} Response data
 */
export async function del(url) {
  const response = await fetchWithAuth(url, {
    method: 'DELETE',
  });
  const responseData = await response.json();
  
  // If response is not ok and data contains error, throw it
  if (!response.ok && responseData) {
    const error = new Error(responseData.error || responseData.detail || 'Request failed');
    error.response = { data: responseData, status: response.status };
    throw error;
  }
  
  return responseData;
}

// Export as a namespace for ease of use
const api = { get, post, put, delete: del };
export default api;

// Retry mechanism for API requests
export async function retryRequest(fn, retries = 3, delay = 1000) {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;

    // Only retry on network errors or 5xx server errors
    if (!error.message.includes('network') && !error.message.includes('500')) {
      throw error;
    }

    logger.debug(`[API] Retrying request... (${retries} attempts remaining)`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryRequest(fn, retries - 1, delay * 2);
  }
}

// Helper to handle API errors
export function handleApiError(error) {
  // Log the error
  logger.error('[API] Error:', error);

  // Parse error message
  let message = error.message;

  // Handle specific error types
  if (error.message.includes('Unauthorized')) {
    message = 'Your session has expired. Please sign in again.';
  } else if (error.message.includes('Forbidden')) {
    message = 'You do not have permission to perform this action.';
  } else if (error.message.includes('network')) {
    message = 'Network error. Please check your connection.';
  }

  return {
    error: true,
    message
  };
}

/**
 * Fetches benefits data for a specific employee
 * @param {string} employeeId - The ID of the employee
 * @returns {Promise<Object>} - The benefits data for the employee
 */
export const fetchEmployeeBenefits = async (employeeId) => {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/employees/${employeeId}/benefits`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch benefits data');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching employee benefits:', error);
    return null;
  }
};

/**
 * Updates benefits data for a specific employee
 * @param {string} employeeId - The ID of the employee
 * @param {Object} benefitsData - The updated benefits data
 * @returns {Promise<Object>} - The updated benefits data
 */
export const updateEmployeeBenefits = async (employeeId, benefitsData) => {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/employees/${employeeId}/benefits`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(benefitsData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update benefits data');
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating employee benefits:', error);
    throw error;
  }
};
