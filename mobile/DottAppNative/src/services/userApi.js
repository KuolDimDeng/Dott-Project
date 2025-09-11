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
    
    console.log('🔑 UserAPI Request Interceptor:');
    console.log('  - URL:', config.url);
    console.log('  - Session ID:', sessionId ? sessionId.substring(0, 20) + '...' : 'null');
    console.log('  - Session Token:', sessionToken ? sessionToken.substring(0, 20) + '...' : 'null');
    console.log('  - Auth Token:', authToken ? authToken.substring(0, 20) + '...' : 'null');
    
    if (sessionId) {
      // Use session ID for backend API calls (as Authorization: Session header)
      config.headers.Authorization = `Session ${sessionId}`;
      console.log('  - Using Session ID in Authorization header');
    } else if (sessionToken) {
      // Fallback to session token if available
      config.headers.Authorization = `Session ${sessionToken}`;
      console.log('  - Using Session Token in Authorization header');
    } else if (authToken) {
      // Fallback to auth token if available
      config.headers.Authorization = `Bearer ${authToken}`;
      console.log('  - Using Auth Token in Authorization header');
    } else {
      console.log('  - ⚠️ No authentication token available');
    }
    
    return config;
  },
  (error) => {
    console.error('🔴 UserAPI Request Interceptor Error:', error);
    return Promise.reject(error);
  }
);

export const userApi = {
  // Get current user profile with all fields including role and has_business
  getCurrentUser: async () => {
    try {
      console.log('📡 Fetching user profile from /api/users/me/...');
      const response = await api.get('/api/users/me/');
      console.log('✅ User profile response received:');
      console.log('  - Status:', response.status);
      console.log('  - Data keys:', response.data ? Object.keys(response.data) : 'null');
      console.log('  - Has business field:', 'has_business' in response.data);
      console.log('  - Has business value:', response.data?.has_business);
      console.log('  - Phone number field:', 'phone_number' in response.data);
      console.log('  - Phone number value:', response.data?.phone_number);
      console.log('  - Role field:', 'role' in response.data);
      console.log('  - Role value:', response.data?.role);
      console.log('  - Full data:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching current user:', error.response?.status, error.response?.data || error.message);
      throw error;
    }
  },

  // Update user profile
  updateProfile: async (userData) => {
    try {
      const response = await api.patch('/api/users/me/', userData);
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