import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ENV from '../config/environment';
import SecureStorage from './secureStorage';

const API_URL = ENV.apiUrl;

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add session
api.interceptors.request.use(
  async (config) => {
    const sessionId = await SecureStorage.getSecureItem('sessionId');
    if (sessionId) {
      // Use Authorization header for mobile app (cookies don't work in React Native)
      config.headers['Authorization'] = `Session ${sessionId}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Clear session and redirect to login
      await SecureStorage.removeSecureItem('sessionId');
      await SecureStorage.removeSecureItem('sessionToken');
      await SecureStorage.removeSecureItem('userData');
      await AsyncStorage.removeItem('userMode');
      // You might want to emit an event here to trigger navigation to login
    }
    return Promise.reject(error);
  }
);

export default api;