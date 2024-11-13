// src/lib/axiosConfig.js
'use client';

import axios from 'axios';
import { QueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { getSession, signOut, getCsrfToken } from "next-auth/react"; // Add getCsrfToken
import { logger } from '@/utils/logger';
import { APP_CONFIG } from '@/config';
import { useState, useEffect, useCallback } from 'react'; // Add useCallback

// QueryClient Configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Axios instance
export const axiosInstance = axios.create({
  baseURL: APP_CONFIG.api.baseURL,
  timeout: APP_CONFIG.api.timeout,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Add token management
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// WebSocket helper
export const createWebSocket = async (path, options = {}) => {
  try {
    const session = await getSession();
    if (!session?.user?.accessToken) {
      throw new Error('No authentication token available');
    }

    const wsUrl = `${APP_CONFIG.websocket.baseURL}${path}`;
    const ws = new WebSocket(wsUrl);

    ws.onerror = (error) => {
      logger.error('WebSocket error:', error);
      options.onError?.(error);
    };

    return ws;
  } catch (error) {
    logger.error('Failed to create WebSocket:', error);
    throw error;
  }
};

// Auth API methods
export const authApi = {
  refreshToken: async (refreshToken) => {
    try {
      const response = await axios.post(
        `${APP_CONFIG.api.baseURL}${APP_CONFIG.api.endpoints.auth.refresh}`,
        { refresh: refreshToken }
      );
      return response.data;
    } catch (error) {
      logger.error('Token refresh failed:', error);
      throw error;
    }
  },

  exchangeGoogleToken: async (idToken, accessToken) => {
    try {
      const response = await axiosInstance.post(
        APP_CONFIG.api.endpoints.auth.google,
        {
          token: idToken,
          access_token: accessToken
        }
      );
      return response.data;
    } catch (error) {
      logger.error('Google token exchange failed:', error);
      throw error;
    }
  },

  refreshSession: async (refreshTokenValue) => {
    try {
      return await authApi.refreshToken(refreshTokenValue);
    } catch (error) {
      logger.error('Session refresh failed:', error);
      throw error;
    }
  }
};

// React Query hooks
export const useApi = {
  useOnboardingStatus: (options = {}) => {
    const { data: session } = useSession();
    
    return useQuery({
      queryKey: [APP_CONFIG.onboarding.queryKeys.status],
      queryFn: async () => {
        if (!session?.user?.accessToken) {
          throw new Error('Not authenticated');
        }
        const response = await axiosInstance.get(APP_CONFIG.api.endpoints.onboarding.status);
        return response.data;
      },
      enabled: !!session?.user?.accessToken,
      staleTime: 30000,
      retry: (failureCount, error) => {
        // Don't retry on auth errors
        if (error?.response?.status === 401) return false;
        return failureCount < 3;
      },
      ...options,
    });
  },

  useWebSocket: (userId, options = {}) => {
    const [ws, setWs] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
      let mounted = true;
      let socket = null;

      const connect = async () => {
        try {
          socket = await createWebSocket(
            APP_CONFIG.websocket.endpoints.onboarding(userId),
            {
              onError: (err) => {
                if (mounted) {
                  setError(err);
                  setIsConnected(false);
                  options.onError?.(err);
                }
              }
            }
          );

          if (mounted) {
            setWs(socket);
            setIsConnected(true);
            setError(null);
          }
        } catch (err) {
          if (mounted) {
            setError(err);
            logger.error('WebSocket connection failed:', err);
          }
        }
      };

      connect();

      return () => {
        mounted = false;
        if (socket) socket.close();
      };
    }, [userId, options.onError]);

    return { ws, isConnected, error };
  },

  useSaveStep1: (options = {}) =>
    useMutation({
      mutationFn: async (data) => {
        const response = await axiosInstance.post(APP_CONFIG.api.endpoints.onboarding.step1, data);
        return response.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries([APP_CONFIG.onboarding.queryKeys.status]);
      },
      ...options,
    }),

  useSaveStep2: (options = {}) =>
    useMutation({
      mutationFn: async (data) => {
        const response = await axiosInstance.post(APP_CONFIG.api.endpoints.onboarding.step2, data);
        return response.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries([APP_CONFIG.onboarding.queryKeys.status]);
      },
      ...options,
    }),

  useSaveStep3: (options = {}) =>
    useMutation({
      mutationFn: async (data) => {
        const response = await axiosInstance.post(APP_CONFIG.api.endpoints.onboarding.step3, data);
        return response.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries([APP_CONFIG.onboarding.queryKeys.status]);
      },
      ...options,
    }),

  useSaveStep4: (options = {}) =>
    useMutation({
      mutationFn: async (data) => {
        const response = await axiosInstance.post(APP_CONFIG.api.endpoints.onboarding.step4, data);
        return response.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries([APP_CONFIG.onboarding.queryKeys.status]);
      },
      ...options,
    }),

  useCompleteOnboarding: (options = {}) =>
    useMutation({
      mutationFn: async (data) => {
        const response = await axiosInstance.post(APP_CONFIG.api.endpoints.onboarding.complete, data);
        return response.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries([APP_CONFIG.onboarding.queryKeys.status]);
      },
      ...options,
    }),
};

// Axios interceptors
axiosInstance.interceptors.request.use(
  async (config) => {
    try {
      const session = await getSession();
      
      if (session?.user?.accessToken) {
        config.headers.Authorization = `Bearer ${session.user.accessToken}`;
      }
      
      try {
        const csrfToken = await getCsrfToken();
        if (csrfToken) {
          config.headers['X-CSRFToken'] = csrfToken;
        }
      } catch (csrfError) {
        logger.warn('Failed to get CSRF token:', csrfError);
      }

      return config;
    } catch (error) {
      logger.error('Request interceptor error:', error);
      return Promise.reject(error);
    }
  },
  (error) => Promise.reject(error)
);


axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        try {
          const token = await new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          });
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          return axiosInstance(originalRequest);
        } catch (err) {
          return Promise.reject(err);
        }
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const session = await getSession();
        if (session?.user?.refreshToken) {
          const tokens = await authApi.refreshToken(session.user.refreshToken);
          originalRequest.headers['Authorization'] = `Bearer ${tokens.access}`;
          processQueue(null, tokens.access);
          return axiosInstance(originalRequest);
        }
      } catch (refreshError) {
        processQueue(refreshError);
        logger.error('Token refresh failed:', refreshError);
        await signOut({ 
          redirect: true, 
          callbackUrl: APP_CONFIG.routes.auth.signIn 
        });
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Add cleanup for WebSocket connections
const cleanupWebSocket = (ws) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.close();
  }
};


// Error handler
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled Promise Rejection:', event.reason);
  });
}

export default {
  axiosInstance,
  queryClient,
  useApi,
  authApi,
  createWebSocket,
  cleanupWebSocket
};