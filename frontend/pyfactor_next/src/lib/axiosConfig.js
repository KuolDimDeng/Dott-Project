// src/lib/axiosConfig.js
'use client';

import axios from 'axios';
import { QueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { getSession, signOut, getCsrfToken } from 'next-auth/react';
import { logger } from '@/utils/logger';
import APP_CONFIG from '@/config'; // Change to default import
import { useState, useEffect, useCallback } from 'react';

// QueryClient Configuration
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

// Axios instance
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

// Token refresh state management
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
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

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}${path}?token=${encodeURIComponent(session.user.accessToken)}`;

    const ws = new WebSocket(wsUrl);

    ws.onerror = (error) => {
      logger.error('WebSocket error:', error);
      options.onError?.(error);
    };

    ws.onclose = (event) => {
      logger.info(`WebSocket closed with code ${event.code}`);
      options.onClose?.(event);
    };

    ws.onopen = () => {
      logger.info('WebSocket connected');
      options.onOpen?.();
    };

    return ws;
  } catch (error) {
    logger.error('Failed to create WebSocket:', error);
    throw error;
  }
};

// Auth API methods
// Update the refreshToken function
export const authApi = {
  refreshToken: async (refreshToken) => {
    try {
      logger.info('Attempting token refresh');
      const response = await axiosInstance.post(
        APP_CONFIG.api.endpoints.auth.refresh,
        { refresh: refreshToken },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          // Skip refresh token interceptor for this request
          skipAuthRefresh: true,
        }
      );
      logger.info('Token refresh successful');
      return response.data;
    } catch (error) {
      logger.error('Token refresh failed:', error);
      throw error;
    }
  },

  exchangeGoogleToken: async (idToken, accessToken) => {
    try {
      const response = await axiosInstance.post('/api/auth/google/', {
        token: idToken,
        access_token: accessToken,
      });
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
  },
};

const useWebSocket = (userId, options = {}) => {
  const [ws, setWs] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  const connect = useCallback(async () => {
    try {
      const socket = await createWebSocket(`/ws/onboarding/${userId}/`, {
        onOpen: () => {
          setIsConnected(true);
          setError(null);
          options.onOpen?.();
        },
        onError: (err) => {
          setError(err);
          setIsConnected(false);
          options.onError?.(err);
        },
        onClose: () => {
          setIsConnected(false);
          options.onClose?.();
        },
      });
      setWs(socket);
    } catch (err) {
      setError(err);
      logger.error('WebSocket connection failed:', err);
    }
  }, [userId, options]);

  useEffect(() => {
    let mounted = true;

    if (mounted) {
      connect();
    }

    return () => {
      mounted = false;
      if (ws?.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [connect, ws]);

  return { ws, isConnected, error, connect };
};

// Update the hooks to use correct URLs
const useSaveStep1 = (options = {}) =>
  useMutation({
    mutationFn: async (data) => {
      try {
        logger.debug('Making request to:', APP_CONFIG.api.endpoints.onboarding.step1);
        logger.debug('With data:', data);

        const response = await axiosInstance.post(
          // Use the config URL
          APP_CONFIG.api.endpoints.onboarding.step1,
          data
        );

        logger.info('Step 1 saved successfully');
        return response.data;
      } catch (error) {
        logger.error('Error saving Step 1:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['onboardingStatus']);
    },
    ...options,
  });

const useSaveStep2 = (options = {}) =>
  useMutation({
    mutationFn: async (data) => {
      try {
        logger.debug('Making request to:', APP_CONFIG.api.endpoints.onboarding.step2);
        logger.debug('With data:', data);

        const response = await axiosInstance.post(APP_CONFIG.api.endpoints.onboarding.step2, data);

        logger.info('Step 2 saved successfully');
        return response.data;
      } catch (error) {
        logger.error('Error saving Step 2:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['onboardingStatus']);
    },
    ...options,
  });

const useSaveStep3 = (options = {}) =>
  useMutation({
    mutationFn: async (data) => {
      const response = await axiosInstance.post('/api/onboarding/save-step3/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['onboardingStatus']);
    },
    ...options,
  });

const useSaveStep4 = (options = {}) =>
  useMutation({
    mutationFn: async (data) => {
      const response = await axiosInstance.post('/api/onboarding/step4/save/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['onboardingStatus']);
    },
    ...options,
  });

const useOnboardingStatus = (options = {}) => {
  const { data: session } = useSession();

  return useQuery({
    queryKey: ['onboardingStatus'],
    queryFn: async () => {
      if (!session?.user?.accessToken) {
        throw new Error('Not authenticated');
      }
      const response = await axiosInstance.get(APP_CONFIG.api.endpoints.onboarding.status);
      return response.data;
    },
    enabled: !!session?.user?.accessToken,
    staleTime: 30000,
    ...options,
  });
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

// Generic save step function
const useSaveStep = (step, options = {}) =>
  useMutation({
    mutationFn: async (data) => {
      try {
        const endpoint = APP_CONFIG.api.endpoints.onboarding[`step${step}`];
        if (!endpoint) {
          throw new Error(`Invalid step: ${step}`);
        }

        // Ensure we're sending an object and not an array or string
        if (typeof data !== 'object' || Array.isArray(data)) {
          throw new Error('Invalid data format');
        }

        logger.debug('Making request to:', endpoint);
        logger.debug('With data:', data);

        const response = await axiosInstance.post(endpoint, data);
        return response.data;
      } catch (error) {
        logger.error(`Error saving step ${step}:`, error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['onboardingStatus']);
    },
    ...options,
  });

// Update the useApi object
export const useApi = {
  useOnboardingStatus,
  useWebSocket,
  useSaveStep1,
  useSaveStep2,
  useSaveStep3,
  useSaveStep4,
  useSaveStep,
  useCompleteOnboarding,
};

const isTokenExpired = (session) => {
  if (!session?.user?.accessTokenExpires) return true;
  return Date.now() >= session.user.accessTokenExpires;
};

// Update axios interceptors
axiosInstance.interceptors.request.use(
  async (config) => {
    // Log full request details
    logger.debug('Request:', {
      url: config.url,
      method: config.method,
      data: config.data,
      headers: config.headers,
    });

    if (config.skipAuthRefresh) {
      return config;
    }

    try {
      const session = await getSession();

      if (session?.user?.accessToken) {
        config.headers.Authorization = `Bearer ${session.user.accessToken}`;
      }

      const csrfToken = await getCsrfToken();
      if (csrfToken) {
        config.headers['X-CSRFToken'] = csrfToken;
      }

      return config;
    } catch (error) {
      logger.error('Request interceptor error:', error);
      return config;
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
    logger.debug('Response:', {
      url: response.config.url,
      status: response.status,
      data: response.data,
      method: response.config.method,
    });
    return response;
  },
  async (error) => {
    logger.error('Response error:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
      method: error.config?.method,
      requestData: error.config?.data,
    });
    const originalRequest = error.config;

    // Don't retry refresh token requests
    if (originalRequest.skipAuthRefresh) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return axiosInstance(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const session = await getSession();
        if (!session?.user?.refreshToken) {
          throw new Error('No refresh token available');
        }

        const { access: newAccessToken } = await authApi.refreshToken(session.user.refreshToken);

        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        logger.error('Token refresh failed:', refreshError);

        // Clear session and redirect
        await signOut({
          redirect: true,
          callbackUrl: '/auth/signin?error=RefreshTokenFailed',
        });

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Add session management helper
export const refreshSession = async () => {
  try {
    const session = await getSession();
    if (!session?.user?.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await authApi.refreshToken(session.user.refreshToken);

    // Update session with new tokens
    await fetch('/api/auth/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accessToken: response.access,
        refreshToken: response.refresh || session.user.refreshToken,
        accessTokenExpires: Date.now() + APP_CONFIG.auth.tokenGracePeriod,
      }),
    });

    return response;
  } catch (error) {
    logger.error('Session refresh failed:', error);
    throw error;
  }
};

// Add direct API methods
export const api = {
  onboarding: {
    saveStep: async (step, data) => {
      const endpoint = APP_CONFIG.api.endpoints.onboarding[`step${step}`];
      if (!endpoint) {
        throw new Error(`Invalid step: ${step}`);
      }
      return axiosInstance.post(endpoint, data);
    },
    getStatus: async () => {
      return axiosInstance.get(APP_CONFIG.api.endpoints.onboarding.status);
    },
  },
};

// Global error handler
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled Promise Rejection:', event.reason);
  });
}

// Export individual hooks
export {
  useOnboardingStatus,
  useWebSocket,
  useSaveStep1,
  useSaveStep2,
  useSaveStep3,
  useSaveStep4,
  useSaveStep,
  useCompleteOnboarding,
};

// Default export
export default {
  axiosInstance,
  queryClient,
  useApi,
  authApi,
  createWebSocket,
};
