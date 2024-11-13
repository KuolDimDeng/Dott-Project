// src/providers.js
'use client';

import React, { useState, useEffect, memo } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '@mui/material/styles';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { CssBaseline } from '@mui/material';
import theme from '@/styles/theme';
import { queryClient } from '@/lib/axiosConfig';
import { AppErrorBoundary } from '@/components/ErrorBoundary';
import { OnboardingProvider } from '@/app/onboarding/contexts/onboardingContext';

// Memoize the ClientOnly component
const ClientOnly = memo(function ClientOnly({ children }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted ? children : null;
});

// Memoize individual providers to prevent unnecessary re-renders
const QueryProvider = memo(function QueryProvider({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
    </QueryClientProvider>
  );
});

const ThemeWrapper = memo(function ThemeWrapper({ children }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
});

const ErrorWrapper = memo(function ErrorWrapper({ children }) {
  return (
    <AppErrorBoundary>
      {children}
    </AppErrorBoundary>
  );
});

// Main Providers component
const Providers = memo(function Providers({ children }) {
  return (
    <ClientOnly>
      <SessionProvider>
        <QueryProvider>
          <ErrorWrapper>
            <ThemeWrapper>
              <OnboardingProvider>
                {children}
              </OnboardingProvider>
            </ThemeWrapper>
          </ErrorWrapper>
        </QueryProvider>
      </SessionProvider>
    </ClientOnly>
  );
});

export default Providers;

// Add prop-types for better development experience
if (process.env.NODE_ENV !== 'production') {
  const PropTypes = require('prop-types');
  
  const providerPropTypes = {
    children: PropTypes.node.isRequired,
  };

  ClientOnly.propTypes = providerPropTypes;
  QueryProvider.propTypes = providerPropTypes;
  ThemeWrapper.propTypes = providerPropTypes;
  ErrorWrapper.propTypes = providerPropTypes;
  Providers.propTypes = providerPropTypes;
}