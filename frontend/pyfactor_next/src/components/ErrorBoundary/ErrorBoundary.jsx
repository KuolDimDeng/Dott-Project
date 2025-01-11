///Users/kuoldeng/projectx/frontend/pyfactor_next/src/components/ErrorBoundary/ErrorBoundary.jsx
'use client';

import React from 'react';
import { Box, Typography, Alert, Button, CircularProgress } from '@mui/material';
import { logger } from '@/utils/logger';
import PropTypes from 'prop-types';

// Base Error Boundary Component
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      requestId: crypto.randomUUID()
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    const { componentName = 'Unknown' } = this.props;
    logger.error('Error Boundary caught error:', {
      requestId: this.state.requestId,
      componentName,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString()
    });

    this.setState({ errorInfo });

    // Call onError prop if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = async () => {
    try {
      if (this.props.onReset) {
        await this.props.onReset();
      }
      this.setState({ 
        hasError: false, 
        error: null, 
        errorInfo: null 
      });
    } catch (error) {
      logger.error('Error boundary reset failed:', {
        requestId: this.state.requestId,
        error: error.message
      });
      window.location.reload();
    }
  };

  render() {
    const { hasError, error, requestId } = this.state;
    const { FallbackComponent, children } = this.props;

    if (hasError) {
      if (FallbackComponent) {
        return <FallbackComponent 
          error={error}
          resetErrorBoundary={this.handleReset}
          requestId={requestId}
        />;
      }

      // Default fallback UI
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
                onClick={this.handleReset}
              >
                Try Again
              </Button>
            }
            sx={{ maxWidth: 500, width: '100%' }}
          >
            An unexpected error occurred
          </Alert>
          <Typography variant="body2" color="text.secondary" align="center">
            Please try again or refresh the page.
            <br />
            Error ID: {requestId}
          </Typography>
        </Box>
      );
    }

    return children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  FallbackComponent: PropTypes.elementType,
  onError: PropTypes.func,
  onReset: PropTypes.func,
  componentName: PropTypes.string
};

// Export a HOC for easier usage
export const withErrorBoundary = (WrappedComponent, options = {}) => {
  function WithErrorBoundary(props) {
    return (
      <ErrorBoundary {...options}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  }

  WithErrorBoundary.displayName = `WithErrorBoundary(${
    options.componentName || 
    WrappedComponent.displayName || 
    WrappedComponent.name || 
    'Component'
  })`;

  return WithErrorBoundary;
};

// Create pre-configured app error boundary
export const AppErrorBoundary = ({ children, ...props }) => (
  <ErrorBoundary
    componentName="App"
    {...props}
  >
    {children}
  </ErrorBoundary>
);

AppErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired
};