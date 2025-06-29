// Check environment and use appropriate env variable
const getApiUrl = () => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env.NEXT_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_URL || 'https://api.dottapps.com';
  }
  return 'https://api.dottapps.com';
};

const API_BASE_URL = getApiUrl();

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = null;
  }

  setToken(token) {
    this.token = token;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();

export const authApi = {
  login: async (credentials) => {
    return apiClient.post('/api/auth/login', credentials);
  },
  logout: async () => {
    return apiClient.post('/api/auth/logout');
  },
  getSession: async () => {
    return apiClient.get('/api/auth/session-v2');
  },
  refreshSession: async () => {
    return apiClient.post('/api/auth/session-v2');
  },
};

export const invoiceApi = {
  getAll: async (params) => {
    return apiClient.get('/api/invoices', params);
  },
  getById: async (id) => {
    return apiClient.get(`/api/invoices/${id}`);
  },
  create: async (data) => {
    return apiClient.post('/api/invoices', data);
  },
  update: async (id, data) => {
    return apiClient.put(`/api/invoices/${id}`, data);
  },
  delete: async (id) => {
    return apiClient.delete(`/api/invoices/${id}`);
  },
};

export const customerApi = {
  getAll: async (params) => {
    return apiClient.get('/api/customers', params);
  },
  getById: async (id) => {
    return apiClient.get(`/api/customers/${id}`);
  },
  create: async (data) => {
    return apiClient.post('/api/customers', data);
  },
  update: async (id, data) => {
    return apiClient.put(`/api/customers/${id}`, data);
  },
  delete: async (id) => {
    return apiClient.delete(`/api/customers/${id}`);
  },
};

export const dashboardApi = {
  getStats: async () => {
    return apiClient.get('/api/dashboard/stats');
  },
  getSalesData: async (period) => {
    return apiClient.get('/api/dashboard/sales', { period });
  },
  getInventoryData: async () => {
    return apiClient.get('/api/dashboard/inventory');
  },
};