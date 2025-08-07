import axios from 'axios';
import { appCache } from './appCache';

// Create a UUID function for browsers that don't support crypto.randomUUID
const generateRequestId = () => {
  return typeof crypto !== 'undefined' && crypto.randomUUID 
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Initialize global app cache if it doesn't exist
if (typeof window !== 'undefined') {
  // Initialize app cache structure
  const cache = appCache.getAll() || {};
  if (!cache.auth) {
    appCache.set('auth', {});
  }
  if (!cache.tenant) {
    appCache.set('tenant', {});
  }
}

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

// Improved tenant and token handling using only AppCache or direct Cognito
const getTenantAndTokenInfo = async () => {
  let token = null;
  let tenantId = null;
  
  if (typeof window !== 'undefined') {
    // Ensure APP_CACHE is initialized
    // Initialize app cache if needed
  if (!appCache.getAll()) {
    appCache.init();
  }
    if (!appCache.get('auth')) {
    appCache.set('auth', {});
  }
    if (!appCache.get('tenant')) {
    appCache.set('tenant', {});
  }
    
    // Try to get token from APP_CACHE
    token = appCache.get('auth.idToken');
    
    // Try to get tenant ID from APP_CACHE
    tenantId = appCache.get('tenant.id') || appCache.get('tenant.tenantId') || appCache.getAll().businessid;
    
    // If we don't have a token or tenantId yet, try to get directly from Cognito
    if (!token || !tenantId) {
      try {
        // Dynamic import to avoid server-side errors
        const { fetchAuthSession } = await import('@/config/amplifyUnified');
        const session = await fetchAuthSession();
        
        if (session?.tokens?.idToken) {
          token = session.tokens.idToken.toString();
          
          // Store in AppCache for future use
          appCache.set('auth.idToken', token);
          
          // Extract tenant ID from token payload
          try {
            const payload = JSON.parse(
              Buffer.from(token.split('.')[1], 'base64').toString()
            );
            
            tenantId = payload['custom:tenant_ID'] || 
                      payload['custom:businessid'] || 
                      payload['custom:tenantId'];
            
            if (tenantId) {
              appCache.set('tenant.id', tenantId);
            }
          } catch (e) {
            console.warn('[Axios] Error extracting tenant ID from token:', e);
          }
        }
      } catch (e) {
        console.warn('[Axios] Error getting session from Cognito:', e);
      }
    }
  }
  
  return { token, tenantId };
};

// Update the request interceptor to use the improved function
axiosInstance.interceptors.request.use(
  async (config) => {
    const isInternal = isInternalApiPath(config.url);
    
    // Set the baseURL dynamically based on the URL path
    if (isInternal) {
      config.baseURL = '';
      
      // Clean up duplicate /api/ in URLs
      if (config.url.startsWith('/api/api/')) {
        console.log(`[Axios] Fixing duplicate API path: ${config.url}`);
        config.url = config.url.replace('/api/api/', '/api/');
      }
    } else {
      // For non-api paths, add the /api prefix
      if (!config.url.startsWith('/api/')) {
        config.url = `/api${config.url.startsWith('/') ? config.url : '/' + config.url}`;
      }
      
      // Check again for potential duplicates
      if (config.url.startsWith('/api/api/')) {
        console.log(`[Axios] Fixing duplicate API path: ${config.url}`);
        config.url = config.url.replace('/api/api/', '/api/');
      }
    }
    
    // Get authentication and tenant information
    const { token, tenantId } = await getTenantAndTokenInfo();
    
    // Add auth token if available
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add tenant ID if available
    if (tenantId) {
      config.headers = config.headers || {};
      config.headers['x-tenant-id'] = tenantId;
      config.headers['X-Tenant-ID'] = tenantId; // Add both cases for compatibility
      
      // Add to query params as well for maximum compatibility
      config.params = config.params || {};
      if (!config.params.tenantId && !config.params.tenant_id) {
        config.params.tenantId = tenantId;
      }
      
      // Add schema prefix if it's an HR endpoint
      if (config.url.includes('/api/hr/') && !config.params.schema) {
        config.params.schema = `tenant_${tenantId.replace(/-/g, '_')}`;
      }
    }
    
    // Add request ID for tracing
    config.headers = config.headers || {};
    config.headers['x-request-id'] = generateRequestId();
    
    // Add signal for request cancellation handling
    const controller = new AbortController();
    config.signal = controller.signal;
    config.__abortController = controller;
    
    // Increase timeout for HR endpoints
    if (config.url.includes('/api/hr/')) {
      config.timeout = 120000; // Increase timeout to 2 minutes for HR endpoints
    }
    
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
      console.log('[Axios] 401 Authentication error detected:', {
        url: originalRequest?.url,
        method: originalRequest?.method,
        retryCount: originalRequest._retryCount || 0
      });

      // Don't redirect for dashboard API calls - let components handle gracefully
      const isDashboardApiCall = originalRequest?.url?.includes('/api/') && 
                                 (originalRequest?.url?.includes('/services') ||
                                  originalRequest?.url?.includes('/calendar') ||
                                  originalRequest?.url?.includes('/dashboard'));

      if (isDashboardApiCall) {
        console.log('[Axios] Dashboard API call failed - handling gracefully without redirect');
        // Clear auth data but don't redirect
        if (typeof window !== 'undefined' && appCache.getAll()) {
          appCache.remove('auth.token');
          appCache.remove('auth.user');
        }
        // Return the error to let components handle it
        return Promise.reject(error);
      }

      // Only redirect for non-dashboard calls or auth-specific endpoints
      if (typeof window !== 'undefined') {
        // Clear auth data
        if (appCache.getAll()) {
          appCache.remove('auth.token');
          appCache.remove('auth.user');
        }
        
        // Only redirect if not already on login page and it's an auth-critical endpoint
        if (!window.location.pathname.includes('/login') && 
            (originalRequest?.url?.includes('/auth') || 
             originalRequest?.url?.includes('/onboarding'))) {
          console.log('[Axios] Critical auth endpoint failed - redirecting to login...');
          
          // Set a flag to avoid interrupting current operation
          if (appCache.getAll()) {
            if (!appCache.get('auth')) {
              appCache.set('auth', {});
            }
            appCache.set('auth.redirectNeeded', true);
          }
          
          // After a delay, check if we should actually redirect
          setTimeout(() => {
            const redirectNeeded = appCache.get('auth.redirectNeeded');
            if (redirectNeeded) {
              if (appCache.getAll()) {
                appCache.remove('auth.redirectNeeded');
              }
              window.location.href = '/login';
            }
          }, 3000); // Increased delay to 3 seconds
        }
      }
    }
    
    // Handle 404 errors to login page - common error pattern 
    if (error.response && error.response.status === 404 && 
        (error.config.url.includes('/login') || error.config.url.includes('/api/auth'))) {
      console.log('[Axios] Login page 404 error - redirecting to dashboard fallback login');
      
      // Instead of immediate redirect, set a flag
      if (typeof window !== 'undefined') {
        if (appCache.getAll()) {
          if (!appCache.get('auth')) {
    appCache.set('auth', {});
  }
          appCache.set('auth.loginRedirectNeeded', true);
        }
        
        // After a short delay, check if we should actually redirect
        setTimeout(() => {
          const redirectNeeded = appCache.get('auth.redirectNeeded');
          if (redirectNeeded) {
            if (appCache.getAll()) {
              appCache.remove('auth.loginRedirectNeeded');
            }
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