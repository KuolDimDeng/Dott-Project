// src/providers.js
'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '@mui/material/styles';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Box, CssBaseline } from '@mui/material';
import { useState, useEffect } from 'react';
import theme from '@/styles/theme';
import queryClient from '@/lib/queryClient';
import { AppErrorBoundary } from '@/components/ErrorBoundary';

function ClientOnly({ children }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  return mounted ? children : null;
}

export default function Providers({ children }) {
  return (
    <ClientOnly>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <AppErrorBoundary>
            <ThemeProvider theme={theme}>
              <CssBaseline />
              {children}
            </ThemeProvider>
          </AppErrorBoundary>
        </SessionProvider>
        {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
      </QueryClientProvider>
    </ClientOnly>
  );
}