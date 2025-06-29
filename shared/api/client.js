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
    
    console.log('API Request:', {
      url,
      method: options.method || 'GET',
      baseURL: this.baseURL,
      endpoint
    });
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      // React Native doesn't support credentials: 'include'
      const fetchOptions = {
        ...options,
        headers,
      };
      
      // Only add credentials for web environment
      if (typeof window !== 'undefined' && window.document) {
        fetchOptions.credentials = 'include';
      }
      
      const response = await fetch(url, fetchOptions);

      const contentType = response.headers.get('content-type');
      console.log('Response:', {
        status: response.status,
        contentType,
        url: response.url
      });

      if (!response.ok) {
        let error;
        if (contentType && contentType.includes('application/json')) {
          error = await response.json();
        } else {
          const text = await response.text();
          console.error('Non-JSON response:', text.substring(0, 200));
          error = { message: 'Server returned non-JSON response' };
        }
        throw new Error(error.message || `HTTP error! status: ${response.status}`);
      }

      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        const text = await response.text();
        console.error('Expected JSON but got:', text.substring(0, 200));
        throw new Error('Expected JSON response but got HTML/text');
      }
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
    // Your backend uses session-based auth, not token-based
    // First, we need to get CSRF token or use the session endpoint
    const response = await apiClient.post('/api/auth/session-v2', {
      email: credentials.email,
      password: credentials.password,
      action: 'login'
    });
    return response;
  },
  logout: async () => {
    return apiClient.delete('/api/auth/session-v2');
  },
  getSession: async () => {
    return apiClient.get('/api/auth/session-v2');
  },
  refreshSession: async () => {
    return apiClient.post('/api/auth/session-v2', { action: 'refresh' });
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