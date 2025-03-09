'use client';

import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { logger } from '@/utils/logger';
import { signOut } from '@/config/amplifyUnified';
import { useRouter } from 'next/navigation';

class AuthErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    logger.error('[AuthErrorBoundary] Error caught:', {
      error: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
  }

  handleSignOut = async () => {
    try {
      logger.debug('[AuthErrorBoundary] Attempting to sign out after error');
      const signOutResult = await signOut();
      if (signOutResult.success) {
        logger.debug('[AuthErrorBoundary] Sign out successful');
      } else {
        logger.debug('[AuthErrorBoundary] Sign out failed:', signOutResult.error);
      }
      window.location.href = '/auth/signin';
    } catch (error) {
      logger.error('[AuthErrorBoundary] Sign out failed:', error);
      // Force redirect even if sign out fails
      window.location.href = '/auth/signin';
    }
  };

  handleRetry = () => {
    logger.debug('[AuthErrorBoundary] Retrying after error');
    this.setState({ 
      hasError: false,
      error: null,
      errorInfo: null
    });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      logger.debug('[AuthErrorBoundary] Rendering error state:', {
        error: this.state.error?.message,
        name: this.state.error?.name,
        code: this.state.error?.code
      });

      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            p: 3,
            textAlign: 'center',
            gap: 2
          }}
        >
          <Typography variant="h5" color="error" gutterBottom>
            Authentication Error
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mb: 3 }}>
            We encountered an error with the authentication system. This could be due to an expired session or network issues.
          </Typography>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={this.handleSignOut}
            >
              Sign Out
            </Button>
            
            <Button
              variant="outlined"
              color="primary"
              onClick={this.handleRetry}
            >
              Retry
            </Button>
          </Box>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <Box sx={{ mt: 4, textAlign: 'left', width: '100%', maxWidth: 800 }}>
              <Typography variant="subtitle2" color="error" sx={{ mb: 1 }}>
                Error Details:
              </Typography>
              <Typography variant="body2" component="pre" sx={{
                p: 2,
                bgcolor: 'grey.100',
                borderRadius: 1,
                overflow: 'auto'
              }}>
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </Typography>
            </Box>
          )}
        </Box>
      );
    }

    // Simply return children without SafeWrapper to avoid Context.Consumer issues
    return this.props.children;
  }
}

export default AuthErrorBoundary;
