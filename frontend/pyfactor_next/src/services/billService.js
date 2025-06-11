import { logger } from '@/utils/logger';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

class BillService {
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

  async getBills(params = {}) {
    const cacheKey = this.getCacheKey('getBills', params);
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
      if (params.is_paid !== undefined && params.is_paid !== '') queryParams.append('is_paid', params.is_paid);
      if (params.vendor_id) queryParams.append('vendor_id', params.vendor_id);
      if (params.dateRange?.start) queryParams.append('date_start', params.dateRange.start);
      if (params.dateRange?.end) queryParams.append('date_end', params.dateRange.end);
      if (params.amountRange?.min) queryParams.append('amount_min', params.amountRange.min);
      if (params.amountRange?.max) queryParams.append('amount_max', params.amountRange.max);

      const response = await fetch(`/api/bills?${queryParams}`, {
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
          bills: data.bills || [],
          total: data.total || 0,
          totalPages: data.totalPages || 1
        }
      };
      
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      logger.error('Error fetching bills:', error);
      return {
        success: false,
        error: error.message,
        data: { bills: [], total: 0, totalPages: 1 }
      };
    }
  }

  async createBill(billData) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`/api/bills`, {
        method: 'POST',
        headers,
        body: JSON.stringify(billData)
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
        data: data.bill
      };
    } catch (error) {
      logger.error('Error creating bill:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async updateBill(billId, billData) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`/api/bills/${billId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(billData)
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
        data: data.bill
      };
    } catch (error) {
      logger.error('Error updating bill:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async deleteBill(billId) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`/api/bills/${billId}`, {
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
      logger.error('Error deleting bill:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async bulkDeleteBills(billIds) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`/api/bills/bulk-delete`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ billIds })
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
      logger.error('Error bulk deleting bills:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async markBillAsPaid(billId) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`/api/bills/${billId}/mark-paid`, {
        method: 'POST',
        headers
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
        data: data.bill
      };
    } catch (error) {
      logger.error('Error marking bill as paid:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getBillStats() {
    const cacheKey = this.getCacheKey('getBillStats');
    const cachedData = this.getFromCache(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }

    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`/api/bills/stats`, {
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
          unpaid: 0,
          overdue: 0,
          totalAmount: 0,
          unpaidAmount: 0
        }
      };
      
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      logger.error('Error fetching bill stats:', error);
      return {
        success: false,
        error: error.message,
        data: {
          total: 0,
          unpaid: 0,
          overdue: 0,
          totalAmount: 0,
          unpaidAmount: 0
        }
      };
    }
  }
}

// Export singleton instance
export default new BillService();