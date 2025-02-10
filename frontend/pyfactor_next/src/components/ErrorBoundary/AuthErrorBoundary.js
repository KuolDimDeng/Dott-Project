// src/app/AuthWrapper/AuthErrorBoundary.js
'use client';

import React, { memo } from 'react';
import { Auth } from '@aws-amplify/auth';
import {
  Box,
  Typography,
  Alert,
  Button,
  CircularProgress,
} from '@mui/material';
import { ErrorBoundary } from '@/components/ErrorBoundary/ErrorBoundary';
import { logger } from '@/utils/logger';
import PropTypes from 'prop-types';

// Shared loading component for consistent UX
const LoadingState = memo(function LoadingState({ message }) {
  logger.debug('Auth loading state rendered', { message });

  return (
    <Box
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      gap={2}
    >
      <CircularProgress />
      <Typography variant="body2" color="textSecondary">
        {message}
      </Typography>
    </Box>
  );
});

// Authentication-specific error fallback
const AuthErrorFallback = memo(function AuthErrorFallback({
  error,
  resetErrorBoundary,
  requestId,
}) {
  const [isResetting, setIsResetting] = React.useState(false);

  // Log error details when component mounts
  React.useEffect(() => {
    logger.error('Auth error boundary triggered', {
      requestId,
      error: error?.message,
      stack: error?.stack,
    });
  }, [error, requestId]);

  // Handle reset with loading state
  const handleReset = async () => {
    try {
      setIsResetting(true);
      await resetErrorBoundary();
    } catch (error) {
      logger.error('Auth reset failed', {
        requestId,
        error: error.message,
      });
      // Force reload on reset failure
      window.location.reload();
    } finally {
      setIsResetting(false);
    }
  };

  return (
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
            onClick={handleReset}
            disabled={isResetting}
          >
            {isResetting ? <CircularProgress size={20} /> : 'Try Again'}
          </Button>
        }
        sx={{ maxWidth: 500, width: '100%' }}
      >
        Authentication Error: Session may have expired
      </Alert>

      <Typography variant="body2" color="text.secondary" align="center">
        Please sign in again to continue.
        <br />
        Error Reference: {requestId}
      </Typography>

      <Button
        variant="outlined"
        color="primary"
        size="small"
        onClick={() => (window.location.href = '/auth/signin')}
      >
        Return to Sign In
      </Button>
    </Box>
  );
});

// Main authentication error boundary wrapper
export const WithAuthErrorBoundary = memo(function WithAuthErrorBoundary({
  children,
}) {
  // Handle authentication recovery

  const handleRecovery = React.useCallback(async () => {
    const recoveryId = crypto.randomUUID();
    logger.info('Starting auth recovery', { recoveryId });

    try {
      // Clear stored error states
      localStorage.removeItem('auth_error');
      sessionStorage.removeItem('auth_error');

      // Attempt to refresh session using Amplify Auth
      const currentUser = await Auth.currentAuthenticatedUser();

      if (!currentUser) {
        throw new Error('Invalid session state');
      }

      logger.info('Auth recovery successful', {
        recoveryId,
        hasUser: !!currentUser,
      });

      return true;
    } catch (error) {
      logger.error('Auth recovery failed', {
        recoveryId,
        error: error.message,
      });
      return false;
    }
  }, []);

  return (
    <ErrorBoundary
      componentName="Authentication"
      onReset={handleRecovery}
      FallbackComponent={AuthErrorFallback}
      onError={(error, info) => {
        logger.error('Auth error boundary caught error:', {
          error: error.message,
          componentStack: info.componentStack,
        });
      }}
    >
      {children}
    </ErrorBoundary>
  );
});

// Export components with proper prop types
LoadingState.propTypes = {
  message: PropTypes.string.isRequired,
};

AuthErrorFallback.propTypes = {
  error: PropTypes.shape({
    message: PropTypes.string,
    stack: PropTypes.string,
  }),
  resetErrorBoundary: PropTypes.func.isRequired,
  requestId: PropTypes.string.isRequired,
};

WithAuthErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
};

export { LoadingState, AuthErrorFallback };
