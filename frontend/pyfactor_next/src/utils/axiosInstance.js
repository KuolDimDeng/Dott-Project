import axios from 'axios';

// Create a UUID function for browsers that don't support crypto.randomUUID
const generateRequestId = () => {
  return typeof crypto !== 'undefined' && crypto.randomUUID 
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '',
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor to add authorization token
axiosInstance.interceptors.request.use(
  (config) => {
    // Add auth token from localStorage if available
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add tenant ID from localStorage if available
    const tenantId = typeof window !== 'undefined' ? localStorage.getItem('tenantId') : null;
    if (tenantId) {
      config.headers = config.headers || {};
      config.headers['x-tenant-id'] = tenantId;
    }
    
    // Add request ID for tracing
    config.headers = config.headers || {};
    config.headers['x-request-id'] = generateRequestId();
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Handle token expiration or authentication issues
    if (error.response && error.response.status === 401) {
      // Redirect to login if token expired/invalid
      if (typeof window !== 'undefined') {
        // Clear auth data
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        
        // Only redirect if not already on login page
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }
    
    // Handle timeout errors - add retry logic
    if ((error.code === 'ECONNABORTED' || error.message?.includes('timeout')) && 
        !originalRequest._retry && 
        originalRequest.method.toLowerCase() !== 'get') {
      console.log(`[Axios] Request timed out, retrying with longer timeout...`);
      
      // Mark as retry
      originalRequest._retry = true;
      
      // Double the timeout for the retry attempt
      originalRequest.timeout = originalRequest.timeout ? originalRequest.timeout * 2 : 60000;
      
      // Return the retry attempt
      try {
        return await axiosInstance(originalRequest);
      } catch (retryError) {
        console.error(`[Axios] Retry failed:`, retryError.message);
        return Promise.reject(retryError);
      }
    }
    
    // Handle connection refused errors - could be server startup lag
    if (error.code === 'ECONNREFUSED' && !originalRequest._retry) {
      console.log(`[Axios] Connection refused, retrying after delay...`);
      
      // Mark as retry
      originalRequest._retry = true;
      
      // Wait for a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Return the retry attempt
      try {
        return await axiosInstance(originalRequest);
      } catch (retryError) {
        console.error(`[Axios] Retry failed:`, retryError.message);
        return Promise.reject(retryError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance; 