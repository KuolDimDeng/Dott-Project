import axios from 'axios';
import { logger } from '@/utils/logger';
import { refreshUserSession } from '@/utils/refreshUserSession';

// Create an axios instance with specific configuration
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '',
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Keep track of refresh attempts to prevent infinite loops
let refreshAttempts = 0;
const MAX_REFRESH_ATTEMPTS = 2;
let isRefreshing = false;
let refreshSubscribers = [];

// Function to add new request to queue
const subscribeToTokenRefresh = (callback) => {
  refreshSubscribers.push(callback);
};

// Function to resolve queued requests
const onTokenRefreshed = (token) => {
  refreshSubscribers.forEach(callback => callback(token));
  refreshSubscribers = [];
};

// Reset refresh attempt counters
const resetRefreshState = () => {
  setTimeout(() => {
    refreshAttempts = 0;
    isRefreshing = false;
    refreshSubscribers = [];
  }, 10000); // Reset after 10 seconds
};

// Request interceptor - add token to requests
apiClient.interceptors.request.use(
  async (config) => {
    try {
      // Get current tokens from cookies
      const cookies = document.cookie.split(';');
      const tokenCookie = cookies.find(cookie => cookie.trim().startsWith('idToken='));
      
      if (tokenCookie) {
        const token = tokenCookie.split('=')[1];
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      
      return config;
    } catch (error) {
      logger.error('[AuthInterceptor] Error adding auth token:', error);
      return config;
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle token expiration
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Check if error is due to token expiration
    const isTokenError = 
      (error.response?.status === 401 || error.response?.status === 403) && 
      (
        error.response?.data?.message?.includes('expire') || 
        error.response?.data?.detail?.includes('expire') ||
        error.response?.data?.error?.includes('expire') ||
        error.response?.data?.includes('expire')
      );
    
    // Handle token expiration
    if (isTokenError && !originalRequest._retry) {
      logger.debug('[AuthInterceptor] Token expired, attempting refresh');
      
      // Prevent multiple refresh attempts for the same request
      originalRequest._retry = true;
      
      // Check if we've exceeded max refresh attempts
      if (refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
        logger.warn('[AuthInterceptor] Max refresh attempts reached');
        // Reset for future requests
        resetRefreshState();
        // Redirect to login page
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/signin?session_expired=true';
        }
        return Promise.reject(error);
      }
      
      // Handle concurrent refresh requests
      if (isRefreshing) {
        logger.debug('[AuthInterceptor] Token refresh in progress, queueing request');
        try {
          // Wait for the token to be refreshed
          const newToken = await new Promise((resolve, reject) => {
            subscribeToTokenRefresh((token) => {
              resolve(token);
            });
            
            // If refresh takes too long, reject
            setTimeout(() => {
              reject(new Error('Refresh timeout'));
            }, 5000);
          });
          
          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          logger.error('[AuthInterceptor] Error waiting for token refresh:', refreshError);
          return Promise.reject(error);
        }
      }
      
      // Start refresh process
      isRefreshing = true;
      refreshAttempts++;
      
      try {
        // Attempt to refresh the session
        const result = await refreshUserSession();
        
        // Check if refresh was successful
        if (result && result.tokens) {
          const newToken = result.tokens.idToken.toString();
          logger.debug('[AuthInterceptor] Token refreshed successfully');
          
          // Update headers for the original request
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          
          // Notify waiting requests
          onTokenRefreshed(newToken);
          
          // Reset refresh state
          isRefreshing = false;
          
          // Retry the original request with new token
          return apiClient(originalRequest);
        } else {
          logger.error('[AuthInterceptor] Token refresh failed, redirecting to login');
          
          // Reset for future requests
          resetRefreshState();
          
          // Redirect to login page
          if (typeof window !== 'undefined') {
            window.location.href = '/auth/signin?session_expired=true';
          }
          
          return Promise.reject(error);
        }
      } catch (refreshError) {
        logger.error('[AuthInterceptor] Error refreshing token:', refreshError);
        
        // Reset for future requests
        resetRefreshState();
        
        // Redirect to login page
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/signin?session_expired=true';
        }
        
        return Promise.reject(error);
      }
    }
    
    // If it's not a token error or we can't handle it, reject as normal
    return Promise.reject(error);
  }
);

export default apiClient; 