import { apiRequest } from './apiHelpers';

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
    return apiClient.get('/api/products', params);
  },
  
  async getById(id, params = {}) {
    return apiClient.get(`/api/products/${id}`, params);
  },
  
  async create(data, params = {}) {
    return apiClient.post('/api/products', data, params);
  },
  
  async update(id, data, params = {}) {
    return apiClient.put(`/api/products/${id}`, data, params);
  },
  
  async delete(id, params = {}) {
    return apiClient.delete(`/api/products/${id}`, params);
  }
};

// Specific API methods for services
export const serviceApi = {
  async getAll(params = {}) {
    return apiClient.get('/api/services', params);
  },
  
  async getById(id, params = {}) {
    return apiClient.get(`/api/services/${id}`, params);
  },
  
  async create(data, params = {}) {
    return apiClient.post('/api/services', data, params);
  },
  
  async update(id, data, params = {}) {
    return apiClient.put(`/api/services/${id}`, data, params);
  },
  
  async delete(id, params = {}) {
    return apiClient.delete(`/api/services/${id}`, params);
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
  async getAll(params = {}) {
    return apiClient.get('/api/invoices', params);
  },
  
  async getById(id, params = {}) {
    return apiClient.get(`/api/invoices/${id}`, params);
  },
  
  async create(data, params = {}) {
    return apiClient.post('/api/invoices', data, params);
  },
  
  async update(id, data, params = {}) {
    return apiClient.put(`/api/invoices/${id}`, data, params);
  },
  
  async delete(id, params = {}) {
    return apiClient.delete(`/api/invoices/${id}`, params);
  }
}; 