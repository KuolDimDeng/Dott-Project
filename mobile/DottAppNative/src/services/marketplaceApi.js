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

// Add auth token to requests (but skip for public consumer endpoints)
api.interceptors.request.use(
  async (config) => {
    // Check if this is a public consumer endpoint that doesn't need auth
    const publicEndpoints = [
      '/marketplace/consumer/businesses/',
      '/marketplace/consumer/categories/',
      '/marketplace/consumer/category_hierarchy/',
      '/marketplace/consumer/businesses/featured/',
      '/marketplace/consumer/featured_items/',
      '/marketplace/consumer/track_view/',
      '/marketplace/business/',  // Add business detail endpoints as public
    ];

    const isPublicEndpoint = publicEndpoints.some(endpoint =>
      config.url && config.url.includes(endpoint)
    );

    if (isPublicEndpoint) {
      // Don't add any auth headers for public marketplace endpoints
      console.log('🌐 Public marketplace endpoint - no auth required:', config.url);
      delete config.headers.Authorization; // Remove any existing auth header
    } else {
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
    }

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

  // Get featured products and menu items
  getFeaturedItems: async (params = {}) => {
    try {
      const response = await api.get('/marketplace/consumer/featured_items/', {
        params: {
          city: params.city,
          country: params.country,
          type: params.type || 'all',  // all, products, menu_items
          limit: params.limit || 20,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching featured items:', error);
      throw error;
    }
  },

  // Track product/menu item view
  trackItemView: async (itemData) => {
    try {
      const response = await api.post('/marketplace/consumer/track_view/', {
        item_id: itemData.itemId,
        item_type: itemData.itemType,  // 'product' or 'menu_item'
        business_id: itemData.businessId,
        view_source: itemData.viewSource || 'featured',
        search_query: itemData.searchQuery || '',
      });
      return response.data;
    } catch (error) {
      console.error('Error tracking item view:', error);
      // Don't throw - tracking shouldn't break the app
      return null;
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
      const response = await api.get(`/marketplace/business/${businessId}/public/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching business details:', error);
      throw error;
    }
  },

  // Alias for getBusinessDetails (for consistency)
  getBusinessDetail: async (businessId) => {
    try {
      const response = await api.get(`/marketplace/business/${businessId}/public/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching business detail:', error);
      throw error;
    }
  },

  // Get products for a business
  getBusinessProducts: async (businessId) => {
    try {
      const response = await api.get(`/marketplace/business/${businessId}/products/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching business products:', error);
      throw error;
    }
  },

  // Get services for a business
  getBusinessServices: async (businessId) => {
    try {
      const response = await api.get(`/marketplace/business/${businessId}/services/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching business services:', error);
      throw error;
    }
  },

  // Check if a business is a placeholder and get its status
  checkPlaceholderStatus: async (businessId) => {
    try {
      const response = await api.get(`/marketplace/placeholder/${businessId}/status/`);
      return response.data;
    } catch (error) {
      console.error('Error checking placeholder status:', error);
      throw error;
    }
  },

  // Send inquiry to placeholder business owner
  sendPlaceholderInquiry: async (data) => {
    try {
      const response = await api.post('/marketplace/placeholder/inquiry/', data);
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
      // Get session for auth
      const sessionId = await AsyncStorage.getItem('sessionId');
      if (!sessionId) {
        console.log('No session available for business status update');
        return null;
      }

      // Use the listing endpoint to update status fields
      const response = await api.patch('/marketplace/business/listing/', {
        is_published: statusData.is_open,
        is_active: statusData.is_open,
        is_open_now: statusData.is_open
      });
      return response.data;
    } catch (error) {
      // Log error details for debugging
      if (error.response?.status === 401) {
        console.log('Auth error updating business status - session may have expired');
      } else {
        console.error('Error updating business status:', error.message);
      }
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

  // Publish business to marketplace (from Advertise feature)
  publishToMarketplace: async (businessData) => {
    try {
      const response = await api.post('/marketplace/business/publish_to_marketplace/', businessData);
      return response.data;
    } catch (error) {
      console.error('Error publishing to marketplace:', error);
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

  // Get current business's marketplace listing
  getMyListing: async () => {
    try {
      const response = await api.get('/marketplace/business/my_listing/');
      return response.data;
    } catch (error) {
      console.error('Error fetching business listing:', error);
      throw error;
    }
  },

  // Update current business's marketplace listing
  updateMyListing: async (data) => {
    try {
      const response = await api.post('/marketplace/business/my_listing/', data);
      return response.data;
    } catch (error) {
      console.error('Error updating business listing:', error);
      throw error;
    }
  },

  // Sync business info from UserProfile to BusinessListing
  syncBusinessInfo: async () => {
    try {
      const response = await api.post('/marketplace/business/sync_business_info/');
      return response.data;
    } catch (error) {
      console.error('Error syncing business info:', error);
      throw error;
    }
  },
};

export default marketplaceApi;