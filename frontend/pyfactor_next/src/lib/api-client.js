// Centralized API client with interceptors and error handling
import axios from 'axios';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor for auth and logging
apiClient.interceptors.request.use(
  (config) => {
    // Add timestamp for performance tracking
    config.metadata = { startTime: new Date() };
    
    // Log request in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and logging
apiClient.interceptors.response.use(
  (response) => {
    // Calculate request duration
    const duration = new Date() - response.config.metadata.startTime;
    
    // Log response in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ API Response: ${response.config.url} (${duration}ms)`);
    }
    
    // Add duration to response for performance monitoring
    response.duration = duration;
    
    return response;
  },
  (error) => {
    // Calculate request duration even for errors
    if (error.config?.metadata?.startTime) {
      const duration = new Date() - error.config.metadata.startTime;
      error.duration = duration;
    }
    
    // Enhanced error logging
    if (process.env.NODE_ENV === 'development') {
      console.error(`❌ API Error: ${error.config?.url}`, {
        status: error.response?.status,
        message: error.response?.data?.error || error.message,
        duration: error.duration,
      });
    }
    
    // Handle specific error cases
    if (error.response?.status === 401) {
      // Redirect to login if unauthorized
      window.location.href = '/auth/signin?error=session_expired';
    }
    
    return Promise.reject(error);
  }
);

// Helper functions for common HTTP methods
export const api = {
  get: (url, config) => apiClient.get(url, config).then(res => res.data),
  post: (url, data, config) => apiClient.post(url, data, config).then(res => res.data),
  put: (url, data, config) => apiClient.put(url, data, config).then(res => res.data),
  patch: (url, data, config) => apiClient.patch(url, data, config).then(res => res.data),
  delete: (url, config) => apiClient.delete(url, config).then(res => res.data),
};

// Export the raw client for advanced usage
export default apiClient;