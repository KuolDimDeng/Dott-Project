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
  getFeaturedBusinesses: async (location) => {
    try {
      const params = typeof location === 'string' 
        ? { city: location }  // Backward compatibility
        : { 
            city: location.city,
            country: location.country,
          };
      
      const response = await api.get('/marketplace/consumer/businesses/featured/', {
        params,
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

  // Check if a business is a placeholder and get its status
  checkPlaceholderStatus: async (businessId) => {
    try {
      const response = await api.get(`/api/marketplace/placeholder/${businessId}/status/`);
      return response.data;
    } catch (error) {
      console.error('Error checking placeholder status:', error);
      throw error;
    }
  },

  // Send inquiry to placeholder business owner
  sendPlaceholderInquiry: async (data) => {
    try {
      const response = await api.post('/api/marketplace/placeholder/inquiry/', data);
      return response.data;
    } catch (error) {
      console.error('Error sending placeholder inquiry:', error);
      throw error;
    }
  },

  // Business owner functions for managing marketplace listing
  
  // Update business status (Open/Closed)
  updateBusinessStatus: async (statusData) => {
    try {
      const response = await api.patch('/marketplace/business/status/', statusData);
      return response.data;
    } catch (error) {
      console.error('Error updating business status:', error);
      // Don't throw error, just log it - status update is not critical
      return null;
    }
  },

  // Update business products from menu
  updateBusinessProducts: async (menuItems) => {
    try {
      const response = await api.post('/marketplace/business/sync-products/', {
        menu_items: menuItems
      });
      return response.data;
    } catch (error) {
      console.error('Error syncing products to marketplace:', error);
      throw error;
    }
  },

  // Update business listing details
  updateBusinessListing: async (listingData) => {
    try {
      const response = await api.patch('/marketplace/business/listing/', listingData);
      return response.data;
    } catch (error) {
      console.error('Error updating business listing:', error);
      throw error;
    }
  },

  // Get business listing for editing
  getBusinessListing: async () => {
    try {
      const response = await api.get('/marketplace/business/listing/');
      return response.data;
    } catch (error) {
      console.error('Error fetching business listing:', error);
      throw error;
    }
  },

  // Update business subcategories
  updateBusinessSubcategories: async (subcategories) => {
    try {
      const response = await api.patch('/marketplace/business/subcategories/', {
        subcategories: subcategories
      });
      return response.data;
    } catch (error) {
      console.error('Error updating business subcategories:', error);
      throw error;
    }
  },

  // Update business operating hours
  updateOperatingHours: async (operatingHours) => {
    try {
      const response = await api.patch('/marketplace/business/operating-hours/', {
        operating_hours: operatingHours
      });
      return response.data;
    } catch (error) {
      console.error('Error updating operating hours:', error);
      throw error;
    }
  },

  // Get business analytics
  getBusinessAnalytics: async () => {
    try {
      const response = await api.get('/marketplace/business/analytics/');
      return response.data;
    } catch (error) {
      console.error('Error fetching business analytics:', error);
      return {
        views: 0,
        clicks: 0,
        orders: 0,
        revenue: 0
      };
    }
  },
};

export default marketplaceApi;