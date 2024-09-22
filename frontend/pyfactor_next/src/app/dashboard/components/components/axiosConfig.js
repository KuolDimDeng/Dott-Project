// src/app/Dashboard/components/axiosConfig.js
import axios from 'axios';
import { logger } from '@/utils/logger';

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const noAuthRequired = ['/api/register/', '/api/token/', '/api/token/refresh/'];

const getToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

const axiosInstance = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken',
  timeout: 30000, // Set a timeout of 30 seconds
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const token = getToken();
    const isAuthRequired = !noAuthRequired.some(url => config.url.includes(url));
    
    if (token && isAuthRequired) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    logger.info('Outgoing request', { url: config.url, method: config.method });
    return config;
  },
  (error) => {
    logger.error('Request interceptor error', { error: error.message });
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    logger.info('Response received', { status: response.status, url: response.config.url });
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response) {
      logger.error('Response error', { 
        status: error.response.status, 
        data: error.response.data,
        url: originalRequest.url 
      });
      
      if (error.response.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        
        try {
          const refreshToken = localStorage.getItem('refreshToken');
          if (!refreshToken) {
            throw new Error('No refresh token available');
          }
          
          const response = await axios.post(`${baseURL}/api/token/refresh/`, { refresh: refreshToken });
          const newToken = response.data.access;
          
          localStorage.setItem('token', newToken);
          
          logger.info('Token refreshed successfully');
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
          return axiosInstance(originalRequest);
        } catch (refreshError) {
          logger.error('Token refresh failed', { error: refreshError.message });
          // Handle navigation to login page
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          return Promise.reject(refreshError);
        }
      }
      
      if (error.response.status === 403) {
        logger.warn('Permission denied', { url: originalRequest.url });
        // Handle permission denied scenario
      }
    } else if (error.request) {
      logger.error('No response received', { url: originalRequest.url });
    } else {
      logger.error('Error setting up the request', { error: error.message });
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;