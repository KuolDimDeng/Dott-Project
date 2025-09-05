import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://staging.dottapps.com/api';

// Create axios instance with auth headers
const createApiInstance = async () => {
  const sessionId = await AsyncStorage.getItem('sessionId');
  
  return axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionId ? `sid=${sessionId}` : '',
    },
    withCredentials: true,
  });
};

export const driverApi = {
  // Register business (including driver business)
  registerBusiness: async (data) => {
    try {
      const api = await createApiInstance();
      const response = await api.post('/drivers/drivers/register/', data);
      return response.data;
    } catch (error) {
      console.error('Business registration error:', error);
      throw error;
    }
  },

  // Update driver status (online/offline)
  updateStatus: async (status, location = null) => {
    try {
      const api = await createApiInstance();
      const data = { availability_status: status };
      
      if (location) {
        data.current_latitude = location.latitude;
        data.current_longitude = location.longitude;
      }
      
      const response = await api.post('/drivers/drivers/update_status/', data);
      return response.data;
    } catch (error) {
      console.error('Update status error:', error);
      throw error;
    }
  },

  // Get driver dashboard
  getDashboard: async () => {
    try {
      const api = await createApiInstance();
      const response = await api.get('/drivers/drivers/dashboard/');
      return response.data;
    } catch (error) {
      console.error('Dashboard error:', error);
      throw error;
    }
  },

  // Get available deliveries
  getAvailableDeliveries: async () => {
    try {
      const api = await createApiInstance();
      const response = await api.get('/drivers/deliveries/?status=pending');
      return response.data;
    } catch (error) {
      console.error('Get deliveries error:', error);
      throw error;
    }
  },

  // Accept delivery
  acceptDelivery: async (deliveryId, data = {}) => {
    try {
      const api = await createApiInstance();
      const response = await api.post(`/drivers/deliveries/${deliveryId}/accept/`, data);
      return response.data;
    } catch (error) {
      console.error('Accept delivery error:', error);
      throw error;
    }
  },

  // Update delivery status
  updateDeliveryStatus: async (deliveryId, status, data = {}) => {
    try {
      const api = await createApiInstance();
      const response = await api.post(`/drivers/deliveries/${deliveryId}/update_status/`, {
        status,
        ...data,
      });
      return response.data;
    } catch (error) {
      console.error('Update delivery status error:', error);
      throw error;
    }
  },

  // Add tracking point
  addTracking: async (deliveryId, location) => {
    try {
      const api = await createApiInstance();
      const response = await api.post(`/drivers/deliveries/${deliveryId}/add_tracking/`, {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        speed_kmh: location.speed * 3.6, // Convert m/s to km/h
        heading: location.heading,
      });
      return response.data;
    } catch (error) {
      console.error('Add tracking error:', error);
      throw error;
    }
  },

  // Get delivery tracking
  getTracking: async (deliveryId) => {
    try {
      const api = await createApiInstance();
      const response = await api.get(`/drivers/deliveries/${deliveryId}/tracking/`);
      return response.data;
    } catch (error) {
      console.error('Get tracking error:', error);
      throw error;
    }
  },

  // Get earnings
  getEarnings: async () => {
    try {
      const api = await createApiInstance();
      const response = await api.get('/drivers/earnings/');
      return response.data;
    } catch (error) {
      console.error('Get earnings error:', error);
      throw error;
    }
  },

  // Request payout
  requestPayout: async () => {
    try {
      const api = await createApiInstance();
      const response = await api.post('/drivers/earnings/request_payout/');
      return response.data;
    } catch (error) {
      console.error('Request payout error:', error);
      throw error;
    }
  },

  // Mark delivery as picked up
  markPickedUp: async (deliveryId) => {
    return driverApi.updateDeliveryStatus(deliveryId, 'package_picked');
  },

  // Mark delivery as completed
  markDelivered: async (deliveryId, proof = {}) => {
    return driverApi.updateDeliveryStatus(deliveryId, 'delivered', proof);
  },

  // Get driver profile
  getProfile: async () => {
    try {
      const api = await createApiInstance();
      const response = await api.get('/drivers/drivers/me/');
      return response.data;
    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  },

  // Update driver profile
  updateProfile: async (data) => {
    try {
      const api = await createApiInstance();
      const response = await api.patch('/drivers/drivers/me/', data);
      return response.data;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  },

  // Get notifications
  getNotifications: async () => {
    try {
      const api = await createApiInstance();
      const response = await api.get('/drivers/notifications/');
      return response.data;
    } catch (error) {
      console.error('Get notifications error:', error);
      throw error;
    }
  },

  // Mark notification as read
  markNotificationRead: async (notificationId) => {
    try {
      const api = await createApiInstance();
      const response = await api.post(`/drivers/notifications/${notificationId}/read/`);
      return response.data;
    } catch (error) {
      console.error('Mark notification read error:', error);
      throw error;
    }
  },

  // Find nearby drivers (for consumers)
  findNearbyDrivers: async (location, radius = 10) => {
    try {
      const api = await createApiInstance();
      const response = await api.post('/drivers/nearby/find/', {
        latitude: location.latitude,
        longitude: location.longitude,
        radius_km: radius,
      });
      return response.data;
    } catch (error) {
      console.error('Find nearby drivers error:', error);
      throw error;
    }
  },

  // Request delivery (for consumers)
  requestDelivery: async (data) => {
    try {
      const api = await createApiInstance();
      const response = await api.post('/drivers/deliveries/', data);
      return response.data;
    } catch (error) {
      console.error('Request delivery error:', error);
      throw error;
    }
  },
};