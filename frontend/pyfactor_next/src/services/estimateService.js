import { logger } from '@/utils/logger';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

class EstimateService {
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

  async getEstimates(params = {}) {
    const cacheKey = this.getCacheKey('getEstimates', params);
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
      if (params.status) queryParams.append('status', params.status);
      if (params.customer_id) queryParams.append('customer_id', params.customer_id);
      if (params.dateRange?.start) queryParams.append('date_start', params.dateRange.start);
      if (params.dateRange?.end) queryParams.append('date_end', params.dateRange.end);
      if (params.amountRange?.min) queryParams.append('amount_min', params.amountRange.min);
      if (params.amountRange?.max) queryParams.append('amount_max', params.amountRange.max);
      if (params.expiring_soon) queryParams.append('expiring_soon', 'true');

      const response = await fetch(`/api/estimates?${queryParams}`, {
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
          estimates: data.estimates || [],
          total: data.total || 0,
          totalPages: data.totalPages || 1
        }
      };
      
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      logger.error('Error fetching estimates:', error);
      return {
        success: false,
        error: error.message,
        data: { estimates: [], total: 0, totalPages: 1 }
      };
    }
  }

  async createEstimate(estimateData) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`/api/estimates`, {
        method: 'POST',
        headers,
        body: JSON.stringify(estimateData)
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
        data: data.estimate
      };
    } catch (error) {
      logger.error('Error creating estimate:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async updateEstimate(estimateId, estimateData) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`/api/estimates/${estimateId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(estimateData)
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
        data: data.estimate
      };
    } catch (error) {
      logger.error('Error updating estimate:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async deleteEstimate(estimateId) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`/api/estimates/${estimateId}`, {
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
      logger.error('Error deleting estimate:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async bulkDeleteEstimates(estimateIds) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`/api/estimates/bulk-delete`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ estimateIds })
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
      logger.error('Error bulk deleting estimates:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async sendEstimate(estimateId) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`/api/estimates/${estimateId}/send`, {
        method: 'POST',
        headers
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Clear cache after status update
      this.cache.clear();
      
      return {
        success: true,
        data: data.estimate
      };
    } catch (error) {
      logger.error('Error sending estimate:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async convertToInvoice(estimateId) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`/api/estimates/${estimateId}/convert-to-invoice`, {
        method: 'POST',
        headers
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Clear cache after conversion
      this.cache.clear();
      
      return {
        success: true,
        data: data
      };
    } catch (error) {
      logger.error('Error converting estimate to invoice:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getEstimateStats() {
    const cacheKey = this.getCacheKey('getEstimateStats');
    const cachedData = this.getFromCache(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }

    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`/api/estimates/stats`, {
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
          draft: 0,
          sent: 0,
          accepted: 0,
          rejected: 0,
          expired: 0,
          totalValue: 0,
          acceptanceRate: 0
        }
      };
      
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      logger.error('Error fetching estimate stats:', error);
      return {
        success: false,
        error: error.message,
        data: {
          total: 0,
          draft: 0,
          sent: 0,
          accepted: 0,
          rejected: 0,
          expired: 0,
          totalValue: 0,
          acceptanceRate: 0
        }
      };
    }
  }
}

// Export singleton instance
export default new EstimateService();