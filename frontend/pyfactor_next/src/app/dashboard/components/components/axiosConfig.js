import axios from 'axios';
import { getSession, signOut } from "next-auth/react";
import { logger } from '@/utils/logger';

const baseURL = process.env.NEXT_PUBLIC_API_URL;
const noAuthRequired = ['/api/register/', '/api/token/', '/api/token/refresh/'];

console.log('Axios instance created with base URL:', baseURL);

const axiosInstance = axios.create({
  baseURL,
});

let isRefreshing = false;
let failedQueue = [];
let cachedSession = null;

const processQueue = (error, token = null) => {
  console.log('Processing queue:', { queueLength: failedQueue.length, hasError: !!error, hasToken: !!token });
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

async function getSessionSafely() {
  console.log('Getting session safely');
  if (cachedSession) {
    console.log('Using cached session');
    return cachedSession;
  }
  console.log('Fetching new session');
  cachedSession = await getSession();
  return cachedSession;
}

async function refreshAccessToken(token) {
  console.log('Attempting to refresh access token');
  try {
    const response = await axios.post(`${baseURL}/api/token/refresh/`, {
      refresh: token.refreshToken
    });

    const refreshedTokens = response.data;
    console.log('Access token refreshed successfully', refreshedTokens);

    return {
      ...token,
      accessToken: refreshedTokens.access,
      refreshToken: refreshedTokens.refresh ?? token.refreshToken,
      accessTokenExpires: Date.now() + 55 * 60 * 1000, // 55 minutes
    };
  } catch (error) {
    console.error("RefreshAccessTokenError", error);
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

async function updateSession(refreshedToken) {
  console.log('Updating session with new tokens');
  try {
    const response = await fetch('/api/auth/update-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        accessToken: refreshedToken.accessToken,
        refreshToken: refreshedToken.refreshToken
      }),
    });
    if (response.ok) {
      console.log('Session updated successfully');
    } else {
      console.error('Failed to update session:', await response.text());
    }
  } catch (error) {
    console.error('Failed to update session:', error);
  }
}

// Request interceptor
axiosInstance.interceptors.request.use(
  async (config) => {
    console.log('Request interceptor - Start', { url: config.url });
    const session = await getSessionSafely();
    console.log('Request interceptor - Session:', session);
    if (session?.user && !noAuthRequired.includes(config.url)) {
      const token = session.user.accessToken;
      config.headers.Authorization = `Bearer ${token}`;
      console.log('Request interceptor - Token added to headers');
    } else {
      console.log('Request interceptor - No session, token, or auth not required for this route');
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    console.log('Response received', { status: response.status, url: response.config.url });
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    console.log('Response error interceptor', { status: error.response?.status, url: originalRequest.url });

    if (error.response?.status === 401 && !originalRequest._retry) {
      console.log('401 error detected, attempting token refresh');
      if (isRefreshing) {
        console.log('Token refresh already in progress, queueing request');
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          console.log('Retrying original request with new token');
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return axiosInstance(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const session = await getSessionSafely();
        if (!session?.user?.refreshToken) {
          throw new Error('No refresh token available');
        }

        const refreshedToken = await refreshAccessToken({
          refreshToken: session.user.refreshToken,
          accessToken: session.user.accessToken
        });

        if (refreshedToken.error) {
          throw new Error(refreshedToken.error);
        }

        console.log('Token refreshed successfully', refreshedToken);

        axiosInstance.defaults.headers.common['Authorization'] = 'Bearer ' + refreshedToken.accessToken;
        originalRequest.headers['Authorization'] = 'Bearer ' + refreshedToken.accessToken;

        // Update session with new tokens
        await updateSession(refreshedToken);

        // Update cached session
        cachedSession = {
          ...cachedSession,
          user: {
            ...cachedSession.user,
            accessToken: refreshedToken.accessToken,
            refreshToken: refreshedToken.refreshToken
          }
        };
        console.log('Cached session updated');

        processQueue(null, refreshedToken.accessToken);
        console.log('Retrying original request after token refresh');
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        processQueue(refreshError, null);
        await signOut({ callbackUrl: '/auth/signin' });
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    console.error('Response error', {
      status: error.response?.status,
      data: error.response?.data,
      url: originalRequest.url
    });

    return Promise.reject(error);
  }
);

export default axiosInstance;