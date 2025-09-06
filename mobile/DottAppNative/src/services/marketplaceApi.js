import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ENV from '../config/environment';

const API_BASE_URL = ENV.apiUrl;

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(
  async (config) => {
    // Try to get the session token (used by your backend)
    const sessionId = await AsyncStorage.getItem('sessionId');
    const sessionToken = await AsyncStorage.getItem('sessionToken');
    const authToken = await AsyncStorage.getItem('authToken');
    
    if (sessionId) {
      // Use session ID for backend API calls (as Authorization: Session header)
      config.headers.Authorization = `Session ${sessionId}`;
    } else if (sessionToken) {
      // Fallback to session token if available
      config.headers.Authorization = `Session ${sessionToken}`;
    } else if (authToken) {
      // Fallback to auth token if available
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    
    console.log('🔑 API Request headers:', {
      hasSessionId: !!sessionId,
      hasSessionToken: !!sessionToken,
      hasAuthToken: !!authToken,
      url: config.url
    });
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - clear token and redirect to login
      await AsyncStorage.removeItem('authToken');
      // You might want to trigger a navigation to login here
    }
    return Promise.reject(error);
  }
);

export const marketplaceApi = {
  // Get businesses for marketplace (filtered by city) - Using correct deployed endpoint
  getBusinesses: async (params = {}) => {
    try {
      const response = await api.get('/marketplace/consumer/businesses/', {
        params: {
          city: params.city,
          country: params.country,
          category: params.category,
          main_category: params.mainCategory,
          subcategory: params.subcategory,
          search: params.search,
          page: params.page || 1,
          page_size: params.pageSize || 20,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching businesses:', error);
      throw error;
    }
  },

  // Get categories for user's city - Using correct deployed endpoint
  getCategories: async (city) => {
    try {
      const response = await api.get('/marketplace/consumer/categories/', {
        params: { city },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  },

  // Get category hierarchy with subcategories
  getCategoryHierarchy: async (city) => {
    try {
      const response = await api.get('/marketplace/consumer/category_hierarchy/', {
        params: { city },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching category hierarchy:', error);
      throw error;
    }
  },

  // Get featured businesses for user's city - Using correct deployed endpoint
  getFeaturedBusinesses: async (city) => {
    try {
      const response = await api.get('/marketplace/consumer/businesses/featured/', {
        params: { city },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching featured businesses:', error);
      throw error;
    }
  },

  // Search businesses - Using correct deployed endpoint
  searchBusinesses: async (query, city, category = '') => {
    try {
      const response = await api.get('/marketplace/consumer/businesses/', {
        params: {
          search: query,
          city: city,
          category: category,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error searching businesses:', error);
      throw error;
    }
  },

  // Get business details
  getBusinessDetails: async (businessId) => {
    try {
      const response = await api.get(`/api/marketplace/business/${businessId}/public/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching business details:', error);
      throw error;
    }
  },

  // Get products for a business
  getBusinessProducts: async (businessId) => {
    try {
      const response = await api.get(`/api/marketplace/business/${businessId}/products/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching business products:', error);
      throw error;
    }
  },

  // Get services for a business
  getBusinessServices: async (businessId) => {
    try {
      const response = await api.get(`/api/marketplace/business/${businessId}/services/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching business services:', error);
      throw error;
    }
  },
};

export default marketplaceApi;