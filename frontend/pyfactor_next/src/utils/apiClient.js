// Removed duplicate import
import { apiRequest, invalidateCache } from './apiHelpers';
// Removed duplicate import
import { axiosInstance, backendHrApiInstance } from '@/lib/axiosConfig';
// Removed duplicate import
import { getTenantId } from './tenantUtils';
// Removed duplicate import
import { logger } from './logger';
import axios from 'axios';
import { getAppCacheItem, setAppCacheItem } from '@/utils/appCache';
import { fetchWithAuth } from '@/utils/api';
import { djangoApi } from './djangoApiClient';

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
    return fetchWithAuth('/api/hr/employees/');
  },
  
  async getCurrent() {
    // Get the current user's employee information using the custom:employeeid attribute
    return fetchWithAuth('/api/hr/api/me/');
  },
  
  async getById(id) {
    return fetchWithAuth(`/api/hr/employees/${id}/`);
  },
  
  async create(data, params = {}) {
    try {
      const tenantId = await getTenantId();
      const headers = {
        'X-Tenant-ID': tenantId,
        'X-Schema-Name': `tenant_${tenantId.replace(/-/g, '_')}`
      };
      
      const response = await backendHrApiInstance.post('/employees', data, {
        headers,
        params: { ...params, tenantId }
      });
      
      return response.data;
    } catch (error) {
      logger.error('[EmployeeApi] Error creating employee:', error);
      throw error;
    }
  },
  
  async update(id, data, params = {}) {
    try {
      const tenantId = await getTenantId();
      const headers = {
        'X-Tenant-ID': tenantId,
        'X-Schema-Name': `tenant_${tenantId.replace(/-/g, '_')}`
      };
      
      const response = await backendHrApiInstance.put(`/employees/${id}`, data, {
        headers,
        params: { ...params, tenantId }
      });
      
      return response.data;
    } catch (error) {
      logger.error(`[EmployeeApi] Error updating employee ${id}:`, error);
      throw error;
    }
  },
  
  async delete(id, params = {}) {
    try {
      const tenantId = await getTenantId();
      const headers = {
        'X-Tenant-ID': tenantId,
        'X-Schema-Name': `tenant_${tenantId.replace(/-/g, '_')}`
      };
      
      const response = await backendHrApiInstance.delete(`/employees/${id}`, {
        headers,
        params: { ...params, tenantId }
      });
      
      return response.data;
    } catch (error) {
      logger.error(`[EmployeeApi] Error deleting employee ${id}:`, error);
      throw error;
    }
  },
  
  async getHealth(params = {}) {
    try {
      return await apiClient.get('/api/health', params);
    } catch (error) {
      logger.error('[ProductApi] Health check failed:', error);
      throw error;
    }
  }
};

// Specific API methods for employees
export const employeeApi = {
  async getAll(params = {}) {
    try {
      // Reset circuit breaker for this endpoint
      const { resetCircuitBreakers } = await import('@/lib/axiosConfig');
      resetCircuitBreakers('/employees');
      
      // Get tenant ID for request
      let tenantId = null;
      
      // Try to get from APP_CACHE first
      if (typeof window !== 'undefined') {
        if (appCache.getAll()) {
          tenantId = appCache.get('tenant.id');
        } else if (window.getCacheValue && window.getCacheValue('tenantId')) {
          tenantId = window.getCacheValue('tenantId');
        }
      }
      
      // Include params in the request
      const queryParams = new URLSearchParams();
      
      // Add timestamp to prevent caching
      queryParams.append('_t', Date.now());
      
      // Add tenant ID to query params if available
      if (tenantId) {
        queryParams.append('tenantId', tenantId);
      }
      
      // Add any other params passed in
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value);
        }
      });
      
      // Build the URL with query parameters
      const url = `/api/hr/employees?${queryParams.toString()}`;
      
      // Prepare headers including tenant ID
      const headers = {};
      if (tenantId) {
        headers['X-Tenant-ID'] = tenantId;
      }
      
      // Make the authenticated request with tenant headers
      const response = await fetchWithAuth(url, { headers });
      
      // If response is not ok, handle different error types
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(`API error: ${response.status} ${response.statusText}`);
        error.status = response.status;
        error.data = errorData;
        
        // Enhanced error handling for 403 errors
        if (response.status === 403) {
          logger.error('[EmployeeApi] 403 Forbidden error:', errorData);
          
          // Check for tenant context issues
          if (errorData.detail && errorData.detail.includes('tenant')) {
            error.message = 'Tenant access forbidden. Please verify your tenant permissions.';
            error.isTenantError = true;
          } else {
            error.message = 'Permission denied. You do not have access to employee data.';
            error.isPermissionError = true;
          }
          
          // Try to help diagnose the issue
          logger.debug('[EmployeeApi] 403 Error debug info:', {
            tenantId,
            headers: headers,
            url,
            errorData
          });
        }
        
        throw error;
      }
      
      // Parse and return the data
      const data = await response.json();
      return data;
    } catch (error) {
      logger.error('[EmployeeApi] Error fetching employees:', error);
      
      // Rethrow with enhanced error info for UI display
      if (error.status === 403) {
        const enhancedError = new Error(error.message || 'Permission denied accessing employee data');
        enhancedError.status = 403;
        enhancedError.isPermissionError = true;
        enhancedError.data = error.data;
        throw enhancedError;
      }
      
      throw error;
    }
  },
  
  async getCurrent() {
    // Get the current user's employee information using the custom:employeeid attribute
    return fetchWithAuth('/api/hr/api/me/');
  },
  
  async getById(id) {
    return fetchWithAuth(`/api/hr/employees/${id}/`);
  },
  
  async create(data, params = {}) {
    try {
      const tenantId = await getTenantId();
      const headers = {
        'X-Tenant-ID': tenantId,
        'X-Schema-Name': `tenant_${tenantId.replace(/-/g, '_')}`
      };
      
      const response = await backendHrApiInstance.post('/employees', data, {
        headers,
        params: { ...params, tenantId }
      });
      
      return response.data;
    } catch (error) {
      logger.error('[EmployeeApi] Error creating employee:', error);
      throw error;
    }
  },
  
  async update(id, data, params = {}) {
    try {
      const tenantId = await getTenantId();
      const headers = {
        'X-Tenant-ID': tenantId,
        'X-Schema-Name': `tenant_${tenantId.replace(/-/g, '_')}`
      };
      
      const response = await backendHrApiInstance.put(`/employees/${id}`, data, {
        headers,
        params: { ...params, tenantId }
      });
      
      return response.data;
    } catch (error) {
      logger.error(`[EmployeeApi] Error updating employee ${id}:`, error);
      throw error;
    }
  },
  
  async delete(id, params = {}) {
    try {
      const tenantId = await getTenantId();
      const headers = {
        'X-Tenant-ID': tenantId,
        'X-Schema-Name': `tenant_${tenantId.replace(/-/g, '_')}`
      };
      
      const response = await backendHrApiInstance.delete(`/employees/${id}`, {
        headers,
        params: { ...params, tenantId }
      });
      
      return response.data;
    } catch (error) {
      logger.error(`[EmployeeApi] Error deleting employee ${id}:`, error);
      throw error;
    }
  }
};

// Service related API methods
export const serviceApi = {
  async getAll(params = {}) {
    try {
      const tenantId = await getTenantId();
      if (!tenantId) {
        logger.error('[ServiceApi] No tenant ID available for service fetch');
        throw new Error('No tenant ID available. Please refresh the page or log in again.');
      }
      
      return await apiClient.get('/api/services', {
        ...params,
        tenantId
      });
    } catch (error) {
      logger.error('[ServiceApi] Error fetching services:', error);
      throw error;
    }
  },
  
  async getById(id, params = {}) {
    try {
      return await apiClient.get(`/api/services/${id}`, params);
    } catch (error) {
      logger.error(`[ServiceApi] Error fetching service ${id}:`, error);
      throw error;
    }
  },
  
  async create(data, params = {}) {
    try {
      return await apiClient.post('/api/services', data, params);
    } catch (error) {
      logger.error('[ServiceApi] Error creating service:', error);
      throw error;
    }
  },
  
  async update(id, data, params = {}) {
    try {
      return await apiClient.put(`/api/services/${id}`, data, params);
    } catch (error) {
      logger.error(`[ServiceApi] Error updating service ${id}:`, error);
      throw error;
    }
  },
  
  async delete(id, params = {}) {
    try {
      return await apiClient.delete(`/api/services/${id}`, params);
    } catch (error) {
      logger.error(`[ServiceApi] Error deleting service ${id}:`, error);
      throw error;
    }
  }
};

// Invoice related API methods
export const invoiceApi = {
  async getAll(params = {}) {
    try {
      const tenantId = await getTenantId();
      if (!tenantId) {
        logger.error('[InvoiceApi] No tenant ID available for invoice fetch');
        throw new Error('No tenant ID available. Please refresh the page or log in again.');
      }
      
      return await apiClient.get('/api/invoices', {
        ...params,
        tenantId
      });
    } catch (error) {
      logger.error('[InvoiceApi] Error fetching invoices:', error);
      throw error;
    }
  },
  
  async getById(id, params = {}) {
    try {
      return await apiClient.get(`/api/invoices/${id}`, params);
    } catch (error) {
      logger.error(`[InvoiceApi] Error fetching invoice ${id}:`, error);
      throw error;
    }
  },
  
  async create(data, params = {}) {
    try {
      return await apiClient.post('/api/invoices', data, params);
    } catch (error) {
      logger.error('[InvoiceApi] Error creating invoice:', error);
      throw error;
    }
  },
  
  async update(id, data, params = {}) {
    try {
      return await apiClient.put(`/api/invoices/${id}`, data, params);
    } catch (error) {
      logger.error(`[InvoiceApi] Error updating invoice ${id}:`, error);
      throw error;
    }
  },
  
  async delete(id, params = {}) {
    try {
      return await apiClient.delete(`/api/invoices/${id}`, params);
    } catch (error) {
      logger.error(`[InvoiceApi] Error deleting invoice ${id}:`, error);
      throw error;
    }
  },
  
  async generatePdf(id, params = {}) {
    try {
      return await apiClient.get(`/api/invoices/${id}/pdf`, {
        ...params,
        responseType: 'blob'
      });
    } catch (error) {
      logger.error(`[InvoiceApi] Error generating PDF for invoice ${id}:`, error);
      throw error;
    }
  },
  
  async sendEmail(id, data = {}, params = {}) {
    try {
      return await apiClient.post(`/api/invoices/${id}/email`, data, params);
    } catch (error) {
      logger.error(`[InvoiceApi] Error sending email for invoice ${id}:`, error);
      throw error;
    }
  }
};

// Customer related API methods - Using Django REST API
export const customerApi = {
  async getAll(params = {}) {
    // Use local proxy endpoint that handles authentication server-side
    const response = await fetch('/api/crm/customers', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `HTTP ${response.status}`);
    }
    
    return response.json();
  },
  
  async getById(id, params = {}) {
    const response = await fetch(`/api/crm/customers/${id}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `HTTP ${response.status}`);
    }
    
    return response.json();
  },
  
  async create(data, params = {}) {
    logger.info('[CustomerApi] Creating customer with data:', data);
    
    const response = await fetch('/api/crm/customers', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `HTTP ${response.status}`);
    }
    
    const result = await response.json();
    logger.info('[CustomerApi] Customer created successfully:', result);
    return result;
  },
  
  async update(id, data, params = {}) {
    const response = await fetch(`/api/crm/customers/${id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `HTTP ${response.status}`);
    }
    
    return response.json();
  },
  
  async delete(id, params = {}) {
    const response = await fetch(`/api/crm/customers/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `HTTP ${response.status}`);
    }
    
    return response.json();
  }
};

// Supplier related API methods - Using local proxy pattern (industry standard)
export const supplierApi = {
  async getAll(params = {}) {
    // Use local proxy endpoint that handles authentication server-side
    const response = await fetch('/api/inventory/suppliers', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `HTTP ${response.status}`);
    }
    
    return response.json();
  },
  
  async getById(id, params = {}) {
    const response = await fetch(`/api/inventory/suppliers/${id}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `HTTP ${response.status}`);
    }
    
    return response.json();
  },
  
  async create(data, params = {}) {
    logger.info('[SupplierApi] Creating supplier with data:', data);
    
    const response = await fetch('/api/inventory/suppliers', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `HTTP ${response.status}`);
    }
    
    const result = await response.json();
    logger.info('[SupplierApi] Supplier created successfully:', result);
    return result;
  },
  
  async update(id, data, params = {}) {
    const response = await fetch(`/api/inventory/suppliers/${id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `HTTP ${response.status}`);
    }
    
    return response.json();
  },
  
  async delete(id, params = {}) {
    const response = await fetch(`/api/inventory/suppliers/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `HTTP ${response.status}`);
    }
    
    return response.json();
  }
};

// Tax related API methods
export const taxApi = {
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

/**
 * Create an axios instance with authentication headers
 * @returns {Promise<import('axios').AxiosInstance>} - The axios instance
 */
export const createAxiosInstance = async () => {
  // Create axios instance
  const instance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  // Add request interceptor to add auth headers
  instance.interceptors.request.use(
    async (config) => {
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );
  
  // Add response interceptor to handle token refresh
  instance.interceptors.response.use(
    (response) => {
      return response;
    },
    async (error) => {
      return Promise.reject(error);
    }
  );
  
  return instance;
};

/**
 * Get an axios instance with authentication headers
 * @returns {Promise<import('axios').AxiosInstance>} - The axios instance
 */
export const getApiClient = async () => {
  return await createAxiosInstance();
}; 