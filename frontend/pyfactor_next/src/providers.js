// src/providers/Providers.js
'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '@mui/material/styles';
import { ErrorBoundary } from 'react-error-boundary';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Box, Button, Typography } from '@mui/material';
import { useState } from 'react';
import theme from '@/styles/theme';
import queryClient from '@/lib/queryClient';

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <Box
      role="alert"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      p={3}
    >
      <Typography variant="h6" color="error" gutterBottom>
        Something went wrong:
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {error.message}
      </Typography>
      <Button
        variant="contained"
        onClick={resetErrorBoundary}
        size="small"
      >
        Try again
      </Button>
    </Box>
  );
}

export default function Providers({ children }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <ThemeProvider theme={theme}>
            {children}
          </ThemeProvider>
        </ErrorBoundary>
      </SessionProvider>
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
    </QueryClientProvider>
  );
}