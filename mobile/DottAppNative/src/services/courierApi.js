import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ENV from '../config/environment';

const API_BASE_URL = ENV.apiUrl;

// Create axios instance with auth headers
const createApiInstance = async () => {
  const sessionId = await AsyncStorage.getItem('sessionId');
  
  return axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': sessionId ? `Session ${sessionId}` : '',
    },
  });
};

export const courierApi = {
  // Register business (including courier business)
  registerBusiness: async (data) => {
    try {
      const api = await createApiInstance();
      const response = await api.post('/couriers/couriers/register/', data);
      return response.data;
    } catch (error) {
      console.error('Business registration error:', error);
      throw error;
    }
  },

  // Update courier status (online/offline)
  updateStatus: async (status, location = null) => {
    try {
      const api = await createApiInstance();
      const data = { availability_status: status };
      
      if (location) {
        data.current_latitude = location.latitude;
        data.current_longitude = location.longitude;
      }
      
      const response = await api.post('/couriers/couriers/update_status/', data);
      return response.data;
    } catch (error) {
      console.error('Update status error:', error);
      throw error;
    }
  },

  // Get courier dashboard
  getDashboard: async () => {
    try {
      const api = await createApiInstance();
      const response = await api.get('/couriers/couriers/dashboard/');
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
      const response = await api.get('/couriers/deliveries/?status=pending');
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
      const response = await api.post(`/couriers/deliveries/${deliveryId}/accept/`, data);
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
      const response = await api.post(`/couriers/deliveries/${deliveryId}/update_status/`, {
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
      const response = await api.post(`/couriers/deliveries/${deliveryId}/add_tracking/`, {
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
      const response = await api.get(`/couriers/deliveries/${deliveryId}/tracking/`);
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
      const response = await api.get('/couriers/earnings/');
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
      const response = await api.post('/couriers/earnings/request_payout/');
      return response.data;
    } catch (error) {
      console.error('Request payout error:', error);
      throw error;
    }
  },

  // Mark delivery as picked up
  markPickedUp: async (deliveryId) => {
    return courierApi.updateDeliveryStatus(deliveryId, 'package_picked');
  },

  // Mark delivery as completed
  markDelivered: async (deliveryId, proof = {}) => {
    return courierApi.updateDeliveryStatus(deliveryId, 'delivered', proof);
  },

  // Get courier profile
  getProfile: async () => {
    try {
      const api = await createApiInstance();
      const response = await api.get('/couriers/couriers/me/');
      return response.data;
    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  },

  // Update courier profile
  updateProfile: async (data) => {
    try {
      const api = await createApiInstance();
      const response = await api.patch('/couriers/couriers/me/', data);
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
      const response = await api.get('/couriers/notifications/');
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
      const response = await api.post(`/couriers/notifications/${notificationId}/read/`);
      return response.data;
    } catch (error) {
      console.error('Mark notification read error:', error);
      throw error;
    }
  },

  // Find nearby couriers (for consumers)
  findNearbyCouriers: async (location, radius = 10) => {
    try {
      const api = await createApiInstance();
      const response = await api.post('/couriers/nearby/find/', {
        latitude: location.latitude,
        longitude: location.longitude,
        radius_km: radius,
      });
      return response.data;
    } catch (error) {
      console.error('Find nearby couriers error:', error);
      throw error;
    }
  },

  // Request delivery (for consumers)
  requestDelivery: async (data) => {
    try {
      const api = await createApiInstance();
      const response = await api.post('/couriers/deliveries/', data);
      return response.data;
    } catch (error) {
      console.error('Request delivery error:', error);
      throw error;
    }
  },
};