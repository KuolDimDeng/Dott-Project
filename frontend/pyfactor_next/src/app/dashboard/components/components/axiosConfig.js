import axios from 'axios';
import { getSession, signOut } from "next-auth/react";
import logger from '@/utils/logger';

const baseURL = process.env.NEXT_PUBLIC_API_URL; 
const noAuthRequired = ['/api/register/', '/api/token/', '/api/token/refresh/'];
const onboardingEndpoints = ['/api/onboarding/start/', '/api/onboarding/save-step1/', '/api/onboarding/save-step2/', '/api/onboarding/complete/'];

console.log('Axios instance created with base URL:', baseURL);

const axiosInstance = axios.create({
  baseURL,
});

let isRefreshing = false;
let failedQueue = [];
let cachedSession = null;

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    error ? prom.reject(error) : prom.resolve(token);
  });
  failedQueue = [];
};

async function getSessionSafely() {
  if (cachedSession) return cachedSession;
  cachedSession = await getSession();
  return cachedSession;
}

async function refreshAccessToken(token) {
  try {
    const response = await axios.post(`${baseURL}/api/token/refresh/`, {
      refresh: token.refreshToken
    });
    const refreshedTokens = response.data;
    return {
      ...token,
      accessToken: refreshedTokens.access,
      refreshToken: refreshedTokens.refresh ?? token.refreshToken,
      accessTokenExpires: Date.now() + 55 * 60 * 1000,
    };
  } catch (error) {
    logger.error("Failed to refresh token:", error.message);
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

async function updateSession(refreshedToken) {
  try {
    const response = await fetch('/api/auth/update-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessToken: refreshedToken.accessToken,
        refreshToken: refreshedToken.refreshToken
      }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Failed to update session:', errorText);
    }
  } catch (error) {
    logger.error('Session update error:', error.message);
  }
}

// Axios request interceptor
axiosInstance.interceptors.request.use(
  async (config) => {
    const session = await getSessionSafely();
    if (session?.user && (!noAuthRequired.includes(config.url) || onboardingEndpoints.some(endpoint => config.url.includes(endpoint)))) {
      config.headers.Authorization = `Bearer ${session.user.accessToken}`;
    }
    return config;
  },
  (error) => {
    logger.error('Request interceptor error:', error.message);
    return Promise.reject(error);
  }
);

// Axios response interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return axiosInstance(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const session = await getSessionSafely();
        if (!session?.user?.refreshToken) throw new Error('No refresh token available');

        const refreshedToken = await refreshAccessToken(session.user);
        if (refreshedToken.error) throw new Error(refreshedToken.error);

        axiosInstance.defaults.headers.common['Authorization'] = 'Bearer ' + refreshedToken.accessToken;
        originalRequest.headers['Authorization'] = 'Bearer ' + refreshedToken.accessToken;

        await updateSession(refreshedToken);

        cachedSession = {
          ...cachedSession,
          user: {
            ...cachedSession.user,
            accessToken: refreshedToken.accessToken,
            refreshToken: refreshedToken.refreshToken
          }
        };

        processQueue(null, refreshedToken.accessToken);
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await signOut({ callbackUrl: '/auth/signin' });
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    logger.error('Response error:', error.message);
    return Promise.reject(error);
  }
);

export default axiosInstance;
