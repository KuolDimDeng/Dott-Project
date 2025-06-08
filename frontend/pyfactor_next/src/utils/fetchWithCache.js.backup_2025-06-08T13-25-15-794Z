import { generateClient } from 'aws-amplify/api';
import { logger } from './logger';
import { getCache, setCache } from './cacheClient';

// Create an API client
const apiClient = generateClient();

/**
 * Utility function for making API calls with caching support
 * Uses in-memory cache instead of localStorage or cookies
 *
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Request options
 * @param {string} options.method - HTTP method (GET, POST, etc.)
 * @param {Object} options.body - Request body
 * @param {boolean} options.bypassCache - Skip cache check
 * @param {number} options.cacheTTL - Cache time-to-live in milliseconds
 * @param {string} options.cacheKey - Custom cache key (defaults to endpoint + params hash)
 * @returns {Promise<any>} - Response data
 */
export const fetchWithCache = async (endpoint, options = {}) => {
  const {
    method = 'GET',
    body,
    bypassCache = false,
    cacheTTL = 1000 * 60 * 5, // 5 minutes default
    cacheKey: customCacheKey,
    headers: customHeaders = {},
  } = options;

  // Create a cache key based on the endpoint and params
  const paramsHash = body ? JSON.stringify(body) : '';
  const cacheKey = customCacheKey || `${endpoint}_${method}_${paramsHash}`;

  try {
    // Check cache if not bypassing
    if (!bypassCache && method === 'GET') {
      const cachedData = getCache(cacheKey);
      if (cachedData) {
        logger.debug('[fetchWithCache] Returning cached data', { endpoint });
        return cachedData;
      }
    }

    logger.debug('[fetchWithCache] Making API request', { endpoint, method });

    // Make the API request
    const response = await apiClient.get(endpoint, {
      headers: {
        'Content-Type': 'application/json',
        ...customHeaders,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    // Cache the response for GET requests
    if (method === 'GET') {
      setCache(cacheKey, response, { ttl: cacheTTL });
    }

    return response;
  } catch (error) {
    logger.error('[fetchWithCache] API request failed', { endpoint, error });
    throw error;
  }
};

export default fetchWithCache; 