// src/components/utils/axiosConfig.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const isIOS = Platform.OS === 'ios';
const baseURL = isIOS ? 'http://localhost:8000' : 'http://10.0.0.75:8000';
const noAuthRequired = ['/api/register/', '/api/token/', '/api/token/refresh/'];

const useApi = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout
});

const getToken = async () => {
  try {
    return await AsyncStorage.getItem('token');
  } catch (error) {
    console.error('Error retrieving token:', error);
    return null;
  }
};

// Request interceptor
useApi.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    const isAuthRequired = !noAuthRequired.some(url => config.url.includes(url));
    
    if (token && isAuthRequired) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    console.log('Outgoing request', { url: config.url, method: config.method });
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
useApi.interceptors.response.use(
  (response) => {
    console.log('Response received', { status: response.status, url: response.config.url });
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response) {
      console.error('Response error:', {
        status: error.response.status,
        data: error.response.data,
        url: originalRequest.url
      });
      
      if (error.response.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        
        try {
          const refreshToken = await AsyncStorage.getItem('refreshToken');
          if (!refreshToken) {
            throw new Error('No refresh token available');
          }
          
          const response = await axios.post(`${baseURL}/api/token/refresh/`, { refresh: refreshToken });
          const newToken = response.data.access;
          
          await AsyncStorage.setItem('token', newToken);
          
          console.log('Token refreshed successfully');
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
          return useApi(originalRequest);
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          // Handle navigation to login screen
          // You might want to use your navigation system here
          // For example: navigation.navigate('Login');
          navigator.navigate('auth/signin');
        }
      }
      
      if (error.response.status === 403) {
        console.warn('Permission denied:', { url: originalRequest.url });
        // Handle permission denied scenario
      }
    } else if (error.request) {
      console.error('No response received:', { url: originalRequest.url });
    } else {
      console.error('Error setting up the request:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default useApi;