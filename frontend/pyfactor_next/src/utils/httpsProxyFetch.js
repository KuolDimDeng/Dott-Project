/**
 * Utility for making API requests through the Next.js API proxy
 * This allows us to handle self-signed certificates and HTTPS issues
 */

/**
 * Make an API request through the Next.js proxy
 * @param {string} endpoint - API endpoint path (without /api prefix)
 * @param {Object} options - Fetch options
 * @returns {Promise<any>} - Response data
 */
export async function proxyFetch(endpoint, options = {}) {
  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
  
  // Use the Next.js API route as a proxy to the backend
  const proxyUrl = `/api/proxy/${cleanEndpoint}`;
  
  // Set default headers
  const fetchOptions = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  };
  
  try {
    // Make the request
    const response = await fetch(proxyUrl, fetchOptions);
    
    // Check if response is ok
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    // Parse JSON response
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`[proxyFetch] Error fetching ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Reset circuit breakers
 */
export function resetCircuitBreakersProxy() {
  // Clear any circuit breaker data from localStorage
  const keys = Object.keys(localStorage);
  const circuitBreakerKeys = keys.filter(key => key.startsWith('circuitBreaker:'));
  
  circuitBreakerKeys.forEach(key => {
    console.log(`[resetCircuitBreakers] Removing ${key} from localStorage`);
    localStorage.removeItem(key);
  });
  
  console.log(`[resetCircuitBreakers] Reset ${circuitBreakerKeys.length} circuit breakers`);
  
  // If there's a global reset function, call it
  if (window.__resetCircuitBreakers) {
    window.__resetCircuitBreakers();
    console.log('[resetCircuitBreakers] Called global reset function');
  }
  
  return circuitBreakerKeys.length;
}

// Export convenience methods for common HTTP methods
export const proxyApi = {
  /**
   * Make a GET request through the proxy
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Additional options (headers, etc)
   * @returns {Promise<any>} Response data
   */
  get: (endpoint, options = {}) => proxyFetch(endpoint, { 
    method: 'GET',
    ...options
  }),
  
  /**
   * Make a POST request through the proxy
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body
   * @param {Object} options - Additional options (headers, etc)
   * @returns {Promise<any>} Response data
   */
  post: (endpoint, data, options = {}) => proxyFetch(endpoint, { 
    method: 'POST', 
    body: JSON.stringify(data),
    ...options
  }),
  
  /**
   * Make a PUT request through the proxy
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body
   * @param {Object} options - Additional options (headers, etc)
   * @returns {Promise<any>} Response data
   */
  put: (endpoint, data, options = {}) => proxyFetch(endpoint, { 
    method: 'PUT', 
    body: JSON.stringify(data),
    ...options
  }),
  
  /**
   * Make a DELETE request through the proxy
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Additional options (headers, etc)
   * @returns {Promise<any>} Response data
   */
  delete: (endpoint, options = {}) => proxyFetch(endpoint, { 
    method: 'DELETE',
    ...options
  }),
  
  /**
   * Reset all circuit breakers
   * @returns {number} Number of circuit breakers reset
   */
  resetCircuitBreakers: resetCircuitBreakersProxy
}; 