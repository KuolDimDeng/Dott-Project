import API_CONFIG from '@/config/api';
import { logger } from '@/utils/logger';

const API_BASE_URL = API_CONFIG.BASE_URL;

class ProductService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  async getAuthHeaders() {
    try {
      const token = localStorage.getItem('accessToken');
      const tenantId = localStorage.getItem('tenantId');
      
      if (!token || !tenantId) {
        throw new Error('Missing authentication credentials');
      }

      return {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-ID': tenantId,
        'Content-Type': 'application/json'
      };
    } catch (error) {
      logger.error('Error getting auth headers:', error);
      throw error;
    }
  }

  getCacheKey(method, params = {}) {
    return `${method}-${JSON.stringify(params)}`;
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  async getProducts(params = {}) {
    const cacheKey = this.getCacheKey('getProducts', params);
    const cachedData = this.getFromCache(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }

    try {
      const headers = await this.getAuthHeaders();
      const queryParams = new URLSearchParams();
      
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.search) queryParams.append('search', params.search);
      if (params.category) queryParams.append('category', params.category);
      if (params.department) queryParams.append('department', params.department);

      const response = await fetch(`/api/products?${queryParams}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const result = {
        success: true,
        data: {
          products: data.products || [],
          total: data.total || 0,
          totalPages: data.totalPages || 1
        }
      };
      
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      logger.error('Error fetching products:', error);
      return {
        success: false,
        error: error.message,
        data: { products: [], total: 0, totalPages: 1 }
      };
    }
  }

  async getProductById(productId) {
    const cacheKey = this.getCacheKey('getProductById', { productId });
    const cachedData = this.getFromCache(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }

    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`/api/products/${productId}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const result = {
        success: true,
        data: data.product
      };
      
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      logger.error('Error fetching product:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Export singleton instance
export default new ProductService();