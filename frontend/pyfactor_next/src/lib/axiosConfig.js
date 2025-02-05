import axios from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';
import { logger } from '@/utils/logger';

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor
axiosInstance.interceptors.request.use(
  async (config) => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.accessToken?.toString();
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      return config;
    } catch (error) {
      logger.error('Request interceptor error:', error);
      return config;
    }
  },
  (error) => {
    logger.error('Request interceptor rejection:', error);
    return Promise.reject(error);
  }
);

// Add a response interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If the error is due to an expired token and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Get a new session with refreshed tokens
        const session = await fetchAuthSession({ forceRefresh: true });
        const token = session.tokens?.accessToken?.toString();

        // Update the failed request's Authorization header
        originalRequest.headers.Authorization = `Bearer ${token}`;

        // Retry the request with the new token
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        logger.error('Token refresh failed:', refreshError);
        
        // Redirect to sign in page will be handled by the auth components
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export { axiosInstance };
