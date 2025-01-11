///Users/kuoldeng/projectx/frontend/pyfactor_next/src/providers.js
'use client';

import React, { useState, useEffect, memo, useRef } from 'react';
import dynamic from 'next/dynamic';  // Add this line
import { QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '@mui/material/styles';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { CssBaseline } from '@mui/material';
import { ToastProvider, useToast } from '@/components/Toast/ToastProvider';
import theme from '@/styles/theme';
import { queryClient } from '@/lib/axiosConfig';
import { AppErrorBoundary } from '@/components/ErrorBoundary';
import { OnboardingProvider } from '@/app/onboarding/contexts/OnboardingContext';
import { AuthWrapper } from '@/app/AuthWrapper';
import { logger } from '@/utils/logger';

const TOAST_MESSAGES = {
  INIT_ERROR: 'Failed to initialize client-side rendering',
  QUERY_ERROR: 'An error occurred while fetching data',
  MUTATION_ERROR: 'An error occurred while saving data',
  GLOBAL_ERROR: 'Something went wrong! Please try again later.',
  RESET_SUCCESS: 'Application reset successful',
  MOUNT_ERROR: 'Failed to initialize application',
};

const CrispChatWrapper = dynamic(() => import('@/components/CrispChat/CrispChatWrapper'), {
  ssr: false
});

// Toast-aware component wrapper
const ToastAware = memo(function ToastAware({ children }) {
  const toast = useToast();
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (typeof window !== 'undefined' && toast) {
        toast.dismiss();
      }
    };
  }, [toast]);

  return children;
});

// Memoize the ClientOnly component
const ClientOnly = memo(function ClientOnly({ children }) {
  const [mounted, setMounted] = useState(false);
  const mountedRef = useRef(false);
  const initializationTimer = useRef(null);
  const toast = useToast();

  useEffect(() => {
    // Clear any existing timer
    if (initializationTimer.current) {
      clearTimeout(initializationTimer.current);
    }

    // Set a timeout to prevent rapid mount/unmount
    initializationTimer.current = setTimeout(() => {
      if (typeof window !== 'undefined' && !mountedRef.current) {
        try {
          setMounted(true);
          mountedRef.current = true;
          logger.info('Client-side rendering mounted');
        } catch (error) {
          logger.error('Client initialization error:', error);
          toast?.error(TOAST_MESSAGES.INIT_ERROR);
        }
      }
    }, 100); // Small delay to prevent rapid cycles

    return () => {
      if (initializationTimer.current) {
        clearTimeout(initializationTimer.current);
      }
      if (mountedRef.current) {
        mountedRef.current = false;
        setMounted(false);
        logger.info('Client-side rendering unmounted');
      }
    };
  }, [toast]);

  if (!mounted) return null;

  return children;
});

// Memoize individual providers
const QueryProvider = memo(function QueryProvider({ children }) {
  const toast = useToast();
  const configuredRef = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && !configuredRef.current && toast) {
      queryClient.setDefaultOptions({
        queries: {
          retry: 2,
          staleTime: 5 * 60 * 1000,
          cacheTime: 10 * 60 * 1000,
          refetchOnWindowFocus: false,
          onError: (error) => {
            logger.error('Query error:', error);
            toast.error(error.message || TOAST_MESSAGES.QUERY_ERROR);
          },
        },
        mutations: {
          retry: 1,
          onError: (error) => {
            logger.error('Mutation error:', error);
            toast.error(error.message || TOAST_MESSAGES.MUTATION_ERROR);
          },
        },
      });
      configuredRef.current = true;
    }
  }, [toast]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools position="bottom-right" />}
    </QueryClientProvider>
  );
});

const ThemeWrapper = memo(function ThemeWrapper({ children }) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const jssStyles = document.querySelector('#jss-server-side');
      if (jssStyles) {
        jssStyles.parentElement.removeChild(jssStyles);
      }
    }
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      {children}
    </ThemeProvider>
  );
});

const ErrorWrapper = memo(function ErrorWrapper({ children }) {
  const toast = useToast();

  return (
    <AppErrorBoundary
      onError={(error, errorInfo) => {
        logger.error('Global error boundary caught error:', { error, errorInfo });
        if (typeof window !== 'undefined' && toast) {
          toast.error(TOAST_MESSAGES.GLOBAL_ERROR);
        }
      }}
      fallback={({ error, resetError }) => (
        <div role="alert">
          <h2>Something went wrong!</h2>
          <pre>{error.message}</pre>
          <button
            onClick={() => {
              resetError();
              if (toast) {
                toast.success(TOAST_MESSAGES.RESET_SUCCESS);
              }
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            Try again
          </button>
        </div>
      )}
    >
      {children}
    </AppErrorBoundary>
  );
});

// Modify your Providers component to handle auth state internally
const Providers = memo(function Providers({ children }) {
  const initializationComplete = useRef(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!initializationComplete.current) {
      initializationComplete.current = true;
      setIsReady(true);
    }
    return () => {
      initializationComplete.current = false;
    };
  }, []);

  if (!isReady) return null;

  return (
    <ToastProvider>
      <SessionProvider>
        <QueryProvider>
          <ThemeWrapper>
            <ErrorWrapper>
              <OnboardingProvider>
                <AuthWrapper>
                  <ClientOnly>
                    {children}
                    <CrispChatWrapper />
                  </ClientOnly>
                </AuthWrapper>
              </OnboardingProvider>
            </ErrorWrapper>
          </ThemeWrapper>
        </QueryProvider>
      </SessionProvider>
    </ToastProvider>
  );
});

// Add prop-types validation
if (process.env.NODE_ENV !== 'production') {
  const PropTypes = require('prop-types');

  const providerPropTypes = {
    children: PropTypes.node.isRequired,
  };

  const components = {
    ClientOnly,
    QueryProvider,
    ThemeWrapper,
    ErrorWrapper,
    Providers,
    ToastAware,
  };

  Object.entries(components).forEach(([name, Component]) => {
    Component.displayName = name;
    Component.propTypes =
      name === 'ErrorWrapper'
        ? {
            ...providerPropTypes,
            fallback: PropTypes.func,
            onError: PropTypes.func,
          }
        : providerPropTypes;
  });
}

export default Providers;
