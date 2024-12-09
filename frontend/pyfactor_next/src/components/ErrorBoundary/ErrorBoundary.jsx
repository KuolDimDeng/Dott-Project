'use client';

import React from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { Box, Typography, Button, Alert, CircularProgress } from '@mui/material';
import { logger } from '@/utils/logger';

const ErrorFallback = ({ error, resetErrorBoundary, isLoading }) => (
  <Box
    display="flex"
    flexDirection="column"
    justifyContent="center"
    alignItems="center"
    minHeight="100vh"
    p={3}
    gap={2}
  >
    <Alert
      severity="error"
      action={
        <Button 
          color="inherit" 
          size="small" 
          onClick={resetErrorBoundary}
          disabled={isLoading}
        >
          {isLoading ? <CircularProgress size={20} /> : 'Try Again'}
        </Button>
      }
      sx={{ maxWidth: 500, width: '100%' }}
    >
      {error?.message || 'An unexpected error occurred'}
    </Alert>
    <Typography variant="body2" color="text.secondary">
      {error?.cause || 'Please try again or contact support if the problem persists'}
    </Typography>
  </Box>
);

const logErrorToService = (error, info) => {
  logger.error('Error caught by boundary:', {
    error: error.message,
    stack: error.stack,
    componentStack: info.componentStack,
    timestamp: new Date().toISOString(),
    url: window?.location?.href
  });
};

export const AppErrorBoundary = ({ children, FallbackComponent = ErrorFallback, onReset }) => {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleReset = async () => {
    try {
      setIsLoading(true);
      await onReset?.();
      logger.info('Error boundary reset successful');
    } catch (error) {
      logger.error('Error boundary reset failed:', error);
      window.location.href = '/';
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ReactErrorBoundary
      FallbackComponent={(props) => <FallbackComponent {...props} isLoading={isLoading} />}
      onError={logErrorToService}
      onReset={handleReset}
    >
      {children}
    </ReactErrorBoundary>
  );
};

export const withErrorBoundary = (WrappedComponent, options = {}) => {
  function WithErrorBoundaryComponent(props) {
    const [isLoading, setIsLoading] = React.useState(false);

    const handleReset = async () => {
      try {
        setIsLoading(true);
        await options.onReset?.();
      } catch (error) {
        logger.error('Component reset failed:', error);
        window.location.href = '/';
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <ReactErrorBoundary
        FallbackComponent={(fallbackProps) => (
          <ErrorFallback {...fallbackProps} isLoading={isLoading} />
        )}
        onError={(error, info) => {
          logErrorToService(error, info);
          options.onError?.(error, info);
        }}
        onReset={handleReset}
        {...options}
      >
        <WrappedComponent {...props} />
      </ReactErrorBoundary>
    );
  }

  WithErrorBoundaryComponent.displayName = 
    `WithErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return WithErrorBoundaryComponent;
};

export { ReactErrorBoundary as ErrorBoundary };