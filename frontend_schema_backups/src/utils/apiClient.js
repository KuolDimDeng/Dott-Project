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
    return apiClient.get('/products', params);
  },
  
  async getById(id, params = {}) {
    return apiClient.get(`/products/${id}`, params);
  },
  
  async create(data, params = {}) {
    return apiClient.post('/products', data, params);
  },
  
  async update(id, data, params = {}) {
    return apiClient.put(`/products/${id}`, data, params);
  },
  
  async delete(id, params = {}) {
    return apiClient.delete(`/products/${id}`, params);
  },
  
  async getHealth() {
    return apiClient.get('/api/health');
  }
};

// Specific API methods for services
export const serviceApi = {
  async getAll(params = {}) {
    return apiClient.get('/services', params);
  },
  
  async getById(id, params = {}) {
    return apiClient.get(`/services/${id}`, params);
  },
  
  async create(data, params = {}) {
    return apiClient.post('/services', data, params);
  },
  
  async update(id, data, params = {}) {
    return apiClient.put(`/services/${id}`, data, params);
  },
  
  async delete(id, params = {}) {
    return apiClient.delete(`/services/${id}`, params);
  }
};

// Specific API methods for customers
export const customerApi = {
  async getAll(params = {}) {
    return apiClient.get('/customers', params);
  },
  
  async getById(id, params = {}) {
    return apiClient.get(`/customers/${id}`, params);
  },
  
  async create(data, params = {}) {
    return apiClient.post('/customers', data, params);
  },
  
  async update(id, data, params = {}) {
    return apiClient.put(`/customers/${id}`, data, params);
  },
  
  async delete(id, params = {}) {
    return apiClient.delete(`/customers/${id}`, params);
  }
};

// Specific API methods for invoices
export const invoiceApi = {
  async getAll(params = {}) {
    return apiClient.get('/invoices', params);
  },
  
  async getById(id, params = {}) {
    return apiClient.get(`/invoices/${id}`, params);
  },
  
  async create(data, params = {}) {
    return apiClient.post('/invoices', data, params);
  },
  
  async update(id, data, params = {}) {
    return apiClient.put(`/invoices/${id}`, data, params);
  },
  
  async delete(id, params = {}) {
    return apiClient.delete(`/invoices/${id}`, params);
  }
}; 