import axios from 'axios';

// Create a UUID function for browsers that don't support crypto.randomUUID
const generateRequestId = () => {
  return typeof crypto !== 'undefined' && crypto.randomUUID 
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Determine if we should use relative paths for internal Next.js API routes
// or absolute paths for external APIs
const isInternalApiPath = (url) => {
  // Check for already properly formatted API paths
  return url.startsWith('/api/');
};

const axiosInstance = axios.create({
  // We'll determine baseURL dynamically in the interceptor
  baseURL: '',
  timeout: 60000, // Increased from 30s to 60s
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor to add authorization token
axiosInstance.interceptors.request.use(
  (config) => {
    const isInternal = isInternalApiPath(config.url);
    
    // Set the baseURL dynamically based on the URL path
    // For internal API routes, use relative paths to hit Next.js API routes
    // For external APIs, use the configured external API base URL
    if (isInternal) {
      // The URL already starts with /api/ so we don't need to modify it
      // Just ensure we're not adding any baseURL that might duplicate it
      config.baseURL = '';
      
      // Additional check to remove duplicate /api/ in the URL
      if (config.url.startsWith('/api/api/')) {
        console.log(`[Axios] Fixing duplicate API path: ${config.url}`);
        config.url = config.url.replace('/api/api/', '/api/');
      }
    } else {
      // For non-api paths, add the /api prefix
      if (!config.url.startsWith('/api/')) {
        config.url = `/api${config.url.startsWith('/') ? config.url : '/' + config.url}`;
      }
      
      // Check again for potential duplicates that might have been added by other middleware
      if (config.url.startsWith('/api/api/')) {
        console.log(`[Axios] Fixing duplicate API path: ${config.url}`);
        config.url = config.url.replace('/api/api/', '/api/');
      }
      
      // Use the configured API URL for direct API calls (if needed)
      // config.baseURL = process.env.NEXT_PUBLIC_API_URL || '';
    }
    
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
    
    // Don't retry more than twice
    if (!originalRequest || originalRequest._retryCount >= 2) {
      return Promise.reject(error);
    }
    
    // Initialize retry count if not set
    originalRequest._retryCount = originalRequest._retryCount || 0;
    
    // Handle token expiration or authentication issues
    if (error.response && error.response.status === 401) {
      // Redirect to login if token expired/invalid
      if (typeof window !== 'undefined') {
        // Clear auth data
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        
        // Only redirect if not already on login page
        if (!window.location.pathname.includes('/login')) {
          console.log('[Axios] Authentication error, redirecting to login...');
          
          // Instead of immediate redirect, set a flag to avoid interrupting current operation
          localStorage.setItem('auth_redirect_needed', 'true');
          
          // After a short delay, check if we should actually redirect
          setTimeout(() => {
            if (localStorage.getItem('auth_redirect_needed') === 'true') {
              localStorage.removeItem('auth_redirect_needed');
              window.location.href = '/login';
            }
          }, 2000);
        }
      }
    }
    
    // Handle 404 errors to login page - common error pattern 
    if (error.response && error.response.status === 404 && 
        (error.config.url.includes('/login') || error.config.url.includes('/api/auth'))) {
      console.log('[Axios] Login page 404 error - redirecting to dashboard fallback login');
      
      // Instead of immediate redirect, set a flag
      if (typeof window !== 'undefined') {
        localStorage.setItem('login_redirect_needed', 'true');
        
        // After a short delay, check if we should actually redirect
        setTimeout(() => {
          if (localStorage.getItem('login_redirect_needed') === 'true') {
            localStorage.removeItem('login_redirect_needed');
            window.location.href = '/dashboard';
          }
        }, 2000);
      }
      
      // Return a resolved promise to prevent error propagation
      return Promise.resolve({ data: { success: false, message: "Login page not found, using fallback" } });
    }
    
    // Handle timeout errors - add retry logic
    if ((error.code === 'ECONNABORTED' || error.message?.includes('timeout')) && 
        !originalRequest._retry) {
      console.log(`[Axios] Request timed out, retrying with longer timeout...`);
      
      // Increment retry count
      originalRequest._retryCount++;
      
      // Mark as specific timeout retry
      originalRequest._retry = true;
      
      // Double the timeout for the retry attempt
      originalRequest.timeout = originalRequest.timeout ? originalRequest.timeout * 2 : 120000;
      
      // Return the retry attempt
      try {
        // Wait a short delay before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
        return await axiosInstance(originalRequest);
      } catch (retryError) {
        console.error(`[Axios] Retry failed:`, retryError.message);
        return Promise.reject(retryError);
      }
    }
    
    // Handle connection refused or network errors
    if ((error.code === 'ECONNREFUSED' || error.message?.includes('Network Error') || !error.response) && 
        !originalRequest._connectionRetry) {
      console.log(`[Axios] Connection refused or network error, retrying after delay...`);
      
      // Increment retry count
      originalRequest._retryCount++;
      
      // Mark as specific connection retry
      originalRequest._connectionRetry = true;
      
      // Wait for a bit before retrying
      try {
        await new Promise(resolve => setTimeout(resolve, 2000 * originalRequest._retryCount));
        return await axiosInstance(originalRequest);
      } catch (retryError) {
        console.error(`[Axios] Retry failed:`, retryError.message);
        return Promise.reject(retryError);
      }
    }
    
    // For aborted requests, try again once
    if (error.code === 'ECONNABORTED' && !originalRequest._abortRetry) {
      console.log(`[Axios] Request was aborted, retrying...`);
      
      // Increment retry count
      originalRequest._retryCount++;
      
      // Mark as abort retry
      originalRequest._abortRetry = true;
      
      // Wait a bit longer before retrying aborted requests
      try {
        await new Promise(resolve => setTimeout(resolve, 3000));
        return await axiosInstance(originalRequest);
      } catch (retryError) {
        console.error(`[Axios] Retry after abort failed:`, retryError.message);
        return Promise.reject(retryError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance; 