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
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const userApi = {
  // Get current user profile with all fields including role and has_business
  getCurrentUser: async () => {
    try {
      const response = await api.get('/users/me/');
      return response.data;
    } catch (error) {
      console.error('Error fetching current user:', error);
      throw error;
    }
  },

  // Update user profile
  updateProfile: async (userData) => {
    try {
      const response = await api.patch('/users/me/', userData);
      return response.data;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  },

  // Get user business status and role
  getUserBusinessStatus: async () => {
    try {
      const response = await api.get('/users/business-features/');
      return response.data;
    } catch (error) {
      console.error('Error fetching user business status:', error);
      throw error;
    }
  }
};

export default userApi;