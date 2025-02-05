import React from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Alert, Box } from '@mui/material';

function ErrorFallback({ error }) {
  return (
    <Box sx={{ p: 3 }}>
      <Alert severity="error">
        {error.message || 'An unexpected error occurred'}
      </Alert>
    </Box>
  );
}

export function ErrorWrapper({ children }) {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      {children}
    </ErrorBoundary>
  );
}
