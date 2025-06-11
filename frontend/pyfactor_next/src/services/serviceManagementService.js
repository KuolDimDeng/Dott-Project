import { logger } from '@/utils/logger';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

class ServiceManagementService {
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

  async getServices(params = {}) {
    const cacheKey = this.getCacheKey('getServices', params);
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
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
      if (params.is_recurring !== '') queryParams.append('is_recurring', params.is_recurring);
      if (params.is_for_sale !== '') queryParams.append('is_for_sale', params.is_for_sale);
      if (params.is_for_rent !== '') queryParams.append('is_for_rent', params.is_for_rent);
      if (params.charge_period) queryParams.append('charge_period', params.charge_period);
      if (params.priceRange?.min) queryParams.append('price_min', params.priceRange.min);
      if (params.priceRange?.max) queryParams.append('price_max', params.priceRange.max);

      const response = await fetch(`/api/services?${queryParams}`, {
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
          services: data.services || [],
          total: data.total || 0,
          totalPages: data.totalPages || 1
        }
      };
      
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      logger.error('Error fetching services:', error);
      return {
        success: false,
        error: error.message,
        data: { services: [], total: 0, totalPages: 1 }
      };
    }
  }

  async createService(serviceData) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`/api/services`, {
        method: 'POST',
        headers,
        body: JSON.stringify(serviceData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Clear cache after create
      this.cache.clear();
      
      return {
        success: true,
        data: data.service
      };
    } catch (error) {
      logger.error('Error creating service:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async updateService(serviceId, serviceData) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`/api/services/${serviceId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(serviceData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Clear cache after update
      this.cache.clear();
      
      return {
        success: true,
        data: data.service
      };
    } catch (error) {
      logger.error('Error updating service:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async deleteService(serviceId) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`/api/services/${serviceId}`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      // Clear cache after delete
      this.cache.clear();
      
      return {
        success: true
      };
    } catch (error) {
      logger.error('Error deleting service:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async bulkDeleteServices(serviceIds) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`/api/services/bulk-delete`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ serviceIds })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      // Clear cache after bulk delete
      this.cache.clear();
      
      return {
        success: true
      };
    } catch (error) {
      logger.error('Error bulk deleting services:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getServiceStats() {
    const cacheKey = this.getCacheKey('getServiceStats');
    const cachedData = this.getFromCache(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }

    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`/api/services/stats`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const result = {
        success: true,
        data: data.stats || {
          total: 0,
          active: 0,
          recurring: 0,
          totalValue: 0
        }
      };
      
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      logger.error('Error fetching service stats:', error);
      return {
        success: false,
        error: error.message,
        data: {
          total: 0,
          active: 0,
          recurring: 0,
          totalValue: 0
        }
      };
    }
  }
}

// Export singleton instance
export default new ServiceManagementService();