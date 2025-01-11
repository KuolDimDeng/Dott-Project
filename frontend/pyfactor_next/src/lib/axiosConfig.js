// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/lib/axiosConfig.js

'use client';

import axios from 'axios';
import { QueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { getSession, signOut, getCsrfToken, useSession } from 'next-auth/react';
import { logger } from '@/utils/logger';
import APP_CONFIG from '@/config';
import { useState, useEffect, useCallback } from 'react';

const RETRY_COUNT = 3;
const RETRY_DELAY = 1000;

const DATABASE_ERROR_TYPES = {
  NOT_FOUND: 'not_found',
  DELETED: 'deleted',
  UNHEALTHY: 'unhealthy',
  AUTH_ERROR: 'auth_error',
  UNKNOWN: 'unknown'
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
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
        if (error?.response?.status === 401) return false;
        return failureCount < 2;
      },
    },
  },
});

export const axiosInstance = axios.create({
  baseURL: APP_CONFIG.api.baseURL,
  timeout: APP_CONFIG.api.timeout || 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeoutErrorMessage: 'Request timed out - please try again',
});

const useWebSocket = (endpoint, options = {}) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    if (!session?.user?.accessToken) return;

    const ws = new WebSocket(`${APP_CONFIG.websocket.baseURL}${endpoint}`);
    
    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);
    ws.onerror = (error) => {
      logger.error('WebSocket error:', error);
      options.onError?.(error);
    };
    ws.onmessage = (event) => options.onMessage?.(JSON.parse(event.data));

    setSocket(ws);
    return () => ws.close();
  }, [endpoint, session?.user?.accessToken]);

  return { socket, isConnected };
};

const createWebSocket = (url, options = {}) => {
  const ws = new WebSocket(url);
  ws.onopen = options.onOpen;
  ws.onclose = options.onClose;
  ws.onerror = options.onError;
  ws.onmessage = options.onMessage;
  return ws;
};

export const authApi = {
  refreshToken: async (refreshToken) => {
    return axiosInstance.post('/api/auth/refresh', { refreshToken });
  }
};

// Hooks
const useSaveBusinessInfo = (options = {}) =>
  useMutation({
    mutationFn: async (data) => {
      const response = await axiosInstance.post(
        APP_CONFIG.api.endpoints.onboarding.businessInfo,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['onboardingStatus']);
    },
    ...options,
  });

  const useSaveSubscription = (options = {}) =>
    useMutation({
      mutationFn: async (data) => {
        // Add tier to request payload
        const requestData = {
          ...data,
          tier: data.selectedPlan // Ensure tier is included
        };
  
        const response = await axiosInstance.post(
          APP_CONFIG.api.endpoints.onboarding.subscription,
          requestData
        );
        return response.data;
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries(['onboardingStatus']);
        // Add tier to cached data
        queryClient.setQueryData(['onboardingStatus'], (old) => ({
          ...old,
          tier: data.tier
        }));
      },
      ...options,
    });

const useSavePayment = (options = {}) =>
  useMutation({
    mutationFn: async (data) => {
      const response = await axiosInstance.post(
        APP_CONFIG.api.endpoints.onboarding.payment,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['onboardingStatus']);
    },
    ...options,
  });

const useSetup = (options = {}) =>
  useMutation({
    mutationFn: async (data) => {
      const response = await axiosInstance.post(
        APP_CONFIG.api.endpoints.onboarding.setup.root,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['onboardingStatus']);
    },
    ...options,
  });

  const useOnboardingStatus = (options = {}) => {
    const { data: session, status } = useSession();
    
    return useQuery({
      queryKey: ['onboardingStatus'],
      queryFn: async () => {
        if (!session?.user?.accessToken) {
          throw new Error('Not authenticated');
        }
        const response = await axiosInstance.get(APP_CONFIG.api.endpoints.onboarding.status);
        // Include tier in response
        return {
          ...response.data,
          tier: response.data.tier || response.data.selectedPlan
        };
      },
      enabled: !!session?.user?.accessToken && status === 'authenticated',
      staleTime: 30000,
      ...options,
    });
  };

const checkDatabaseHealth = async (retryCount = 0) => {
  try {
    const response = await axiosInstance.get(APP_CONFIG.api.endpoints.database.healthCheck);
    
    if (response.data.status === 'deleted' || response.data.status === 'not_found') {
      await axiosInstance.post(APP_CONFIG.api.endpoints.database.reset);
      return {
        isHealthy: false,
        errorType: DATABASE_ERROR_TYPES.NOT_FOUND,
        requiresSetup: true
      };
    }

    return {
      isHealthy: response.data.status === 'healthy',
      errorType: response.data.status === 'unhealthy' ? DATABASE_ERROR_TYPES.UNHEALTHY : null
    };

  } catch (error) {
    if (retryCount < RETRY_COUNT) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return checkDatabaseHealth(retryCount + 1);
    }

    return {
      isHealthy: false,
      errorType: DATABASE_ERROR_TYPES.UNKNOWN,
      error: error.message
    };
  }
};

const checkSession = async () => {
  try {
    const session = await getSession();
    if (!session?.user?.accessToken || isTokenExpired(session)) {
      window.location.href = '/auth/signin';
      return false;
    }
    return true;
  } catch (error) {
    logger.error('Session check failed:', error);
    return false;
  }
};

const refreshSession = async () => {
  const timeout = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Session refresh timeout')), 10000)
  );

  try {
    const refreshPromise = (async () => {
      const session = await getSession();
      if (!session?.user?.refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await authApi.refreshToken(session.user.refreshToken);
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: response.access,
          refreshToken: response.refresh || session.user.refreshToken,
          accessTokenExpires: Date.now() + APP_CONFIG.auth.tokenGracePeriod,
        }),
      });
      return response;
    })();

    return Promise.race([refreshPromise, timeout]);
  } catch (error) {
    logger.error('Session refresh failed:', error);
    throw error;
  }
};

const useCompleteOnboarding = (options = {}) =>
  useMutation({
    mutationFn: async (data) => {
      const response = await axiosInstance.post(APP_CONFIG.api.endpoints.onboarding.complete, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['onboardingStatus']);
    },
    ...options,
  });

// Update axios interceptors
axiosInstance.interceptors.request.use(
  async (config) => {
    const requestId = crypto.randomUUID();

    logger.debug('Request interceptor:', {
      requestId,
      url: config.url,
      method: config.method
    });

    // Skip auth for certain routes
    if (config.skipAuthRefresh || 
      config.url.includes('/auth/signin') ||
      config.url.includes('/api/auth/session') ||
      config.url.includes('/api/auth/callback')) {
    return config;
    }

    try {
      const session = await getSession();

      // Add auth headers if we have a session
      if (session?.user?.accessToken) {
        config.headers.Authorization = `Bearer ${session.user.accessToken}`;
      }

      // Add CSRF protection
      const csrfToken = await getCsrfToken();
      if (csrfToken) {
        config.headers['X-CSRFToken'] = csrfToken;
      }

      // Add request tracking
      config.headers['X-Request-ID'] = requestId;
      config.metadata = { requestId, startTime: Date.now() };

      return config;
    } catch (error) {
      logger.error('Request interceptor failed:', {
        requestId,
        url: config.url,
        error: error.message
      });
      return Promise.reject(error);
    }
  },
  (error) => {
    logger.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Update response interceptor with better logging
axiosInstance.interceptors.response.use(
  (response) => {
    const { config } = response;
    const requestId = config.metadata?.requestId;
    const duration = Date.now() - (config.metadata?.startTime || 0);

    logger.debug('Response received:', {
      requestId,
      url: config.url,
      status: response.status,
      duration
    });

    return response;
  },
  async (error) => {
    const { config } = error.config || {};
    const requestId = config?.metadata?.requestId;
    const duration = Date.now() - (config?.metadata?.startTime || 0);

    // Log error details
    logger.error('Response error:', {
      requestId,
      url: config?.url,
      status: error.response?.status,
      duration,
      error: error.message
    });

    // Handle authentication errors
    if (error.response?.status === 401) {
      // Skip for auth-related endpoints to prevent loops
      if (config?.skipAuthRefresh || 
          config?.url.includes('/auth/') ||
          config?.url.includes('/api/auth/')) {
        return Promise.reject(error);
      }

      try {
        // Attempt to refresh token
        const session = await getSession();
        if (session?.user?.refreshToken) {
          const refreshResult = await refreshSession();
          if (refreshResult) {
            // Retry original request with new token
            const retryConfig = {
              ...config,
              headers: {
                ...config.headers,
                Authorization: `Bearer ${refreshResult.access}`
              }
            };
            return axiosInstance(retryConfig);
          }
        }

        // If refresh fails, redirect to sign in
        if (!window.location.pathname.includes('/auth/signin')) {
          const currentPath = encodeURIComponent(window.location.pathname);
          window.location.href = `/auth/signin?callbackUrl=${currentPath}`;
        }
      } catch (refreshError) {
        logger.error('Token refresh failed:', {
          requestId,
          error: refreshError.message
        });
      }
    }

    // Handle database errors
    if (error.response?.data?.status === 'unhealthy' || 
        error.response?.data?.status === 'not_found') {
      try {
        // Attempt database reset
        await axiosInstance.post(APP_CONFIG.api.endpoints.database.reset);
        
        // Redirect to onboarding if needed
        if (error.response?.data?.onboarding_required) {
          if (!window.location.pathname.includes('/onboarding/business-info')) {
            window.location.href = '/onboarding/business-info';
          }
        }
      } catch (resetError) {
        logger.error('Database reset failed:', {
          requestId,
          error: resetError.message
        });
        
        // Only redirect to error if not already there
        if (!window.location.pathname.includes('/error')) {
          window.location.href = '/onboarding/error';
        }
      }
    }

    // Handle service unavailability
    if (error.response?.status === 503) {
      logger.warn('Service unavailable:', {
        requestId,
        retryAfter: error.response.headers['retry-after']
      });
    }

    // Add request context to error
    error.requestId = requestId;
    error.duration = duration;
    
    return Promise.reject(error);
  }
);

export const api = {
  onboarding: {
    saveBusinessInfo: async (data) => {
      return axiosInstance.post(APP_CONFIG.api.endpoints.onboarding.businessInfo, data);
    },
    saveSubscription: async (data) => {
      return axiosInstance.post(APP_CONFIG.api.endpoints.onboarding.subscription, {
        ...data,
        tier: data.selectedPlan
      });
    },
    savePayment: async (data) => {
      return axiosInstance.post(APP_CONFIG.api.endpoints.onboarding.payment, data);
    },
    saveSetup: async (data) => {
      return axiosInstance.post(APP_CONFIG.api.endpoints.onboarding.setup.root, data);
    },
    getStatus: async () => {
      return axiosInstance.get(APP_CONFIG.api.endpoints.onboarding.status);
    },
  },
};

export const useApi = {
  useOnboardingStatus,
  useWebSocket,
  useSaveBusinessInfo,
  useSaveSubscription,
  useSavePayment,
  useSetup,
  useCompleteOnboarding,
};

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled Promise Rejection:', event.reason);
  });
}

export {
  useOnboardingStatus,
  useWebSocket,
  useSaveBusinessInfo,
  useSaveSubscription,
  useSavePayment,
  useSetup,
  useCompleteOnboarding,
  checkDatabaseHealth,
  checkSession,
  refreshSession,
};

export default {
  axiosInstance,
  queryClient,
  useApi,
  authApi,
  createWebSocket,
};