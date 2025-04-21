import { apiRequest, invalidateCache } from './apiHelpers';
import { axiosInstance, backendHrApiInstance } from '@/lib/axiosConfig';
import { getTenantId } from './tenantUtils';
import { logger } from './logger';

// Helper function to handle API errors
const handleApiError = (error, message) => {
  logger.error(`${message}: ${error.message}`, error);
  // You can add more error handling logic here if needed
};

// Base API methods
export const apiClient = {
  async get(endpoint, params = {}) {
    return apiRequest('GET', endpoint, null, params);
  },
  
  async post(endpoint, data = {}, params = {}) {
    return apiRequest('POST', endpoint, data, params);
  },
  
  async put(endpoint, data = {}, params = {}) {
    return apiRequest('PUT', endpoint, data, params);
  },
  
  async patch(endpoint, data = {}, params = {}) {
    return apiRequest('PATCH', endpoint, data, params);
  },
  
  async delete(endpoint, params = {}) {
    return apiRequest('DELETE', endpoint, null, params);
  }
};

// Specific API methods for products
export const productApi = {
  async getAll(params = {}) {
    return apiClient.get('/api/inventory/products', params);
  },
  
  async getById(id, params = {}) {
    return apiClient.get(`/api/inventory/products/${id}`, params);
  },
  
  async create(data, params = {}) {
    return apiClient.post('/api/inventory/products', data, params);
  },
  
  async update(id, data, params = {}) {
    return apiClient.put(`/api/inventory/products/${id}`, data, params);
  },
  
  async delete(id, params = {}) {
    return apiClient.delete(`/api/inventory/products/${id}`, params);
  },
  
  async getHealth() {
    return apiClient.get('/api/health');
  }
};

// Specific API methods for services
export const serviceApi = {
  async getAll(params = {}) {
    return apiClient.get('/api/inventory/services', params);
  },
  
  async getById(id, params = {}) {
    return apiClient.get(`/api/inventory/services/${id}`, params);
  },
  
  async create(data, params = {}) {
    return apiClient.post('/api/inventory/services', data, params);
  },
  
  async update(id, data, params = {}) {
    return apiClient.put(`/api/inventory/services/${id}`, data, params);
  },
  
  async delete(id, params = {}) {
    return apiClient.delete(`/api/inventory/services/${id}`, params);
  }
};

// Specific API methods for customers
export const customerApi = {
  async getAll(params = {}) {
    return apiClient.get('/api/customers', params);
  },
  
  async getById(id, params = {}) {
    return apiClient.get(`/api/customers/${id}`, params);
  },
  
  async create(data, params = {}) {
    return apiClient.post('/api/customers', data, params);
  },
  
  async update(id, data, params = {}) {
    return apiClient.put(`/api/customers/${id}`, data, params);
  },
  
  async delete(id, params = {}) {
    return apiClient.delete(`/api/customers/${id}`, params);
  }
};

// Specific API methods for invoices
export const invoiceApi = {
  getAll: async () => {
    try {
      logger.info('[API] Requesting all invoices');
      
      // Get tenant ID if available
      const tenantId = await getTenantId();
      const headers = tenantId ? { 'x-tenant-id': tenantId } : {};
      
      // Send request
      const response = await axiosInstance.get('/api/invoices', { headers });
      logger.info(`[API] Retrieved ${response.data.length} invoices`);
      
      return response.data;
    } catch (error) {
      handleApiError(error, 'Error fetching invoices');
      throw error;
    }
  },
  
  getById: async (id) => {
    try {
      logger.info(`[API] Requesting invoice ${id}`);
      
      // Get tenant ID if available
      const tenantId = await getTenantId();
      const headers = tenantId ? { 'x-tenant-id': tenantId } : {};
      
      // Send request
      const response = await axiosInstance.get(`/api/invoices/${id}`, { headers });
      logger.info(`[API] Retrieved invoice ${id}`);
      
      return response.data;
    } catch (error) {
      handleApiError(error, `Error fetching invoice ${id}`);
      throw error;
    }
  },
  
  create: async (invoiceData) => {
    try {
      logger.info('[API] Creating new invoice');
      
      // Get tenant ID if available
      const tenantId = await getTenantId();
      const headers = tenantId ? { 'x-tenant-id': tenantId } : {};
      
      // If tenant ID is available, include it in the data as well for RLS
      if (tenantId && !invoiceData.tenant_id) {
        invoiceData.tenant_id = tenantId;
      }
      
      // Send request
      const response = await axiosInstance.post('/api/invoices', invoiceData, { headers });
      logger.info(`[API] Created invoice with ID: ${response.data.id}`);
      
      return response.data;
    } catch (error) {
      handleApiError(error, 'Error creating invoice');
      throw error;
    }
  },
  
  update: async (id, invoiceData) => {
    try {
      logger.info(`[API] Updating invoice ${id}`);
      
      // Get tenant ID if available
      const tenantId = await getTenantId();
      const headers = tenantId ? { 'x-tenant-id': tenantId } : {};
      
      // If tenant ID is available, include it in the data as well for RLS
      if (tenantId && !invoiceData.tenant_id) {
        invoiceData.tenant_id = tenantId;
      }
      
      // Send request
      const response = await axiosInstance.put(`/api/invoices/${id}`, invoiceData, { headers });
      logger.info(`[API] Updated invoice ${id}`);
      
      return response.data;
    } catch (error) {
      handleApiError(error, `Error updating invoice ${id}`);
      throw error;
    }
  },
  
  delete: async (id) => {
    try {
      logger.info(`[API] Deleting invoice ${id}`);
      
      // Get tenant ID if available
      const tenantId = await getTenantId();
      const headers = tenantId ? { 'x-tenant-id': tenantId } : {};
      
      // Send request
      const response = await axiosInstance.delete(`/api/invoices/${id}`, { headers });
      logger.info(`[API] Deleted invoice ${id}`);
      
      return response.data;
    } catch (error) {
      handleApiError(error, `Error deleting invoice ${id}`);
      throw error;
    }
  },
  
  generatePdf: async (id) => {
    try {
      logger.info(`[API] Generating PDF for invoice ${id}`);
      
      // Get tenant ID if available
      const tenantId = await getTenantId();
      const headers = tenantId ? { 'x-tenant-id': tenantId } : {};
      
      // Send request
      const response = await axiosInstance.get(`/api/invoices/${id}/pdf`, { 
        headers,
        responseType: 'blob'
      });
      logger.info(`[API] Generated PDF for invoice ${id}`);
      
      return response.data;
    } catch (error) {
      handleApiError(error, `Error generating PDF for invoice ${id}`);
      throw error;
    }
  }
};

// Specific API methods for employees
export const employeeApi = {
  async getAll(params = {}) {
    try {
      // Clear cache for employee endpoints if specified
      if (params.bypassCache || params.skipCache || params.cache === false) {
        invalidateCache('/api/hr/employees');
        logger.debug('[EmployeeApi] Invalidated cache before getAll request');
      }
      
      // Get tenant ID if available
      const tenantId = await getTenantId();
      const headers = tenantId ? { 'x-tenant-id': tenantId } : {};
      
      // Add authentication headers from APP_CACHE
      if (typeof window !== 'undefined' && window.__APP_CACHE?.auth?.token) {
        headers.Authorization = `Bearer ${window.__APP_CACHE.auth.token}`;
        logger.debug('[EmployeeApi] Using auth token from APP_CACHE for employee list');
      }
      
      // Add cache busting parameter
      const queryParams = {
        ...params,
        _t: Date.now() // Add timestamp to prevent caching
      };
      
      // Use direct backend HR API instance
      const response = await backendHrApiInstance.get('/employees', {
        headers,
        params: queryParams
      });
      
      logger.debug(`[EmployeeApi] Retrieved ${response.data?.length || 0} employees`);
      return response.data;
    } catch (error) {
      // Detailed error logging
      logger.error('[EmployeeApi] Error fetching employees:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        config: error.config
      });
      
      throw error;
    }
  },
  
  async getById(id, params = {}) {
    try {
      // Clear cache if specified
      if (params.bypassCache || params.skipCache || params.cache === false) {
        invalidateCache(`/api/hr/employees/${id}`);
      }
      
      // Get tenant ID if available
      const tenantId = await getTenantId();
      const headers = tenantId ? { 'x-tenant-id': tenantId } : {};
      
      // Add cache busting parameter
      const queryParams = {
        ...params,
        _t: Date.now() // Add timestamp to prevent caching
      };
      
      // Use direct backend HR API instance
      const response = await backendHrApiInstance.get(`/employees/${id}`, {
        headers,
        params: queryParams
      });
      
      logger.debug(`[EmployeeApi] Retrieved employee ${id}`);
      return response.data;
    } catch (error) {
      logger.error(`[EmployeeApi] Error fetching employee ${id}:`, error.message);
      throw error;
    }
  },
  
  async create(data, params = {}) {
    try {
      logger.info('[EmployeeApi] Creating new employee');
      
      // Get tenant ID if available
      const tenantId = await getTenantId();
      const headers = tenantId ? { 'x-tenant-id': tenantId } : {};
      
      // Add authentication headers from APP_CACHE only
      if (typeof window !== 'undefined' && window.__APP_CACHE?.auth?.token) {
        headers.Authorization = `Bearer ${window.__APP_CACHE.auth.token}`;
        logger.debug('[EmployeeApi] Using auth token from APP_CACHE for employee creation');
      }
      
      // If tenant ID is available, include it in the data as well for RLS
      if (tenantId && !data.tenant_id) {
        data.tenant_id = tenantId;
      }
      
      // Set timeout and retry options
      const config = { 
        headers,
        params,
        timeout: 30000,
        retry: 2
      };
      
      // Use direct backend HR API instance
      const response = await backendHrApiInstance.post('/employees', data, config);
      
      // Invalidate cache after creation
      invalidateCache('/api/hr/employees');
      
      logger.info(`[EmployeeApi] Created employee with ID: ${response.data?.id || 'unknown'}`);
      
      // Log the full response for debugging
      logger.debug('[EmployeeApi] Employee creation response:', response.data);
      
      return response.data;
    } catch (error) {
      const statusCode = error.response?.status;
      
      // Handle authentication errors
      if (statusCode === 401) {
        logger.warn('[EmployeeApi] Authentication error creating employee, attempting to refresh session');
        try {
          // Try to refresh auth session using only APP_CACHE
          const { refreshUserSession } = await import('@/utils/refreshUserSession');
          const refreshResult = await refreshUserSession();
          
          if (!refreshResult) {
            logger.error('[EmployeeApi] Auth refresh failed during employee creation');
            throw new Error('Authentication failed. Please log in again to create employees.');
          }
          
          // Retry the request after auth refresh
          logger.info('[EmployeeApi] Retrying employee creation after auth refresh');
          
          // Get fresh tenant ID
          const freshTenantId = await getTenantId();
          const freshHeaders = freshTenantId ? { 'x-tenant-id': freshTenantId } : {};
          
          // Try to get a fresh token from APP_CACHE
          if (typeof window !== 'undefined' && window.__APP_CACHE?.auth?.token) {
            freshHeaders.Authorization = `Bearer ${window.__APP_CACHE.auth.token}`;
            logger.debug('[EmployeeApi] Using fresh token from APP_CACHE for creation retry');
          } else {
            logger.warn('[EmployeeApi] No token available in APP_CACHE after refresh');
            throw new Error('Authentication failed after refresh attempt. Please log in again.');
          }
          
          const retryResponse = await backendHrApiInstance.post('/employees', data, { 
            headers: freshHeaders,
            params,
            timeout: 30000
          });
          
          // Invalidate cache after creation
          invalidateCache('/api/hr/employees');
          
          logger.info(`[EmployeeApi] Created employee with ID: ${retryResponse.data?.id || 'unknown'} after auth refresh`);
          return retryResponse.data;
        } catch (refreshError) {
          logger.error('[EmployeeApi] Auth refresh failed, could not create employee:', refreshError.message);
          throw new Error('Authentication failed. Please log in again to create employees.');
        }
      }
      
      // Detailed error logging
      logger.error('[EmployeeApi] Error creating employee:', {
        message: error.message,
        status: statusCode,
        data: error.response?.data,
        config: error.config
      });
      
      throw error;
    }
  },
  
  async update(id, data, params = {}) {
    try {
      logger.info(`[EmployeeApi] Updating employee ${id}`);
      
      // Get tenant ID if available
      const tenantId = await getTenantId();
      const headers = tenantId ? { 'x-tenant-id': tenantId } : {};
      
      // If tenant ID is available, include it in the data as well for RLS
      if (tenantId && !data.tenant_id) {
        data.tenant_id = tenantId;
      }
      
      // Use direct backend HR API instance
      const response = await backendHrApiInstance.put(`/employees/${id}`, data, { 
        headers,
        params
      });
      
      // Invalidate cache after update
      invalidateCache('/api/hr/employees');
      invalidateCache(`/api/hr/employees/${id}`);
      
      logger.info(`[EmployeeApi] Updated employee ${id}`);
      return response.data;
    } catch (error) {
      logger.error(`[EmployeeApi] Error updating employee ${id}:`, error.message);
      throw error;
    }
  },
  
  async delete(id, params = {}) {
    try {
      logger.info(`[EmployeeApi] Deleting employee ${id}`);
      
      // Get tenant ID if available
      const tenantId = await getTenantId();
      const headers = tenantId ? { 'x-tenant-id': tenantId } : {};
      
      // Use direct backend HR API instance
      const response = await backendHrApiInstance.delete(`/employees/${id}`, { 
        headers,
        params
      });
      
      // Invalidate cache after deletion
      invalidateCache('/api/hr/employees');
      invalidateCache(`/api/hr/employees/${id}`);
      
      logger.info(`[EmployeeApi] Deleted employee ${id}`);
      return response.data;
    } catch (error) {
      logger.error(`[EmployeeApi] Error deleting employee ${id}:`, error.message);
      throw error;
    }
  }
};

// Specific API methods for tax management
export const taxApi = {
  // Tax form methods
  async getForms(params = {}) {
    try {
      logger.info('[API] Requesting tax forms');
      return await apiClient.get('/api/taxes/forms', params);
    } catch (error) {
      logger.error('[TaxApi] Error fetching tax forms:', error);
      throw error;
    }
  },
  
  async getFormById(id, params = {}) {
    try {
      logger.info(`[API] Requesting tax form ${id}`);
      return await apiClient.get(`/api/taxes/forms/${id}`, params);
    } catch (error) {
      logger.error(`[TaxApi] Error fetching tax form ${id}:`, error);
      throw error;
    }
  },
  
  async getFormsByEmployee(employeeId, params = {}) {
    try {
      logger.info(`[API] Requesting tax forms for employee ${employeeId}`);
      return await apiClient.get(`/api/taxes/forms?employee_id=${employeeId}`, params);
    } catch (error) {
      logger.error(`[TaxApi] Error fetching tax forms for employee ${employeeId}:`, error);
      throw error;
    }
  },
  
  async createForm(data, params = {}) {
    try {
      logger.info('[API] Creating new tax form');
      return await apiClient.post('/api/taxes/forms', data, params);
    } catch (error) {
      logger.error('[TaxApi] Error creating tax form:', error);
      throw error;
    }
  },
  
  async updateForm(id, data, params = {}) {
    try {
      logger.info(`[API] Updating tax form ${id}`);
      return await apiClient.put(`/api/taxes/forms/${id}`, data, params);
    } catch (error) {
      logger.error(`[TaxApi] Error updating tax form ${id}:`, error);
      throw error;
    }
  },
  
  async deleteForm(id, params = {}) {
    try {
      logger.info(`[API] Deleting tax form ${id}`);
      return await apiClient.delete(`/api/taxes/forms/${id}`, params);
    } catch (error) {
      logger.error(`[TaxApi] Error deleting tax form ${id}:`, error);
      throw error;
    }
  },
  
  async verifyForm(id, params = {}) {
    try {
      logger.info(`[API] Verifying tax form ${id}`);
      return await apiClient.post(`/api/taxes/forms/${id}/verify`, {}, params);
    } catch (error) {
      logger.error(`[TaxApi] Error verifying tax form ${id}:`, error);
      throw error;
    }
  },
  
  async downloadForm(id, params = {}) {
    try {
      logger.info(`[API] Downloading tax form ${id}`);
      return await apiClient.get(`/api/taxes/forms/${id}/download`, {
        ...params,
        responseType: 'blob',
      });
    } catch (error) {
      logger.error(`[TaxApi] Error downloading tax form ${id}:`, error);
      throw error;
    }
  },
  
  // State and jurisdiction methods
  async getStates(params = {}) {
    try {
      logger.info('[API] Requesting tax states');
      return await apiClient.get('/api/taxes/states', params);
    } catch (error) {
      logger.error('[TaxApi] Error fetching tax states:', error);
      throw error;
    }
  },
  
  async getStateById(id, params = {}) {
    try {
      logger.info(`[API] Requesting tax state ${id}`);
      return await apiClient.get(`/api/taxes/states/${id}`, params);
    } catch (error) {
      logger.error(`[TaxApi] Error fetching tax state ${id}:`, error);
      throw error;
    }
  },
  
  // Tax rate methods
  async getTaxRates(params = {}) {
    try {
      logger.info('[API] Requesting tax rates');
      return await apiClient.get('/api/taxes/rates', params);
    } catch (error) {
      logger.error('[TaxApi] Error fetching tax rates:', error);
      throw error;
    }
  },
  
  async getTaxRatesByState(stateId, params = {}) {
    try {
      logger.info(`[API] Requesting tax rates for state ${stateId}`);
      return await apiClient.get(`/api/taxes/rates?state=${stateId}`, params);
    } catch (error) {
      logger.error(`[TaxApi] Error fetching tax rates for state ${stateId}:`, error);
      throw error;
    }
  }
}; 