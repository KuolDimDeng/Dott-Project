// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/lib/axiosConfig.js
'use client';

import axios from 'axios';
import { QueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { getSession, signOut, getCsrfToken, useSession } from 'next-auth/react';
import { logger } from '@/utils/logger';
import APP_CONFIG from '@/config';
import { useState, useEffect, useCallback } from 'react';

// Constants
const RETRY_COUNT = 3;
const RETRY_DELAY = 1000;
const REQUEST_TIMEOUT = 10000;

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
        const requestId = crypto.randomUUID();
        logger.debug('Query retry evaluation:', {
          requestId,
          failureCount,
          errorStatus: error?.response?.status,
          shouldRetry: error?.response?.status !== 401 && failureCount < 2
        });
        if (error?.response?.status === 401) return false;
        return failureCount < 2;
      },
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: true,
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
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL,
  timeout: APP_CONFIG.api.timeout || REQUEST_TIMEOUT,
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

// Auth API
export const authApi = {
  refreshToken: async (refreshToken) => {
    const requestId = crypto.randomUUID();
    logger.debug('Token refresh initiated:', {
      requestId,
      hasRefreshToken: !!refreshToken
    });
    // Remove the full URL since baseURL is already set
    return axiosInstance.post('/api/token/refresh/', { 
      refresh: refreshToken 
    });
  }
};

// Mutation hooks with detailed logging
const useSaveBusinessInfo = (options = {}) =>
  useMutation({
    mutationFn: async (data) => {
      const requestId = crypto.randomUUID();
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
    },
    onSuccess: (data, variables) => {
      logger.debug('Business info save succeeded:', {
        requestId: crypto.randomUUID(),
        dataReceived: !!data
      });
      queryClient.invalidateQueries(['onboardingStatus']);
    },
    onError: (error, variables, context) => {
      logger.error('Business info save failed:', {
        requestId: crypto.randomUUID(),
        error: error.message,
        data: variables
      });
    },
    ...options,
  });

const useSaveSubscription = (options = {}) =>
  useMutation({
    mutationFn: async (data) => {
      const requestId = crypto.randomUUID();
      const requestData = {
        ...data,
        tier: data.selectedPlan
      };

      logger.debug('Saving subscription:', {
        requestId,
        selectedPlan: data.selectedPlan,
        tier: requestData.tier
      });

      const response = await axiosInstance.post(
        APP_CONFIG.api.endpoints.onboarding.subscription,
        requestData
      );

      logger.debug('Subscription saved:', {
        requestId,
        status: response.status,
        responseData: response.data
      });

      return response.data;
    },
    onSuccess: (data) => {
      const requestId = crypto.randomUUID();
      logger.debug('Subscription save succeeded:', {
        requestId,
        tier: data.tier
      });
      
      queryClient.invalidateQueries(['onboardingStatus']);
      queryClient.setQueryData(['onboardingStatus'], (old) => {
        const updated = {
          ...old,
          tier: data.tier
        };
        logger.debug('Updated onboarding cache:', {
          requestId,
          previousTier: old?.tier,
          newTier: updated.tier
        });
        return updated;
      });
    },
    onError: (error, variables, context) => {
      const requestId = crypto.randomUUID();
      logger.error('Subscription save failed:', {
        requestId,
        error: error.message,
        selectedPlan: variables.selectedPlan
      });
    },
    ...options,
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

   const checkSession = async () => {
    const requestId = crypto.randomUUID();
    try {
      logger.debug('Checking session:', { requestId });
      const session = await getSession();
      
      if (!session?.user?.accessToken) {
        logger.debug('No valid session found:', { requestId });
        return false;
      }
      
      // Remove full URL
      const response = await axiosInstance.post(
        '/api/token/verify/',
        { token: session.user.accessToken },
        { skipAuthRefresh: true }
      );
  
      return response.status === 200;
      
    } catch (error) {
      logger.error('Session check failed:', {
        requestId,
        error: error.message
      });
      return false;
    }
  };
  
  const refreshSession = async () => {
    const requestId = crypto.randomUUID();
    logger.debug('Session refresh started:', { requestId });
  
    try {
      const session = await getSession();
      if (!session?.user?.refreshToken) {
        throw new Error('No refresh token available');
      }
  
      const response = await authApi.refreshToken(session.user.refreshToken);
      logger.debug('Token refresh succeeded:', {
        requestId,
        hasNewToken: !!response?.access
      });
  
      return response;
    } catch (error) {
      logger.error('Session refresh failed:', {
        requestId,
        error: error.message
      });
      throw error;
    }
  };

const useOnboardingStatus = (options = {}) => {
  const { data: session, status } = useSession();
  const requestId = crypto.randomUUID();

  return useQuery({
    queryKey: ['onboardingStatus'],
    queryFn: async () => {
      logger.debug('Fetching onboarding status:', {
        requestId,
        sessionStatus: status,
        hasToken: !!session?.user?.accessToken
      });

      if (!session?.user?.accessToken) {
        logger.debug('Onboarding status fetch failed:', {
          requestId,
          reason: 'No access token'
        });
        throw new Error('Not authenticated');
      }

      const response = await axiosInstance.get(APP_CONFIG.api.endpoints.onboarding.status);
      
      const responseData = {
        ...response.data,
        tier: response.data.tier || response.data.selectedPlan
      };

      logger.debug('Onboarding status fetched:', {
        requestId,
        status: responseData.status,
        tier: responseData.tier,
        onboardingStatus: responseData.onboardingStatus,
        currentStep: responseData.currentStep
      });

      return responseData;
    },
    enabled: !!session?.user?.accessToken && status === 'authenticated',
    staleTime: 30000,
    ...options,
  });
};

// Axios interceptors with enhanced logging
axiosInstance.interceptors.request.use(
  async (config) => {
    const requestId = crypto.randomUUID();

    logger.debug('Request interceptor started:', {
      requestId,
      url: config.url,
    });

    // Skip auth for public routes
    if (config.skipAuthRefresh || 
        config.url.includes('/auth/signin') ||
        config.url.includes('/api/token/') ||
        config.url.includes('/api/auth/')) {
      return config;
    }

    try {
      const session = await getSession();
      
      // Add Django JWT token
      if (session?.user?.accessToken) {
        config.headers.Authorization = `Bearer ${session.user.accessToken}`;
      }

      // Add Django CSRF token
      const csrfToken = await getCsrfToken();
      if (csrfToken) {
        config.headers['X-CSRFToken'] = csrfToken;
      }

      config.headers['X-Request-ID'] = requestId;
      
      return config;
    } catch (error) {
      logger.error('Request interceptor failed:', {
        requestId,
        error: error.message
      });
      return Promise.reject(error);
    }
  },
  (error) => Promise.reject(error)
);


axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config } = error.config || {};
    const requestId = config?.metadata?.requestId || crypto.randomUUID();

    // Handle Django token expiration (401 errors)
    if (error.response?.status === 401) {
      if (config?.skipAuthRefresh || 
          config?.url.includes('/api/token/') ||
          config?.url.includes('/api/auth/')) {
        return Promise.reject(error);
      }

      try {
        const session = await getSession();
        
        const refreshResponse = await axiosInstance.post(
          '/api/token/refresh/',  // Remove full URL here too
          { refresh: session?.user?.refreshToken },
          { skipAuthRefresh: true }
        );

        if (refreshResponse.data?.access) {
          // Need to update NextAuth session properly
          await fetch('/api/auth/session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              accessToken: refreshResponse.data.access
            })
          });

          // Then retry request
          return axiosInstance({
            ...config,
            headers: {
              ...config.headers,
              Authorization: `Bearer ${refreshResponse.data.access}`
            }
          });
        }
      } catch (refreshError) {
        logger.error('Token refresh failed:', {
          requestId,
          error: refreshError.message
        });
        
        // Redirect to login if refresh fails
        window.location.href = `/auth/signin?callbackUrl=${encodeURIComponent(window.location.pathname)}`;
      }
    }

    return Promise.reject(error);
  }
);

// Export everything
export {
  useOnboardingStatus,
  useWebSocket,
  useSaveBusinessInfo,
  useSaveSubscription,
  checkDatabaseHealth,
  checkSession,
  refreshSession,
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
        selectedPlan: data.selectedPlan
      });
      return axiosInstance.post(APP_CONFIG.api.endpoints.onboarding.subscription, {
        ...data,
        tier: data.selectedPlan
      });
    }
  }
};

export const useApi = {
  useOnboardingStatus,
  useWebSocket,
  useSaveBusinessInfo,
  useSaveSubscription,
  
};

export default {
  axiosInstance,
  queryClient,
  useApi,
  authApi,
  createWebSocket,
};