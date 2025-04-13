import { apiRequest } from './apiHelpers';
import { axiosInstance } from '@/lib/axiosConfig';
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
    return apiClient.get('/api/crm/customers', params);
  },
  
  async getById(id, params = {}) {
    return apiClient.get(`/api/crm/customers/${id}`, params);
  },
  
  async create(data, params = {}) {
    return apiClient.post('/api/crm/customers', data, params);
  },
  
  async update(id, data, params = {}) {
    return apiClient.put(`/api/crm/customers/${id}`, data, params);
  },
  
  async delete(id, params = {}) {
    return apiClient.delete(`/api/crm/customers/${id}`, params);
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