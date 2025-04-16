import { API, graphqlOperation } from 'aws-amplify';
import { getCache, setCache } from './cacheClient';
import { logger } from './logger';

/**
 * Execute a GraphQL query with in-memory caching
 * 
 * @param {object} query - The GraphQL query document
 * @param {object} variables - Variables for the GraphQL query
 * @param {object} options - Additional options
 * @param {boolean} options.bypassCache - Whether to bypass the cache
 * @param {number} options.cacheTTL - Cache time-to-live in milliseconds (default: 5 minutes)
 * @param {string} options.cacheKey - Custom cache key
 * @returns {Promise<object>} - The query result
 */
export const graphqlQueryWithCache = async (query, variables = {}, options = {}) => {
  const {
    bypassCache = false,
    cacheTTL = 1000 * 60 * 5, // 5 minutes default
    cacheKey: customCacheKey,
  } = options;

  // Generate default cache key from query name and variables
  const queryString = query.definitions[0]?.name?.value || '';
  const variablesHash = JSON.stringify(variables || {});
  const cacheKey = customCacheKey || `graphql_${queryString}_${variablesHash}`;

  try {
    // Check cache if not bypassing
    if (!bypassCache) {
      const cachedData = getCache(cacheKey);
      if (cachedData) {
        logger.debug('[graphqlQueryWithCache] Returning cached data', { query: queryString });
        return cachedData;
      }
    }

    logger.debug('[graphqlQueryWithCache] Executing GraphQL query', { query: queryString });
    
    // Execute the query
    const response = await API.graphql(graphqlOperation(query, variables));
    
    // Store in cache
    setCache(cacheKey, response, { ttl: cacheTTL });
    
    return response;
  } catch (error) {
    logger.error('[graphqlQueryWithCache] GraphQL query failed', { 
      query: queryString, 
      variables, 
      error 
    });
    throw error;
  }
};

/**
 * Execute a GraphQL mutation (not cached)
 * 
 * @param {object} mutation - The GraphQL mutation document
 * @param {object} variables - Variables for the GraphQL mutation
 * @returns {Promise<object>} - The mutation result
 */
export const graphqlMutation = async (mutation, variables = {}) => {
  const mutationString = mutation.definitions[0]?.name?.value || '';
  
  try {
    logger.debug('[graphqlMutation] Executing GraphQL mutation', { mutation: mutationString });
    
    // Execute the mutation
    const response = await API.graphql(graphqlOperation(mutation, variables));
    
    return response;
  } catch (error) {
    logger.error('[graphqlMutation] GraphQL mutation failed', { 
      mutation: mutationString, 
      variables, 
      error 
    });
    throw error;
  }
};

export default {
  query: graphqlQueryWithCache,
  mutation: graphqlMutation
}; 