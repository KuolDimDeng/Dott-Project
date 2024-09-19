// src/components/utils/axiosConfig.js

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const baseURL = 'http://localhost:8000'; // Replace with your actual API URL
const noAuthRequired = ['/api/register/', '/api/token/', '/api/token/refresh/'];

const axiosInstance = axios.create({
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

// Simple internet connection check
const checkInternetConnection = () => {
  return new Promise((resolve) => {
    fetch('https://www.google.com', { mode: 'no-cors' })
      .then(() => resolve(true))
      .catch(() => resolve(false));
  });
};

// Request interceptor
axiosInstance.interceptors.request.use(
  async (config) => {
    const isConnected = await checkInternetConnection();
    if (!isConnected) {
      return Promise.reject(new Error('No internet connection'));
    }

    const token = await getToken();
    const isAuthRequired = !noAuthRequired.some(url => config.url.includes(url));
    
    if (token && isAuthRequired) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response) {
      console.error('Response error:', error.response.status, error.response.data);

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

          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
          return axiosInstance(originalRequest);
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          // Handle logout or redirect to login screen
          // You might want to use your navigation system here
          // For example: navigation.navigate('Login');
          return Promise.reject(refreshError);
        }
      }

      if (error.response.status === 403) {
        console.error('Permission denied:', error.response.data);
        // Handle "Access Denied" scenario
        // You might want to show an alert or navigate to an error screen
        // For example: Alert.alert('Access Denied', 'You do not have permission to perform this action.');
      }
    } else if (error.request) {
      console.error('No response received:', error.request);
      error.message = 'No response from server. Please try again.';
    } else {
      console.error('Error setting up the request:', error.message);
      error.message = 'An unexpected error occurred. Please try again.';
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;