// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/lib/axiosConfig.js
'use client';

import axios from 'axios';
import { QueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { getSession, signOut, getCsrfToken, useSession } from 'next-auth/react';
import { logger } from '@/utils/logger';
import APP_CONFIG from '@/config';
import { useState, useEffect, useCallback } from 'react';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { RoutingManager } from '@/lib/routingManager';
import { onboardingApi, makeRequest } from '@/services/api/onboarding';





// Constants
const RETRY_COUNT = 3;
const RETRY_DELAY = 1000;
const REQUEST_TIMEOUT = 10000;
const TIMEOUT = 10000; // 10 seconds
const MAX_REFRESH_ATTEMPTS = 3;
const REFRESH_COOLDOWN = 1000; // 1 second between refresh attempts
const NETWORK_RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff delays
const BASE_URL = process.env.NEXT_PUBLIC_API_URL;




const DATABASE_ERROR_TYPES = {
  NOT_FOUND: 'not_found',
  DELETED: 'deleted',
  UNHEALTHY: 'unhealthy',
  AUTH_ERROR: 'auth_error',
  UNKNOWN: 'unknown'
};

// Query client configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error?.response?.status === 401) return false;
        return failureCount < 2;
      },
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false
    },
    mutations: {
      retry: (failureCount, error) => {
        const requestId = crypto.randomUUID();
        logger.debug('Mutation retry evaluation:', {
          requestId,
          failureCount,
          errorStatus: error?.response?.status,
          shouldRetry: error?.response?.status !== 401 && failureCount < 2
        });
        if (error?.response?.status === 401) return false;
        return failureCount < 2;
      },
    },
  },
});



// Axios instance configuration
export const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeoutErrorMessage: 'Request timed out - please try again',
});

// WebSocket hook with enhanced logging
const useWebSocket = (endpoint, options = {}) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const { data: session } = useSession();
  const requestId = crypto.randomUUID();

  useEffect(() => {
    if (!session?.user?.accessToken) {
      logger.debug('WebSocket connection skipped:', {
        requestId,
        reason: 'No access token',
        endpoint
      });
      return;
    }

    logger.debug('Initializing WebSocket connection:', {
      requestId,
      endpoint,
      hasToken: !!session?.user?.accessToken
    });

    const ws = new WebSocket(`${APP_CONFIG.websocket.baseURL}${endpoint}`);
    
    ws.onopen = () => {
      logger.debug('WebSocket connected:', { requestId, endpoint });
      setIsConnected(true);
    };

    ws.onclose = () => {
      logger.debug('WebSocket disconnected:', { requestId, endpoint });
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      logger.error('WebSocket error:', {
        requestId,
        endpoint,
        error: error.message
      });
      options.onError?.(error);
    };

    ws.onmessage = (event) => {
      logger.debug('WebSocket message received:', {
        requestId,
        endpoint,
        dataType: typeof event.data
      });
      options.onMessage?.(JSON.parse(event.data));
    };

    setSocket(ws);

    return () => {
      logger.debug('Cleaning up WebSocket:', { requestId, endpoint });
      ws.close();
    };
  }, [endpoint, session?.user?.accessToken, requestId]);

  return { socket, isConnected };
};

// WebSocket factory with logging
const createWebSocket = (url, options = {}) => {
  const requestId = crypto.randomUUID();
  
  logger.debug('Creating WebSocket instance:', {
    requestId,
    url,
    hasOptions: !!options
  });

  const ws = new WebSocket(url);
  
  ws.onopen = (...args) => {
    logger.debug('WebSocket opened:', { requestId, url });
    options.onOpen?.(...args);
  };
  
  ws.onclose = (...args) => {
    logger.debug('WebSocket closed:', { requestId, url });
    options.onClose?.(...args);
  };
  
  ws.onerror = (error) => {
    logger.error('WebSocket error:', {
      requestId,
      url,
      error: error.message
    });
    options.onError?.(error);
  };
  
  ws.onmessage = (event) => {
    logger.debug('WebSocket message:', {
      requestId,
      url,
      dataType: typeof event.data
    });
    options.onMessage?.(event);
  };

  return ws;
};

// Mutation hooks with detailed logging
const useSaveBusinessInfo = (options = {}) =>
  useMutation({
    mutationFn: async (data) => {
      const requestId = crypto.randomUUID();
      try {
        logger.debug('Saving business info:', {
          requestId,
          hasData: !!data,
          fields: Object.keys(data)
        });

        const response = await axiosInstance.post(
          APP_CONFIG.api.endpoints.onboarding.businessInfo,
          data
        );

        logger.debug('Business info saved:', {
          requestId,
          status: response.status,
          hasData: !!response.data
        });

        return response.data;
      } catch (error) {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to save business info';
        logger.error('Business info save failed:', {
          requestId,
          error: errorMessage,
          data: Object.keys(data)
        });
        throw new Error(errorMessage);
      }
    },
    onError: (error, variables, context) => {
      if (options.onError) {
        options.onError(<ErrorDisplay error={error} />);
      }
    },
    ...options,
  });

  const useSaveSubscription = (options = {}) =>
    useMutation({
      mutationFn: async (data) => {
        const requestId = crypto.randomUUID();
        try {
          const requestData = {
            selected_plan: data.selected_plan,
            billingCycle: data.billingCycle || 'monthly',
            tier: data.selected_plan
          };
  
          logger.debug('Saving subscription:', {
            requestId,
            ...requestData,
            endpoint: APP_CONFIG.api.endpoints.onboarding.subscription
          });
  
          const response = await axiosInstance.post(
            APP_CONFIG.api.endpoints.onboarding.subscription,
            requestData
          );
  
          const responseData = {
            ...response.data,
            selected_plan: response.data.selected_plan || response.data.tier,
            tier: response.data.tier || response.data.selected_plan
          };
  
          return responseData;
        } catch (error) {
          throw new Error(error.message || 'Failed to save subscription');

        }
      },
      onSuccess: (data, variables, context) => {
        queryClient.invalidateQueries(['onboarding_status']);
        queryClient.setQueryData(['selected_plan'], data.selected_plan);
        if (options.onSuccess) {
          options.onSuccess(data, variables, context);
        }
      },
      onError: (error, variables, context) => {
        queryClient.invalidateQueries(['onboarding_status']);
        queryClient.invalidateQueries(['selected_plan']);
        if (options.onError) {
          options.onError(<ErrorDisplay error={error} />);
        }
      }
    });

  const checkDatabaseHealth = async (retryCount = 0) => {
    const requestId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
   
    logger.debug('Database health check started:', {
      requestId,
      timestamp,
      attempt: retryCount + 1,
      maxRetries: RETRY_COUNT,
      endpoint: APP_CONFIG.api.endpoints.database.healthCheck
    });
   
    try {
      // Get session for auth
      const session = await getSession();
      logger.debug('Session retrieved for health check:', {
        requestId,
        hasSession: !!session,
        hasToken: !!session?.user?.accessToken
      });
   
      const response = await axiosInstance.get(APP_CONFIG.api.endpoints.database.healthCheck);
      
      logger.debug('Health check response received:', {
        requestId,
        status: response.status,
        dbStatus: response.data.status,
        responseTime: Date.now() - new Date(timestamp).getTime()
      });
      
      // Handle deleted/not found status
      if (response.data.status === 'deleted' || response.data.status === 'not_found') {
        logger.debug('Database needs reset:', {
          requestId,
          reason: response.data.status,
          details: response.data
        });
   
        try {
          logger.debug('Initiating database reset:', {
            requestId,
            previousStatus: response.data.status
          });
   
          const resetResponse = await axiosInstance.post(APP_CONFIG.api.endpoints.database.reset);
          
          logger.debug('Database reset completed:', {
            requestId,
            resetStatus: resetResponse.status,
            newDbStatus: resetResponse.data.status
          });
   
          return {
            isHealthy: false,
            errorType: DATABASE_ERROR_TYPES.NOT_FOUND,
            requiresSetup: true,
            resetPerformed: true,
            resetSuccess: resetResponse.status === 200
          };
        } catch (resetError) {
          logger.error('Database reset failed:', {
            requestId,
            error: resetError.message,
            stack: resetError.stack,
            originalStatus: response.data.status
          });
   
          return {
            isHealthy: false,
            errorType: DATABASE_ERROR_TYPES.NOT_FOUND,
            requiresSetup: true,
            resetPerformed: true,
            resetSuccess: false,
            resetError: resetError.message
          };
        }
      }
   
      // Handle normal health status
      const isHealthy = response.data.status === 'healthy';
      logger.debug('Database health status determined:', {
        requestId,
        isHealthy,
        rawStatus: response.data.status,
        errorType: !isHealthy ? DATABASE_ERROR_TYPES.UNHEALTHY : null,
        details: response.data
      });
   
      return {
        isHealthy,
        errorType: isHealthy ? null : DATABASE_ERROR_TYPES.UNHEALTHY,
        status: response.data.status,
        timestamp,
        checkDuration: Date.now() - new Date(timestamp).getTime()
      };
   
    } catch (error) {
      logger.error('Health check failed:', {
        requestId,
        timestamp,
        attempt: retryCount + 1,
        error: {
          message: error.message,
          type: error.constructor.name,
          stack: error.stack
        },
        response: error.response?.data
      });
   
      // Handle retries
      if (retryCount < RETRY_COUNT) {
        const delayMs = RETRY_DELAY * Math.pow(2, retryCount);
        
        logger.debug('Scheduling retry:', {
          requestId,
          attempt: retryCount + 1,
          delayMs,
          nextAttemptAt: new Date(Date.now() + delayMs).toISOString()
        });
   
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return checkDatabaseHealth(retryCount + 1);
      }
   
      // All retries exhausted
      logger.error('Health check permanently failed:', {
        requestId,
        timestamp,
        totalAttempts: retryCount + 1,
        finalError: error.message
      });
   
      return {
        isHealthy: false,
        errorType: DATABASE_ERROR_TYPES.UNKNOWN,
        error: error.message,
        attempts: retryCount + 1,
        timestamp,
        duration: Date.now() - new Date(timestamp).getTime()
      };
    }
   };

  
  export const parseJwt = (token) => {
    try {
      const [, payload] = token.split('.');
      return JSON.parse(atob(payload));
    } catch (error) {
      console.error('Error parsing JWT:', error);
      return null;
    }
  };

  const checkSession = async () => {
    const requestId = crypto.randomUUID();
    
    try {
        const session = await getSession();
        logger.debug('Checking session:', {
            requestId,
            hasSession: !!session,
            hasToken: !!session?.user?.accessToken
        });

        if (!session?.user?.accessToken) {
            return false;
        }

        // Validate token with backend
        const response = await axiosInstance.post(
            '/api/token/verify/',
            { token: session.user.accessToken },
            { 
                skipAuthRefresh: true,
                headers: {
                    'X-Request-ID': requestId
                }
            }
        );

        return response.status === 200;

    } catch (error) {
        logger.error('Session check failed:', {
            requestId,
            error: error.message,
            stack: error.stack
        });
        return false;
    }
};

 

const useonboarding_status = (options = {}) => {
  const { data: session, status } = useSession();
  const requestId = crypto.randomUUID();

  return useQuery({
    queryKey: ['onboarding_status'],
    queryFn: async () => {
      logger.debug('Fetching onboarding status:', {
        requestId,
        sessionStatus: status,
        hasToken: !!session?.user?.accessToken,
        hasSession: !!session
      });

      if (status === 'loading') {
        logger.debug('Session loading, deferring fetch:', { requestId });
        return null;
      }

      if (!session?.user?.accessToken) {
        logger.error('Onboarding status fetch failed:', {
          requestId,
          reason: 'No access token',
          sessionStatus: status
        });
        throw new Error('Not authenticated');
      }

      try {
        const response = await axiosInstance.get(APP_CONFIG.api.endpoints.onboarding.status);
        
        const responseData = {
          ...response.data,
          tier: response.data.tier || response.data.selected_plan,
          subscription_status: response.data.subscription_status || 'not_started',
          onboarding_status: response.data.onboarding_status || 'business-info',
          current_step: response.data.current_step || response.data.onboarding_status || 'business-info'
        };

        logger.debug('Onboarding status fetched:', {
          requestId,
          status: responseData.status,
          tier: responseData.tier,
          subscription_status: responseData.subscription_status,
          onboarding_status: responseData.onboarding_status,
          current_step: responseData.current_step
        });

        return responseData;

      } catch (error) {
        logger.error('Onboarding status fetch error:', {
          requestId,
          error: error.message,
          status: error.response?.status,
          data: error.response?.data
        });

        // Handle specific error cases
        if (error.response?.status === 401) {
          throw new Error('Authentication expired');
        }

        if (error.response?.status === 403) {
          throw new Error('Access denied');
        }

        if (error.response?.status === 404) {
          return {
            onboarding_status: 'business-info',
            current_step: 'business-info',
            subscription_status: 'not_started',
            tier: null
          };
        }

        throw error;
      }
    },
    enabled: status === 'authenticated',
    staleTime: 30000,
    retry: (failureCount, error) => {
      // Don't retry on auth errors
      if (error.message === 'Not authenticated' || 
          error.message === 'Authentication expired' ||
          error.message === 'Access denied') {
        return false;
      }
      return failureCount < 3;
    },
    onError: (error) => {
      logger.error('Onboarding status query error:', {
        requestId,
        error: error.message
      });

      if (error.message === 'Authentication expired') {
        signOut({ 
          callbackUrl: `/auth/signin?callbackUrl=${encodeURIComponent(window.location.pathname)}`
        });
      }
    },
    ...options,
  });
};

// Add form validation middleware
const validateFormData = (data, stepConfig) => {
  if (!stepConfig?.required_fields) return true;
  
  const missingFields = stepConfig.required_fields.filter(
    field => !data[field]
  );
  
  return missingFields.length === 0;
};


// Updated request interceptor
axiosInstance.interceptors.request.use(
  async (config) => {
      const requestId = crypto.randomUUID();
      
      try {
          const session = await getSession();
          const accessToken = session?.user?.accessToken;

          logger.debug('Request interceptor:', {
            requestId,
            hasToken: !!accessToken,
            url: config.url,
            method: config.method,
            // Add more debugging info
            tokenType: accessToken ? 'Bearer' : 'None',
            hasAuthHeader: !!config.headers.Authorization
        });


          if (accessToken && !config.headers.Authorization) {
            config.headers.Authorization = `Bearer ${accessToken}`;
          }

          // Ensure content type is set
          if (!config.headers['Content-Type']) {
              config.headers['Content-Type'] = 'application/json';
          }

          // Add request tracking
          config.headers['X-Request-ID'] = requestId;
          config.metadata = {
              startTime: Date.now(),
              requestId
          };

          return config;

       } catch (error) {
          logger.error('Request preparation failed:', {
              requestId,
              error: error.message,
              stack: error.stack,
              config: {
                  url: config.url,
                  method: config.method,
                  hasAuthHeader: !!config.headers.Authorization
              }
          });
          return Promise.reject(error);
      }
  },
  error => Promise.reject(error)
);



// Enhanced response interceptor with token refresh logic
axiosInstance.interceptors.response.use(
  // Success handler remains the same
  response => {
    const { config } = response;
    const duration = Date.now() - config.metadata?.startTime;
    const requestId = config.headers['X-Request-ID'];

    logger.debug('Response received:', {
      requestId,
      url: config.url,
      status: response.status,
      duration
    });

    return response;
  },

  // Error handler with improved queue processing
// Error handler with improved session management
async error => {
  const originalRequest = error.config;
  const requestId = originalRequest?.headers?.['X-Request-ID'] || crypto.randomUUID();

  logger.debug('Response error intercepted:', {
    requestId,
    url: originalRequest?.url,
    status: error.response?.status,
    errorMessage: error.message
  });

  // Skip if this is a retry or token verification request
  if (originalRequest?.skipAuthRefresh || originalRequest?.url?.includes('/api/token/verify')) {
    return Promise.reject(error);
  }

  if (error.response?.status === 401) {
    try {
      logger.debug('Attempting session refresh', { requestId });
      
      // Clear any stored tokens
      localStorage.removeItem('token');
      
      // Get fresh session from NextAuth
      const session = await getSession();
      
      if (!session?.user?.accessToken) {
        throw new Error('No valid session found');
      }

      // Update authorization header with new token
      originalRequest.headers.Authorization = `Bearer ${session.user.accessToken}`;
      
      logger.debug('Session refreshed, retrying request', { 
        requestId,
        url: originalRequest.url 
      });

      // Retry the original request
      return axiosInstance(originalRequest);
      
    } catch (refreshError) {
      logger.error('Session refresh failed:', {
        requestId,
        error: refreshError.message
      });

      // Clean up and redirect to login
      localStorage.clear();
      sessionStorage.clear();
      
      await signOut({
        redirect: true,
        callbackUrl: `/auth/signin?callbackUrl=${encodeURIComponent(window.location.pathname)}`
      });

      return Promise.reject(new Error('Session expired'));
    }
  }

  return Promise.reject(error);
}
);


// Export everything
export {
  useonboarding_status,
  useWebSocket,
  useSaveBusinessInfo,
  useSaveSubscription,
  checkDatabaseHealth,
  checkSession,
};

export const api = {
  onboarding: {
    saveBusinessInfo: async (data) => {
      const requestId = crypto.randomUUID();
      logger.debug('API saveBusinessInfo called:', {
        requestId,
        hasData: !!data
      });
      return axiosInstance.post(APP_CONFIG.api.endpoints.onboarding.businessInfo, data);
    },
    saveSubscription: async (data) => {
      const requestId = crypto.randomUUID();
      logger.debug('API saveSubscription called:', {
        requestId,
        selected_plan: data.selected_plan
      });
      return axiosInstance.post(APP_CONFIG.api.endpoints.onboarding.subscription, {
        ...data,
        tier: data.selected_plan
      });
    }
  }
};

export const useApi = {
  useonboarding_status,
  useWebSocket,
  useSaveBusinessInfo,
  useSaveSubscription,
  
};

export default {
  axiosInstance,
  queryClient,
  useApi,
  createWebSocket,
};
