'use client';


import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { isPublicRoute } from '@/lib/authUtils';
import { SessionProvider } from '@/providers/SessionProvider';
import { CurrencyProvider } from '@/context/CurrencyContext';
import AuthWrapper from '@/app/AuthWrapper/AuthWrapper';
import { logger } from '@/utils/logger';
import { ToastProvider } from '@/components/Toast/ToastProvider';
import PostHogProvider from '@/components/providers/PostHogProvider';
import { SentryErrorBoundary } from '@/components/ErrorBoundary/SentryErrorBoundary';

// Create a new QueryClient instance with error logging
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      onError: (error) => {
        console.error('[QueryClient] Query error:', error);
      }
    },
    mutations: {
      retry: 1,
      onError: (error) => {
        console.error('[QueryClient] Mutation error:', error);
      }
    },
  },
});

// Simple error boundary component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error(`[ErrorBoundary] Error in ${this.props.name || 'component'}:`, error);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 m-4 border-2 border-orange-500 bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300 font-mono text-xs">
          <p>Error in {this.props.name || 'component'}: {this.state.error.message}</p>
        </div>
      );
    }
    
    return this.props.children;
  }
}

// Simple Providers component with minimal nesting
function Providers({ children }) {
  const pathname = usePathname();
  const isPublic = isPublicRoute(pathname);
  
  // Only render on client-side
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    logger.debug('[Providers] Component mounted');
    logger.debug('[Providers] Pathname changed:', { pathname, isPublic });
  }, [pathname, isPublic]);
  
  if (!mounted) {
    logger.debug('[Providers] Not mounted yet, returning null');
    return null;
  }
  
  logger.debug('[Providers] Rendering providers tree');
  
  return (
    <SentryErrorBoundary showDialog={process.env.NODE_ENV === 'production'}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          {/* Use SessionProvider for all routes */}
          <SessionProvider>
            <PostHogProvider>
              {!isPublic && !pathname.startsWith('/auth/') ? (
                <AuthWrapper>
                  <CurrencyProvider>
                    {children}
                  </CurrencyProvider>
                </AuthWrapper>
              ) : (
                children
              )}
            </PostHogProvider>
          </SessionProvider>
        </ToastProvider>
      </QueryClientProvider>
    </SentryErrorBoundary>
  );
}

// Export the Providers component directly
export default React.memo(Providers);
