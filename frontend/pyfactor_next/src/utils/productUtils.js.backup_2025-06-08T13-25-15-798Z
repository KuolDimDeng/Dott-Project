import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';

/**
 * Generate a unique product code
 * @param {string} prefix - Optional prefix for the code
 * @returns {string} A unique product code
 */
export const generateProductCode = (prefix = 'PRD') => {
  const randomPart = Math.floor(10000 + Math.random() * 90000); // 5-digit number
  const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
  return `${prefix}-${randomPart}-${timestamp}`;
};

/**
 * Calculate product profit margin
 * @param {number} price - Selling price
 * @param {number} costPrice - Cost price
 * @returns {number} Profit margin percentage
 */
export const calculateProfitMargin = (price, costPrice) => {
  if (!price || !costPrice || costPrice <= 0) return 0;
  const profit = price - costPrice;
  return parseFloat(((profit / costPrice) * 100).toFixed(2));
};

/**
 * Calculate product revenue
 * @param {number} price - Selling price
 * @param {number} quantity - Quantity sold
 * @returns {number} Total revenue
 */
export const calculateRevenue = (price, quantity) => {
  if (!price || !quantity) return 0;
  return parseFloat((price * quantity).toFixed(2));
};

/**
 * Format price with currency symbol
 * @param {number} price - The price to format
 * @param {string} currencySymbol - Currency symbol to use
 * @returns {string} Formatted price
 */
export const formatPrice = (price, currencySymbol = '$') => {
  if (price === undefined || price === null) return `${currencySymbol}0.00`;
  return `${currencySymbol}${parseFloat(price).toFixed(2)}`;
};

/**
 * Categorize products by stock status
 * @param {Array} products - List of products
 * @returns {Object} Products categorized by stock status
 */
export const categorizeByStockStatus = (products) => {
  if (!products || !Array.isArray(products)) return {};
  
  return products.reduce((result, product) => {
    if (!product.stock_quantity && product.stock_quantity !== 0) {
      result.unknown.push(product);
    } else if (product.stock_quantity <= 0) {
      result.outOfStock.push(product);
    } else if (product.reorder_level && product.stock_quantity <= product.reorder_level) {
      result.lowStock.push(product);
    } else {
      result.inStock.push(product);
    }
    return result;
  }, { inStock: [], lowStock: [], outOfStock: [], unknown: [] });
};

/**
 * Group products by category
 * @param {Array} products - List of products
 * @returns {Object} Products grouped by category
 */
export const groupByCategory = (products) => {
  if (!products || !Array.isArray(products)) return {};
  
  return products.reduce((result, product) => {
    const categoryId = product.category_id || 'uncategorized';
    if (!result[categoryId]) {
      result[categoryId] = [];
    }
    result[categoryId].push(product);
    return result;
  }, {});
};

/**
 * Sort products by a specific field
 * @param {Array} products - List of products
 * @param {string} field - Field to sort by
 * @param {string} order - Sort order ('asc' or 'desc')
 * @returns {Array} Sorted products
 */
export const sortProducts = (products, field = 'name', order = 'asc') => {
  if (!products || !Array.isArray(products)) return [];
  
  try {
    const sortedProducts = [...products];
    
    sortedProducts.sort((a, b) => {
      let valueA = a[field];
      let valueB = b[field];
      
      // Handle null/undefined values
      if (valueA === undefined || valueA === null) valueA = '';
      if (valueB === undefined || valueB === null) valueB = '';
      
      // Handle string comparison
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return order === 'asc' 
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA);
      }
      
      // Handle numeric comparison
      return order === 'asc' ? valueA - valueB : valueB - valueA;
    });
    
    return sortedProducts;
  } catch (error) {
    logger.error('Error sorting products:', error);
    return products;
  }
};

/**
 * Filter products based on search query and filters
 * @param {Array} products - List of products
 * @param {string} search - Search query
 * @param {Object} filters - Filter criteria
 * @returns {Array} Filtered products
 */
export const filterProducts = (products, search = '', filters = {}) => {
  if (!products || !Array.isArray(products)) return [];
  
  try {
    let filtered = [...products];
    
    // Apply search
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(product => 
        (product.name && product.name.toLowerCase().includes(searchLower)) ||
        (product.description && product.description.toLowerCase().includes(searchLower)) ||
        (product.product_code && product.product_code.toLowerCase().includes(searchLower))
      );
    }
    
    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (key === 'include_inactive') {
          // Only filter by is_active if include_inactive is false
          if (value === false) {
            filtered = filtered.filter(product => product.is_active);
          }
        } else {
          filtered = filtered.filter(product => {
            return product[key] === value || 
                  (Array.isArray(product[key]) && product[key].includes(value));
          });
        }
      }
    });
    
    return filtered;
  } catch (error) {
    logger.error('Error filtering products:', error);
    return products;
  }
};

export default {
  generateProductCode,
  calculateProfitMargin,
  calculateRevenue,
  formatPrice,
  categorizeByStockStatus,
  groupByCategory,
  sortProducts,
  filterProducts
}; 