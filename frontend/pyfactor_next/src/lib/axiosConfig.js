// src/lib/axiosConfig.js

import axios from 'axios';
import { getSession, signOut } from "next-auth/react";
import { logger } from '@/utils/logger';

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
logger.info('Creating Axios instance with base URL:', baseURL);

const axiosInstance = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor
axiosInstance.interceptors.request.use(
  async (config) => {
    try {
      const session = await getSession();
      logger.debug('Current session:', session);
      
      if (session?.user?.accessToken) {
        config.headers.Authorization = `Bearer ${session.user.accessToken}`;
        logger.debug('Added auth header:', config.headers.Authorization);
      }
      
      return config;
    } catch (error) {
      logger.error('Request interceptor error:', error);
      return Promise.reject(error);
    }
  },
  (error) => Promise.reject(error)
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await signOut({ redirect: true, callbackUrl: '/auth/signin' });
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;