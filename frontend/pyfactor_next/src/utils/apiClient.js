import { apiRequest, invalidateCache } from './apiHelpers';
import { axiosInstance, backendHrApiInstance } from '@/lib/axiosConfig';
import { getTenantId } from './tenantUtils';
import { logger } from './logger';
import axios from 'axios';
import { getAppCacheItem, setAppCacheItem } from '@/utils/appCache';

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
    try {
      // Get tenant ID if available
      const tenantId = await getTenantId();
      if (!tenantId) {
        logger.error('[ProductApi] No tenant ID available for product fetch');
        throw new Error('No tenant ID available. Please refresh the page or log in again.');
      }
      
      // Use the generic API client for product operations
      return await apiClient.get('/api/inventory/products', params);
    } catch (error) {
      logger.error('[ProductApi] Error fetching products:', error);
      throw error;
    }
  },
  
  async getById(id, params = {}) {
    try {
      return await apiClient.get(`/api/inventory/products/${id}`, params);
    } catch (error) {
      logger.error(`[ProductApi] Error fetching product ${id}:`, error);
      throw error;
    }
  },
  
  async create(data, params = {}) {
    try {
      return await apiClient.post('/api/inventory/products', data, params);
    } catch (error) {
      logger.error('[ProductApi] Error creating product:', error);
      throw error;
    }
  },
  
  async update(id, data, params = {}) {
    try {
      const tenantId = await getTenantId();
      const headers = {
        'X-Tenant-ID': tenantId,
        'X-Schema-Name': `tenant_${tenantId.replace(/-/g, '_')}`,
        'Content-Type': 'application/json'
      };
      
      // Log the request for debugging
      logger.debug(`[EmployeeApi] Updating employee ${id} with data:`, data);
      
      // Ensure the URL has a trailing slash to match Django's URL patterns
      const url = `/employees/${id}/`;
      
      const response = await backendHrApiInstance.put(url, data, {
        headers,
        params: { ...params, tenantId }
      });
      
      return response.data;
    } catch (error) {
      logger.error(`[EmployeeApi] Error updating employee ${id}:`, error);
      
      // Add more detailed error logging
      if (error.response) {
        logger.error(`[EmployeeApi] Response status: ${error.response.status}`);
        logger.error(`[EmployeeApi] Response data:`, error.response.data);
        logger.error(`[EmployeeApi] Response headers:`, error.response.headers);
      } else if (error.request) {
        logger.error(`[EmployeeApi] No response received:`, error.request);
      } else {
        logger.error(`[EmployeeApi] Error message: ${error.message}`);
      }
      
      throw error;
    }
  },
  
  async delete(id, params = {}) {
    try {
      return await apiClient.delete(`/api/inventory/products/${id}`, params);
    } catch (error) {
      logger.error(`[ProductApi] Error deleting product ${id}:`, error);
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
      // Clear cache for employee endpoints if specified
      if (params.bypassCache || params.skipCache || params.cache === false) {
        invalidateCache('/api/hr/employees');
        logger.debug('[EmployeeApi] Invalidated cache before getAll request');
      }
      
      // Check if mock mode is explicitly requested
      const useMock = params.mock === true || params.useMock === true;
      
      // If mock mode is requested, use the simplified local API route
      if (useMock) {
        logger.warn('[EmployeeApi] Mock API mode is now deprecated and disabled');
      }
      
      // Get tenant ID if available - ensure we have a valid tenant ID
      const tenantId = await getTenantId();
      if (!tenantId) {
        logger.error('[EmployeeApi] No tenant ID available for employee fetch');
        throw new Error('No tenant ID available. Please refresh the page or log in again.');
      }
      
      // Prepare robust headers with tenant ID in multiple formats
      const headers = {
        'X-Tenant-ID': tenantId,
        'x-tenant-id': tenantId,
        'X-Business-ID': tenantId,
        'X-Schema-Name': `tenant_${tenantId.replace(/-/g, '_')}`, // Format schema name for backend
        'X-Requires-Auth': 'true'
      };
      
      // Add authentication headers from APP_CACHE
      let authToken = null;
      if (typeof window !== 'undefined' && window.__APP_CACHE?.auth?.token) {
        authToken = window.__APP_CACHE.auth.token;
        headers.Authorization = `Bearer ${authToken}`;
        logger.debug('[EmployeeApi] Using auth token from APP_CACHE for employee list');
      } else {
        // Try to fetch fresh token from Amplify if not in cache
        try {
          const { fetchAuthSession } = await import('aws-amplify/auth');
          const session = await fetchAuthSession();
          if (session?.tokens?.idToken) {
            authToken = session.tokens.idToken.toString();
            headers.Authorization = `Bearer ${authToken}`;
            logger.debug('[EmployeeApi] Using fresh token from Amplify for employee list');
          }
        } catch (tokenError) {
          logger.warn('[EmployeeApi] Unable to get auth token from Amplify:', tokenError.message);
        }
      }
      
      // Add cache busting parameter
      const queryParams = {
        ...params,
        _t: Date.now(), // Add timestamp to prevent caching
        tenantId // Add tenant ID to query params as well for maximum compatibility
      };
      
      // Debug request information before sending
      console.log('[EmployeeApi DEBUG] Attempting to fetch employees with:');
      console.log('- Base URL:', backendHrApiInstance.defaults.baseURL);
      console.log('- Tenant ID:', tenantId);
      console.log('- Has Auth Token:', !!authToken);
      console.log('- Query Params:', JSON.stringify(queryParams));
      
      // Use direct backend HR API instance with enhanced retry configuration
      const response = await backendHrApiInstance.get('/employees', {
        headers,
        params: queryParams,
        timeout: 15000, // Increased timeout
        retry: 3,       // Enable retries
        retryDelay: 1000
      });
      
      // If the response has data but it's empty, log a specific message
      if (response.data && Array.isArray(response.data) && response.data.length === 0) {
        logger.warn('[EmployeeApi] Employee list is empty. This might be expected or could indicate an issue.');
      } else {
        logger.debug(`[EmployeeApi] Retrieved ${response.data?.length || 0} employees`);
      }
      
      // Return the full response object to maintain compatibility with components
      // that expect response.data structure
      return response;
    } catch (error) {
      // Detailed error logging
      logger.error('[EmployeeApi] Error fetching employees:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        config: error.config
      });
      
      // Enhanced debugging for permission errors
      if (error.response?.status === 403) {
        console.error('[EmployeeApi DEBUG] Permission denied (403):', error.message);
        console.error('Possible causes:');
        console.error('1. Missing or invalid tenant ID in request headers');
        console.error('2. Token lacks necessary permissions or is expired');
        console.error('3. Backend tenant isolation preventing access');
      }
      
      // Enhanced debugging for SSL errors
      if (error.code === 'EPROTO' || error.message?.includes('SSL')) {
        console.error('[EmployeeApi DEBUG] SSL/TLS Error:', error.message);
        console.error('Possible solutions:');
        console.error('1. Check if BACKEND_API_URL is set to the correct protocol (http vs https)');
        console.error('2. For local development, ensure the backend server has a valid certificate');
        console.error('3. Try changing BACKEND_API_URL from https:// to http:// in .env.local');
      }
      
      throw error;
    }
  },
  
  async getById(id, params = {}) {
    try {
      const tenantId = await getTenantId();
      const headers = {
        'X-Tenant-ID': tenantId,
        'X-Schema-Name': `tenant_${tenantId.replace(/-/g, '_')}`
      };
      
      const response = await backendHrApiInstance.get(`/employees/${id}`, {
        headers,
        params: { ...params, tenantId }
      });
      
      return response.data;
    } catch (error) {
      logger.error(`[EmployeeApi] Error fetching employee ${id}:`, error);
      throw error;
    }
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

// Customer related API methods
export const customerApi = {
  async getAll(params = {}) {
    try {
      const tenantId = await getTenantId();
      if (!tenantId) {
        logger.error('[CustomerApi] No tenant ID available for customer fetch');
        throw new Error('No tenant ID available. Please refresh the page or log in again.');
      }
      
      return await apiClient.get('/api/customers', {
        ...params,
        tenantId
      });
    } catch (error) {
      logger.error('[CustomerApi] Error fetching customers:', error);
      throw error;
    }
  },
  
  async getById(id, params = {}) {
    try {
      return await apiClient.get(`/api/customers/${id}`, params);
    } catch (error) {
      logger.error(`[CustomerApi] Error fetching customer ${id}:`, error);
      throw error;
    }
  },
  
  async create(data, params = {}) {
    try {
      return await apiClient.post('/api/customers', data, params);
    } catch (error) {
      logger.error('[CustomerApi] Error creating customer:', error);
      throw error;
    }
  },
  
  async update(id, data, params = {}) {
    try {
      return await apiClient.put(`/api/customers/${id}`, data, params);
    } catch (error) {
      logger.error(`[CustomerApi] Error updating customer ${id}:`, error);
      throw error;
    }
  },
  
  async delete(id, params = {}) {
    try {
      return await apiClient.delete(`/api/customers/${id}`, params);
    } catch (error) {
      logger.error(`[CustomerApi] Error deleting customer ${id}:`, error);
      throw error;
    }
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