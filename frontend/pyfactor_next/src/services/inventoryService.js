import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';
import { inventoryCache } from '@/utils/cacheUtils';
import { getTenantId } from '@/utils/tenantUtils';

/**
 * Service for inventory-related API calls
 */
export const inventoryService = {
  /**
   * Get all products
   * @param {boolean} useCache - Whether to use cached data if available
   * @returns {Promise<Array>} List of products
   */
  async getProducts(useCache = true) {
    const cacheKey = 'products';
    
    try {
      // Try to get from cache first if useCache is true
      if (useCache) {
        const cachedData = inventoryCache.get(cacheKey);
        if (cachedData) {
          logger.debug('Using cached products data');
          return cachedData;
        }
      }
      
      // If not in cache or useCache is false, fetch from API
      const response = await axiosInstance.get('/api/inventory/products/', {
        timeout: 15000 // 15 second timeout
      });
      
      // Cache the response data
      if (response.data) {
        inventoryCache.set(cacheKey, response.data);
      }
      
      return response.data;
    } catch (error) {
      logger.error('Error fetching products:', error);
      throw error;
    }
  },

  /**
   * Get all inventory items
   * @param {boolean} useCache - Whether to use cached data if available
   * @returns {Promise<Array>} List of inventory items
   */
  async getInventoryItems(useCache = true) {
    const cacheKey = 'inventory_items';
    
    try {
      // Try to get from cache first if useCache is true
      if (useCache) {
        const cachedData = inventoryCache.get(cacheKey);
        if (cachedData) {
          logger.debug('Using cached inventory items data');
          return cachedData;
        }
      }
      
      // If not in cache or useCache is false, fetch from API
      const response = await axiosInstance.get('/api/inventory/items/', {
        timeout: 15000 // 15 second timeout
      });
      
      // Cache the response data
      if (response.data) {
        inventoryCache.set(cacheKey, response.data);
      }
      
      return response.data;
    } catch (error) {
      logger.error('Error fetching inventory items:', error);
      throw error;
    }
  },

  /**
   * Create a new product
   * @param {Object} productData - The product data
   * @returns {Promise<Object>} The created product
   */
  async createProduct(productData) {
    try {
      const response = await axiosInstance.post('/api/inventory/products/create/', productData, {
        timeout: 15000 // 15 second timeout
      });
      
      // Clear cache after creating a product
      inventoryCache.delete('products');
      
      return response.data;
    } catch (error) {
      logger.error('Error creating product:', error);
      throw error;
    }
  },

  /**
   * Create a new inventory item
   * @param {Object} itemData - The inventory item data
   * @returns {Promise<Object>} The created inventory item
   */
  async createInventoryItem(itemData) {
    try {
      const response = await axiosInstance.post('/api/inventory/items/', itemData, {
        timeout: 15000 // 15 second timeout
      });
      
      // Clear cache after creating an inventory item
      inventoryCache.delete('inventory_items');
      
      return response.data;
    } catch (error) {
      logger.error('Error creating inventory item:', error);
      throw error;
    }
  },

  /**
   * Update a product
   * @param {string} id - The product ID
   * @param {Object} productData - The updated product data
   * @returns {Promise<Object>} The updated product
   */
  async updateProduct(id, productData) {
    try {
      const response = await axiosInstance.put(`/api/inventory/products/${id}/`, productData, {
        timeout: 15000 // 15 second timeout
      });
      
      // Clear cache after updating a product
      inventoryCache.delete('products');
      
      return response.data;
    } catch (error) {
      logger.error(`Error updating product ${id}:`, error);
      throw error;
    }
  },

  /**
   * Update an inventory item
   * @param {string} id - The inventory item ID
   * @param {Object} itemData - The updated inventory item data
   * @returns {Promise<Object>} The updated inventory item
   */
  async updateInventoryItem(id, itemData) {
    try {
      const response = await axiosInstance.put(`/api/inventory/items/${id}/`, itemData, {
        timeout: 15000 // 15 second timeout
      });
      
      // Clear cache after updating an inventory item
      inventoryCache.delete('inventory_items');
      
      return response.data;
    } catch (error) {
      logger.error(`Error updating inventory item ${id}:`, error);
      throw error;
    }
  },

  /**
   * Delete a product
   * @param {string} id - The product ID
   * @returns {Promise<void>}
   */
  async deleteProduct(id) {
    try {
      await axiosInstance.delete(`/api/inventory/products/${id}/`, {
        timeout: 15000 // 15 second timeout
      });
      
      // Clear cache after deleting a product
      inventoryCache.delete('products');
      
    } catch (error) {
      logger.error(`Error deleting product ${id}:`, error);
      throw error;
    }
  },

  /**
   * Delete an inventory item
   * @param {string} id - The inventory item ID
   * @returns {Promise<void>}
   */
  async deleteInventoryItem(id) {
    try {
      await axiosInstance.delete(`/api/inventory/items/${id}/`, {
        timeout: 15000 // 15 second timeout
      });
      
      // Clear cache after deleting an inventory item
      inventoryCache.delete('inventory_items');
      
    } catch (error) {
      logger.error(`Error deleting inventory item ${id}:`, error);
      throw error;
    }
  },

  /**
   * Clear inventory cache
   * This should be called after any create, update, or delete operation
   */
  clearCache() {
    logger.debug('Clearing inventory cache');
    inventoryCache.clearTenant();
  },

  /**
   * Get mock products for fallback
   * @returns {Array} List of mock products
   */
  getMockProducts() {
    return [
      {
        id: '1',
        name: 'Sample Product 1',
        product_code: 'SP001',
        description: 'This is a sample product for development',
        stock_quantity: 25,
        reorder_level: 5,
        price: 19.99,
        is_for_sale: true
      },
      {
        id: '2',
        name: 'Sample Product 2',
        product_code: 'SP002',
        description: 'Another sample product for testing',
        stock_quantity: 10,
        reorder_level: 3,
        price: 29.99,
        is_for_sale: true
      },
      {
        id: '3',
        name: 'Office Supplies',
        product_code: 'OS003',
        description: 'Various office supplies including pens, paper, and staplers',
        stock_quantity: 150,
        reorder_level: 30,
        price: 12.50,
        is_for_sale: true
      },
      {
        id: '4',
        name: 'Desk Chair',
        product_code: 'DC004',
        description: 'Ergonomic office chair with adjustable height',
        stock_quantity: 8,
        reorder_level: 2,
        price: 199.99,
        is_for_sale: true
      },
      {
        id: '5',
        name: 'Laptop Stand',
        product_code: 'LS005',
        description: 'Adjustable laptop stand for better ergonomics',
        stock_quantity: 15,
        reorder_level: 5,
        price: 49.99,
        is_for_sale: true
      }
    ];
  }
};