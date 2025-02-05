'use client';

import React, { useState, useEffect, memo, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { CssBaseline } from '@mui/material';
import { ToastProvider } from '@/components/Toast/ToastProvider';
import { toast } from 'react-toastify';
import theme from '@/styles/theme';
import { AppErrorBoundary } from '@/components/ErrorBoundary';
import AuthWrapper from '@/app/AuthWrapper/AuthWrapper';
import { logger } from '@/utils/logger';
import { configureAmplify } from '@/config/amplify';
import dynamic from 'next/dynamic';

const CrispChatWrapper = dynamic(() => import('@/components/CrispChat/CrispChatWrapper').then(mod => mod.default), {
  ssr: false
});

const TOAST_MESSAGES = {
  INIT_ERROR: 'Failed to initialize client-side rendering',
  QUERY_ERROR: 'An error occurred while fetching data',
  MUTATION_ERROR: 'An error occurred while saving data',
  GLOBAL_ERROR: 'Something went wrong! Please try again later.',
  RESET_SUCCESS: 'Application reset successful',
  MOUNT_ERROR: 'Failed to initialize application',
};

// Create a new QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

const ToastAware = memo(function ToastAware({ children }) {
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (typeof window !== 'undefined') {
        toast.dismiss();
      }
    };
  }, []);

  return children;
});

const ClientOnly = memo(function ClientOnly({ children }) {
  const [mounted, setMounted] = useState(false);
  const mountedRef = useRef(false);
  const initializationTimer = useRef(null);
  useEffect(() => {
    if (initializationTimer.current) {
      clearTimeout(initializationTimer.current);
    }

    initializationTimer.current = setTimeout(() => {
      if (typeof window !== 'undefined' && !mountedRef.current) {
        try {
          setMounted(true);
          mountedRef.current = true;
          logger.info('Client-side rendering mounted');
        } catch (error) {
          logger.error('Client initialization error:', error);
          toast.error(TOAST_MESSAGES.INIT_ERROR);
        }
      }
    }, 100);

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
  }, []);

  if (!mounted) return null;

  return children;
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
  return (
    <AppErrorBoundary
      onError={(error, errorInfo) => {
        logger.error('Global error boundary caught error:', { error, errorInfo });
        if (typeof window !== 'undefined') {
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
              if (typeof window !== 'undefined') {
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

const ConfigureQueryClient = memo(function ConfigureQueryClient({ children }) {
  useEffect(() => {
    queryClient.setDefaultOptions({
      queries: {
        onError: (error) => {
          logger.error('Query error:', error);
          if (typeof window !== 'undefined') {
            toast.error(error.message || TOAST_MESSAGES.QUERY_ERROR);
          }
        },
      },
      mutations: {
        onError: (error) => {
          logger.error('Mutation error:', error);
          if (typeof window !== 'undefined') {
            toast.error(error.message || TOAST_MESSAGES.MUTATION_ERROR);
          }
        },
      },
    });
  }, []);

  return children;
});

const Providers = memo(function Providers({ children }) {
  useEffect(() => {
    try {
      configureAmplify();
      logger.info('Amplify configured successfully');
    } catch (error) {
      logger.error('Failed to configure Amplify:', error);
      if (typeof window !== 'undefined') {
        toast.error('Failed to initialize authentication');
      }
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ConfigureQueryClient>
          <ThemeWrapper>
            <ErrorWrapper>
              <AuthWrapper>
                <ToastAware>
                  <ClientOnly>
                    {children}
                    <CrispChatWrapper />
                  </ClientOnly>
                </ToastAware>
              </AuthWrapper>
            </ErrorWrapper>
          </ThemeWrapper>
        </ConfigureQueryClient>
        {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
      </ToastProvider>
    </QueryClientProvider>
  );
});

if (process.env.NODE_ENV !== 'production') {
  const PropTypes = require('prop-types');

  const providerPropTypes = {
    children: PropTypes.node.isRequired,
  };

  const components = {
    ClientOnly,
    ThemeWrapper,
    ErrorWrapper,
    Providers,
    ToastAware,
    ConfigureQueryClient,
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
