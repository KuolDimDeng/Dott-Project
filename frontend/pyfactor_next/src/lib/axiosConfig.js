import axios from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';
import { logger } from '@/utils/logger';
import { getTenantId, getSchemaName, getTenantFromResponse } from '@/utils/tenantUtils';
import { isTokenExpired } from '@/utils/auth';
import { jwtDecode } from 'jwt-decode';

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

// For frontend requests, we'll use relative URLs to avoid CORS issues
// This will route requests through Next.js API routes
const API_URL = '';  // Remove '/api' to avoid duplicate in the path

const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 15000, // Increased from 8000 to 15000 ms to handle service creation
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
      let { tokens, userSub } = await fetchAuthSession();
      let accessToken = tokens?.accessToken?.toString();
      let idToken = tokens?.idToken?.toString();
      
      if (!accessToken || !idToken) {
        logger.warn('[AxiosConfig] Missing required tokens in session');
        // Check if we're in a server context first
        if (typeof window === 'undefined') {
          // In server context, return a generic error that won't break API routes
          logger.warn('[AxiosConfig] Server-side request with missing tokens');
          throw new Error('No valid session');
        } else {
          // In client context, throw a more descriptive error
          throw new Error('No valid session - user authentication required');
        }
      }
      
      // Check if token is expired or about to expire (within 5 minutes)
      try {
        const decoded = jwtDecode(accessToken);
        const now = Math.floor(Date.now() / 1000);
        const fiveMinutesInSeconds = 5 * 60;
        
        if (decoded.exp && decoded.exp - now < fiveMinutesInSeconds) {
          logger.info('[AxiosConfig] Token is about to expire, refreshing proactively');
          
          // Only refresh if not already refreshing to avoid infinite loops
          if (!isRefreshing) {
            isRefreshing = true;
            try {
              const refreshResult = await fetchAuthSession({ forceRefresh: true });
              accessToken = refreshResult.tokens?.accessToken?.toString();
              idToken = refreshResult.tokens?.idToken?.toString();
              
              if (!accessToken || !idToken) {
                throw new Error('Failed to refresh tokens');
              }
              
              logger.info('[AxiosConfig] Tokens refreshed proactively');
              
              // Process any queued requests
              processQueue(null, { accessToken, idToken });
            } catch (refreshError) {
              logger.error('[AxiosConfig] Proactive token refresh failed:', refreshError);
              processQueue(refreshError);
              // Continue with original token if it's not expired yet
              if (decoded.exp <= now) {
                throw refreshError;
              }
            } finally {
              isRefreshing = false;
            }
          }
        }
      } catch (tokenCheckError) {
        logger.warn('[AxiosConfig] Error checking token expiration:', tokenCheckError);
        // Continue with the request using the original token
      }
      
      // Set auth headers
      config.headers.Authorization = `Bearer ${accessToken}`;
      config.headers['X-Id-Token'] = idToken;
      config.headers['X-User-ID'] = userSub;
      
      // Add tenant headers
      const tenantId = getTenantId();
      if (tenantId) {
        config.headers['X-Tenant-ID'] = tenantId;
        
        // Add schema name if needed
        const schemaName = getSchemaName();
        if (schemaName) {
          config.headers['X-Schema-Name'] = schemaName;
        }
      }
      
      logger.debug('[AxiosConfig] Request configured:', {
        url: config.url,
        method: config.method,
        hasToken: true,
        baseURL: config.baseURL,
        tenantId: config.headers['X-Tenant-ID'] || 'none',
        schemaName: config.headers['X-Schema-Name'] || 'none'
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
    
    // Check for tenant information in the response
    const tenantId = getTenantFromResponse(response);
    if (tenantId) {
      logger.debug(`[AxiosConfig] Extracted tenant ID from response: ${tenantId}`);
    }
    
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // More robust error logging - ensure we have all required properties
    const errorDetails = {
      url: originalRequest?.url || 'unknown',
      status: error.response?.status || 'unknown',
      message: error.message || 'No error message',
      name: error.name || 'Unknown error',
      stack: error.stack ? error.stack.split('\n').slice(0, 3).join('\n') : 'No stack trace'
    };
    
    // Add request info if available
    if (originalRequest) {
      errorDetails.method = originalRequest.method || 'unknown';
      errorDetails.baseURL = originalRequest.baseURL || '';
      
      // Only add headers if they exist and don't contain sensitive data
      if (originalRequest.headers) {
        const safeHeaders = { ...originalRequest.headers };
        
        // Remove sensitive headers for security
        delete safeHeaders.Authorization;
        delete safeHeaders['X-Id-Token'];
        
        errorDetails.headers = safeHeaders;
      }
    }
    
    // Only add response data if it exists and isn't too large
    if (error.response?.data) {
      const dataStr = typeof error.response.data === 'string' 
        ? error.response.data 
        : JSON.stringify(error.response.data);
        
      errorDetails.responseData = dataStr.length > 1000 
        ? dataStr.substring(0, 1000) + '... [truncated]'
        : dataStr;
    }
    
    logger.error('[AxiosConfig] Response error:', errorDetails);

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
