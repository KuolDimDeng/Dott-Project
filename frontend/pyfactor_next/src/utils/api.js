import { fetchAuthSession } from 'aws-amplify/auth';
import { logger } from '@/utils/logger';
import tokenRefreshService from '@/utils/tokenRefresh';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

async function getAuthHeaders() {
  try {
    const { tokens } = await fetchAuthSession();
    if (!tokens?.idToken) {
      throw new Error('No valid session');
    }

    return {
      'Authorization': `Bearer ${tokens.idToken}`,
      'Content-Type': 'application/json'
    };
  } catch (error) {
    logger.error('[API] Failed to get auth headers:', error);
    throw error;
  }
}

export async function apiRequest(endpoint, options = {}) {
  try {
    const headers = await getAuthHeaders();
    
    // Use fetchWithTokenRefresh to handle token refreshing
    const response = await tokenRefreshService.fetchWithTokenRefresh(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers
      },
      credentials: 'include'
    });

    // Handle 401 Unauthorized
    if (response.status === 401) {
      throw new Error('Unauthorized');
    }

    // Handle 403 Forbidden
    if (response.status === 403) {
      throw new Error('Forbidden');
    }

    // Handle other non-200 responses
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Request failed with status ${response.status}`);
    }

    return response.json();
  } catch (error) {
    logger.error('[API] Request failed:', {
      endpoint,
      error: error.message
    });
    throw error;
  }
}

export const api = {
  get: async (endpoint, options = {}) => {
    return apiRequest(endpoint, {
      ...options,
      method: 'GET'
    });
  },

  post: async (endpoint, data, options = {}) => {
    return apiRequest(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  put: async (endpoint, data, options = {}) => {
    return apiRequest(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  patch: async (endpoint, data, options = {}) => {
    return apiRequest(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  delete: async (endpoint, options = {}) => {
    return apiRequest(endpoint, {
      ...options,
      method: 'DELETE'
    });
  }
};

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