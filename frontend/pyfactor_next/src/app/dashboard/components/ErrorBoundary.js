'use client';

import React from 'react';
import { Box, Typography, Button, Alert } from '@mui/material';
import { logger } from '@/utils/logger';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to the console
    logger.error('Dashboard error caught by boundary:', {
      error: error.toString(),
      componentStack: errorInfo.componentStack,
      stack: error.stack
    });
    
    this.setState({ errorInfo });
    
    // Check for memory-related errors
    const errorString = error.toString();
    if (
      errorString.includes('out of memory') ||
      errorString.includes('heap') ||
      errorString.includes('allocation failed')
    ) {
      // Clear any pending schema setup to avoid getting stuck
      try {
        sessionStorage.removeItem('pendingSchemaSetup');
      } catch (e) {
        // Ignore errors when clearing session storage
      }
      
      // Try to free up memory
      if (global.gc) {
        try {
          global.gc();
        } catch (e) {
          console.error('Failed to force garbage collection', e);
        }
      }
    }
  }

  handleRetry = () => {
    // Clear any pending schema setup
    try {
      sessionStorage.removeItem('pendingSchemaSetup');
    } catch (e) {
      // Ignore errors when clearing session storage
    }
    
    // Increment retry count
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  }

  handleReload = () => {
    // Clear session storage and reload
    try {
      sessionStorage.clear();
    } catch (e) {
      // Ignore errors when clearing session storage
    }
    window.location.reload();
  }

  render() {
    if (this.state.hasError) {
      // Check if we've retried too many times
      const tooManyRetries = this.state.retryCount >= 3;
      
      // Render fallback UI
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            p: 3,
            textAlign: 'center'
          }}
        >
          <Alert severity="error" sx={{ mb: 3, maxWidth: 600 }}>
            Something went wrong while loading the dashboard.
          </Alert>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 600 }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Typography>
          
          {tooManyRetries ? (
            <Typography variant="body2" color="error" sx={{ mb: 3 }}>
              We've tried several times but the issue persists. Please try reloading the page.
            </Typography>
          ) : null}
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            {!tooManyRetries && (
              <Button 
                variant="contained" 
                color="primary"
                onClick={this.handleRetry}
              >
                Try Again
              </Button>
            )}
            
            <Button 
              variant="outlined" 
              color="secondary"
              onClick={this.handleReload}
            >
              Reload Dashboard
            </Button>
          </Box>
        </Box>
      );
    }

    // If there's no error, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary;
