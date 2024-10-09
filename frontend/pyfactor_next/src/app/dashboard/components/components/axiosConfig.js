import axios from 'axios';
import { getSession } from "next-auth/react";
import { logger } from '@/utils/logger';

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const noAuthRequired = ['/api/register/', '/api/token/', '/api/token/refresh/'];

console.log('Axios instance created with base URL:', baseURL);
console.log('-------------------------------------------');

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
  async (config) => {
    const isAuthRequired = !noAuthRequired.some(url => config.url.includes(url));
    
    if (isAuthRequired) {
      const session = await getSession();
      console.log('Current session:', session);
      if (session?.accessToken) {
        config.headers['Authorization'] = `Bearer ${session.accessToken}`;
        console.log('Access token applied to request:', session.accessToken);
      }
    }
    
    logger.info('Outgoing request', { url: config.url, method: config.method });
    console.log('Outgoing request:', { url: config.url, method: config.method });
    console.log('-------------------------------------------');
    return config;
  },
  (error) => {
    logger.error('Request interceptor error', { error: error.message });
    console.error('Request interceptor error:', error.message);
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    logger.info('Response received', { status: response.status, url: response.config.url });
    console.log('Response received:', { status: response.status, url: response.config.url });
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
      console.error('Response error:', {
        status: error.response.status,
        data: error.response.data,
        url: originalRequest.url
      });

      if (error.response.status === 401) {
        console.log('Unauthorized error, redirecting to error page...');
        if (typeof window !== 'undefined') {
          window.location.href = `/api/auth/error?error=Unauthorized`;
        }
      }

      if (error.response.status === 403) {
        logger.warn('Permission denied', { url: originalRequest.url });
        console.warn('Permission denied:', { url: originalRequest.url });
      }
    } else if (error.request) {
      logger.error('No response received', { url: originalRequest.url });
      console.error('No response received:', { url: originalRequest.url });
    } else {
      logger.error('Error setting up the request', { error: error.message });
      console.error('Error setting up the request:', error.message);
    }
    console.log('-------------------------------------------');

    return Promise.reject(error);
  }
);

export default axiosInstance;