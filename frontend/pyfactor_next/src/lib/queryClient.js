// src/lib/queryClient.js

import { QueryClient } from '@tanstack/react-query';
import { logger } from '@/utils/logger';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: (failureCount, error) => {
        if (error?.response?.status === 401) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
      onError: (error) => {
        logger.error('Query error:', error);
      }
    },
    mutations: {
      retry: 1,
      onError: (error) => {
        logger.error('Mutation error:', error);
      }
    },
  },
});

export default queryClient;