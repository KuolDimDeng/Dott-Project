import axios from 'axios';
import appCache from '@/utils/appCache';
import { logger } from '@/utils/logger';

const API_BASE_URL = '/api/customers';
const CACHE_PREFIX = 'customer';
const LIST_CACHE_KEY = `${CACHE_PREFIX}_list`;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Safely parse JSON from API response
 * @param {any} data - Response data to parse
 * @returns {Object|Array} Parsed data or empty array/object
 */
const safeParseJSON = (data) => {
  if (!data) return [];
  
  try {
    if (typeof data === 'string') {
      return JSON.parse(data);
    }
    return data;
  } catch (error) {
    logger.error('[CustomerService] Error parsing JSON response:', error);
    return Array.isArray(data) ? [] : {};
  }
};

/**
 * Customer service with in-memory caching powered by AWS AppSync
 */
export const CustomerService = {
  /**
   * Fetch a list of customers with caching
   * @param {Object} options - Options for fetching customers
   * @param {boolean} options.forceRefresh - Force a refresh from API
   * @param {Object} options.headers - Request headers
   * @returns {Promise<Array>} List of customers
   */
  async getCustomers({ forceRefresh = false, headers = {} } = {}) {
    try {
      // Check cache first if not forcing refresh
      if (!forceRefresh && appCache.has(LIST_CACHE_KEY)) {
        logger.info('[CustomerService] Returning customers from cache');
        return appCache.get(LIST_CACHE_KEY);
      }

      // Fetch from API
      logger.info('[CustomerService] Fetching customers from API');
      const response = await axios.get(API_BASE_URL, { 
        headers,
        timeout: 8000, // 8 second timeout
        validateStatus: status => status < 500 // Don't throw for 4xx errors
      });
      
      // Safely parse response data
      const responseData = safeParseJSON(response.data);
      
      // Determine data structure and extract customers array
      let customers = [];
      if (Array.isArray(responseData)) {
        customers = responseData;
      } else if (responseData && typeof responseData === 'object' && Array.isArray(responseData.customers)) {
        customers = responseData.customers;
      } else {
        logger.warn('[CustomerService] Unexpected data format:', responseData);
        customers = [];
      }
      
      // Cache results
      appCache.set(LIST_CACHE_KEY, customers, CACHE_TTL);
      
      return customers;
    } catch (error) {
      logger.error('[CustomerService] Error fetching customers:', error);
      if (error.response) {
        logger.error('[CustomerService] Error response:', {
          status: error.response.status,
          headers: error.response.headers,
          data: error.response.data
        });
      }
      // Return an empty array instead of throwing to prevent UI crashes
      return [];
    }
  },

  /**
   * Get a customer by ID with caching
   * @param {string} id - Customer ID
   * @param {Object} options - Options for fetching the customer
   * @param {boolean} options.forceRefresh - Force a refresh from API
   * @param {Object} options.headers - Request headers
   * @returns {Promise<Object>} Customer object
   */
  async getCustomer(id, { forceRefresh = false, headers = {} } = {}) {
    try {
      if (!id) {
        logger.error('[CustomerService] Invalid customer ID provided');
        return null;
      }
      
      const cacheKey = `${CACHE_PREFIX}_${id}`;
      
      // Check cache first if not forcing refresh
      if (!forceRefresh && appCache.has(cacheKey)) {
        logger.info(`[CustomerService] Returning customer ${id} from cache`);
        return appCache.get(cacheKey);
      }
      
      // Fetch from API
      logger.info(`[CustomerService] Fetching customer ${id} from API`);
      const response = await axios.get(`${API_BASE_URL}/${id}`, { 
        headers,
        timeout: 8000,
        validateStatus: status => status < 500
      });
      
      // Safely parse response data
      const customerData = safeParseJSON(response.data);
      
      // Cache result
      appCache.set(cacheKey, customerData, CACHE_TTL);
      
      return customerData;
    } catch (error) {
      logger.error(`[CustomerService] Error fetching customer ${id}:`, error);
      if (error.response) {
        logger.error('[CustomerService] Error response:', {
          status: error.response.status,
          headers: error.response.headers,
          data: error.response.data
        });
      }
      
      // Return null instead of throwing to prevent UI crashes
      return null;
    }
  },
  
  /**
   * Create a new customer
   * @param {Object} customerData - Customer data to create
   * @param {Object} options - Request options
   * @param {Object} options.headers - Request headers
   * @returns {Promise<Object>} Created customer
   */
  async createCustomer(customerData, { headers = {} } = {}) {
    try {
      logger.info('[CustomerService] Creating new customer');
      const response = await axios.post(API_BASE_URL, customerData, { headers });
      
      // Clear list cache to ensure fresh data on next fetch
      appCache.delete(LIST_CACHE_KEY);
      
      return response.data;
    } catch (error) {
      logger.error('[CustomerService] Error creating customer:', error);
      throw error;
    }
  },
  
  /**
   * Update an existing customer
   * @param {string} id - Customer ID
   * @param {Object} customerData - Updated customer data
   * @param {Object} options - Request options
   * @param {Object} options.headers - Request headers
   * @returns {Promise<Object>} Updated customer
   */
  async updateCustomer(id, customerData, { headers = {} } = {}) {
    try {
      logger.info(`[CustomerService] Updating customer ${id}`);
      const response = await axios.put(`${API_BASE_URL}/${id}`, customerData, { headers });
      
      // Update customer in cache
      const cacheKey = `${CACHE_PREFIX}_${id}`;
      appCache.set(cacheKey, response.data, CACHE_TTL);
      
      // Clear list cache to ensure fresh data on next fetch
      appCache.delete(LIST_CACHE_KEY);
      
      return response.data;
    } catch (error) {
      logger.error(`[CustomerService] Error updating customer ${id}:`, error);
      throw error;
    }
  },
  
  /**
   * Delete a customer
   * @param {string} id - Customer ID
   * @param {Object} options - Request options
   * @param {Object} options.headers - Request headers
   * @returns {Promise<Object>} Deletion response
   */
  async deleteCustomer(id, { headers = {} } = {}) {
    try {
      logger.info(`[CustomerService] Deleting customer ${id}`);
      const response = await axios.delete(`${API_BASE_URL}/${id}`, { headers });
      
      // Remove from cache
      const cacheKey = `${CACHE_PREFIX}_${id}`;
      appCache.delete(cacheKey);
      
      // Clear list cache to ensure fresh data on next fetch
      appCache.delete(LIST_CACHE_KEY);
      
      return response.data;
    } catch (error) {
      logger.error(`[CustomerService] Error deleting customer ${id}:`, error);
      throw error;
    }
  },
  
  /**
   * Clear all customer cache entries
   */
  clearCache() {
    logger.info('[CustomerService] Clearing customer cache');
    
    // Find and delete all customer-related cache entries
    for (const key of [...appCache.cache.keys()]) {
      if (key.startsWith(CACHE_PREFIX)) {
        appCache.delete(key);
      }
    }
  }
};

export default CustomerService; 