'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';
import { toast } from 'react-hot-toast';

// Global error handler for React Query
const queryErrorHandler = (error) => {
  const message = error?.response?.data?.error || error?.message || 'Something went wrong';
  
  // Don't show error for 401s (handled by auth)
  if (error?.response?.status !== 401) {
    toast.error(message);
  }
};

// Create a client with optimal settings
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Stale time: How long until a query is considered stale
        staleTime: 5 * 60 * 1000, // 5 minutes
        
        // Cache time: How long to keep unused data in cache
        cacheTime: 10 * 60 * 1000, // 10 minutes
        
        // Retry logic
        retry: (failureCount, error) => {
          // Don't retry on 4xx errors
          if (error?.response?.status >= 400 && error?.response?.status < 500) {
            return false;
          }
          // Retry up to 3 times for other errors
          return failureCount < 3;
        },
        
        // Retry delay
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        
        // Refetch on window focus (good for fresh data)
        refetchOnWindowFocus: false,
        
        // Refetch on reconnect
        refetchOnReconnect: 'always',
        
        // Error handler
        onError: queryErrorHandler,
      },
      mutations: {
        // Error handler for mutations
        onError: queryErrorHandler,
        
        // Retry logic for mutations
        retry: 1,
        retryDelay: 1000,
      },
    },
  });
}

let browserQueryClient = undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

export function QueryProvider({ children }) {
  // NOTE: Avoid useState for query client if you don't
  // have a suspense boundary between this and the code that uses it.
  const [queryClient] = useState(() => getQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} position="bottom-right" />
      )}
    </QueryClientProvider>
  );
}