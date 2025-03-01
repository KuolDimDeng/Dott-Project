import axios from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';
import { logger } from '@/utils/logger';

// Queue for requests during token refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, tokens = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(tokens);
    }
  });
  failedQueue = [];
};

// Ensure we're using the correct backend URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

logger.debug('[AxiosConfig] Initialized with baseURL:', API_URL);

// Add a request interceptor
axiosInstance.interceptors.request.use(
  async (config) => {
    try {
      // Initialize retryCount if not set
      if (config.url?.includes('/setup')) {
        config.retryCount = config.retryCount || 0;
      }
      
      // Get tokens from Amplify session
      const { tokens, userSub } = await fetchAuthSession();
      const accessToken = tokens?.accessToken?.toString();
      const idToken = tokens?.idToken?.toString();
      
      if (!accessToken || !idToken) {
        logger.warn('[AxiosConfig] Missing required tokens in session');
        throw new Error('No valid session');
      }
      
      // Set auth headers
      config.headers.Authorization = `Bearer ${accessToken}`;
      config.headers['X-Id-Token'] = idToken;
      config.headers['X-User-ID'] = userSub;
      
      logger.debug('[AxiosConfig] Request configured:', {
        url: config.url,
        method: config.method,
        hasToken: true,
        baseURL: config.baseURL
      });

      return config;
    } catch (error) {
      logger.error('[AxiosConfig] Request interceptor error:', error);
      return Promise.reject(error);
    }
  },
  (error) => {
    logger.error('[AxiosConfig] Request interceptor rejection:', error);
    return Promise.reject(error);
  }
);

// Add a response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    logger.debug('[AxiosConfig] Response received:', {
      url: response.config.url,
      status: response.status,
      headers: response.headers
    });
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    logger.error('[AxiosConfig] Response error:', {
      url: originalRequest?.url,
      status: error.response?.status,
      message: error.message,
      headers: originalRequest?.headers
    });

    // Handle 401 errors with token refresh and request queuing
    if (error.response?.status === 401) {
      const originalRequest = error.config;
      
      // Special handling for setup endpoints with retry logic
      if (originalRequest.url?.includes('/setup')) {
        if (originalRequest.retryCount < 3) {
          originalRequest.retryCount++;
          const delay = Math.pow(2, originalRequest.retryCount) * 1000;
          
          logger.debug('[AxiosConfig] Retrying setup request:', {
            url: originalRequest.url,
            attempt: originalRequest.retryCount,
            delay
          });
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return axiosInstance(originalRequest);
        }
      }
      
      // Queue requests if already refreshing
      if (isRefreshing) {
        try {
          const tokens = await new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          });
          
          // Update both tokens in headers
          originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
          originalRequest.headers['X-Id-Token'] = tokens.idToken;
          
          logger.debug('[AxiosConfig] Retrying request with refreshed tokens:', {
            url: originalRequest.url,
            hasAccessToken: !!tokens.accessToken,
            hasIdToken: !!tokens.idToken
          });
          
          return axiosInstance(originalRequest);
        } catch (err) {
          logger.error('[AxiosConfig] Failed to retry request:', err);
          return Promise.reject(err);
        }
      }
      
      isRefreshing = true;
      
      try {
        const { tokens } = await fetchAuthSession({ forceRefresh: true });
        const accessToken = tokens?.accessToken?.toString();
        const idToken = tokens?.idToken?.toString();
        
        if (!accessToken || !idToken) {
          throw new Error('Missing required tokens after refresh');
        }
        
        // Update both tokens in headers
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        originalRequest.headers['X-Id-Token'] = idToken;
        
        // Process queue with both tokens
        processQueue(null, { accessToken, idToken });
        
        logger.debug('[AxiosConfig] Tokens refreshed successfully:', {
          url: originalRequest.url,
          retryCount: originalRequest.retryCount,
          hasAccessToken: !!accessToken,
          hasIdToken: !!idToken
        });
        
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        logger.error('[AxiosConfig] Token refresh failed:', {
          error: refreshError.message,
          url: originalRequest.url
        });
        throw refreshError; // Changed from return Promise.reject to throw
      } finally {
        isRefreshing = false;
      }
    }

    // For other errors, add request details to the error
    error.requestDetails = {
      url: originalRequest?.url,
      method: originalRequest?.method,
      status: error.response?.status,
      headers: originalRequest?.headers
    };

    return Promise.reject(error);
  }
);

export { axiosInstance };
