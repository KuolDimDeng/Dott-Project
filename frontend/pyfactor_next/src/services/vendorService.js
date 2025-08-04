import API_CONFIG from '@/config/api';
import { logger } from '@/utils/logger';

const API_BASE_URL = API_CONFIG.BASE_URL;

class VendorService {
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

  async getVendors(params = {}) {
    const cacheKey = this.getCacheKey('getVendors', params);
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
      if (params.state) queryParams.append('state', params.state);
      if (params.city) queryParams.append('city', params.city);

      const response = await fetch(`/api/vendors?${queryParams}`, {
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
          vendors: data.vendors || [],
          total: data.total || 0,
          totalPages: data.totalPages || 1
        }
      };
      
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      logger.error('Error fetching vendors:', error);
      return {
        success: false,
        error: error.message,
        data: { vendors: [], total: 0, totalPages: 1 }
      };
    }
  }

  async createVendor(vendorData) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`/api/vendors`, {
        method: 'POST',
        headers,
        body: JSON.stringify(vendorData)
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
        data: data.vendor
      };
    } catch (error) {
      logger.error('Error creating vendor:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async updateVendor(vendorId, vendorData) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`/api/vendors/${vendorId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(vendorData)
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
        data: data.vendor
      };
    } catch (error) {
      logger.error('Error updating vendor:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async deleteVendor(vendorId) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`/api/vendors/${vendorId}`, {
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
      logger.error('Error deleting vendor:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async bulkDeleteVendors(vendorIds) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`/api/vendors/bulk-delete`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ vendorIds })
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
      logger.error('Error bulk deleting vendors:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async toggleVendorStatus(vendorId) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`/api/vendors/${vendorId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ action: 'toggle-status' })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Clear cache after status change
      this.cache.clear();
      
      return {
        success: true,
        message: data.message,
        is_active: data.is_active
      };
    } catch (error) {
      logger.error('Error toggling vendor status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getVendorStats() {
    const cacheKey = this.getCacheKey('getVendorStats');
    const cachedData = this.getFromCache(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }

    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`/api/vendors/stats`, {
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
          newThisMonth: 0,
          totalPurchases: 0
        }
      };
      
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      logger.error('Error fetching vendor stats:', error);
      return {
        success: false,
        error: error.message,
        data: {
          total: 0,
          active: 0,
          newThisMonth: 0,
          totalPurchases: 0
        }
      };
    }
  }
}

// Export singleton instance
export default new VendorService();