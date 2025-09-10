import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ENV from '../config/environment';

const API_BASE_URL = ENV.apiUrl;

// Create axios instance with default config
const createApiInstance = async () => {
  const sessionId = await AsyncStorage.getItem('sessionId');
  
  return axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': sessionId ? `Session ${sessionId}` : '',
    },
    // Remove withCredentials as it's not needed for mobile apps
  });
};

export const businessApi = {
  // Register a new business (general, not just courier)
  registerBusiness: async (data) => {
    try {
      const api = await createApiInstance();
      
      // Map frontend data to backend format
      const requestData = {
        // Basic business info
        business_name: data.business_name,
        business_type: data.business_type,
        entity_type: data.entity_type,
        
        // Registration info
        registration_status: data.registration_status,
        registration_number: data.registration_number || '',
        
        // Contact info
        phone: data.phone,
        email: data.email,
        address: data.address,
        city: data.city,
        business_country: data.country || 'SS', // Default to South Sudan
        
        // Additional features
        offers_courier_services: data.offers_courier_services || false,
      };
      
      // If offering courier services, we'll need to make a separate call
      // to register as a courier after business creation
      const businessResponse = await api.post('/users/business/register/', requestData);
      
      // If courier services are offered, register as courier too
      if (data.offers_courier_services && data.courier_data) {
        try {
          const courierData = {
            ...requestData,
            ...data.courier_data,
            business_id: businessResponse.data.data.business_id,
          };
          await api.post('/couriers/couriers/register/', courierData);
        } catch (courierError) {
          console.warn('Courier registration failed, but business was created:', courierError);
          // Don't fail the whole registration if courier part fails
        }
      }
      
      return businessResponse.data;
    } catch (error) {
      console.error('Business registration error:', error);
      throw error;
    }
  },
  
  // Get business details
  getBusinessDetails: async () => {
    try {
      const api = await createApiInstance();
      const response = await api.get('/users/business/details/');
      return response.data;
    } catch (error) {
      console.error('Get business details error:', error);
      throw error;
    }
  },
  
  // Update business details
  updateBusiness: async (data) => {
    try {
      const api = await createApiInstance();
      // Try the business/update endpoint first (with trailing slash)
      const response = await api.patch('/users/business/update/', data);
      return response.data;
    } catch (error) {
      console.error('Update business error:', error);
      // If that fails, try the details/update endpoint
      if (error.response?.status === 404) {
        try {
          const api = await createApiInstance();
          const response = await api.patch('/users/business/details/update/', data);
          return response.data;
        } catch (fallbackError) {
          console.error('Fallback update business error:', fallbackError);
          throw fallbackError;
        }
      }
      throw error;
    }
  },
  
  // Check business status
  checkBusinessStatus: async () => {
    try {
      const api = await createApiInstance();
      const response = await api.get('/users/business/check-status/');
      return response.data;
    } catch (error) {
      console.error('Check business status error:', error);
      throw error;
    }
  },
};

export default businessApi;