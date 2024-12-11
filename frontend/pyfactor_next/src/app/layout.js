'use client';

import React, { Suspense, memo, useEffect } from 'react';
import Providers from '@/providers';
import '@/app/globals.css';
import { APP_CONFIG } from '@/config';
import { logger } from '@/utils/logger';
import { ToastProvider, useToast } from '@/components/Toast/ToastProvider';

// Memoize the Loading component
const Loading = memo(function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500" />
    </div>
  );
});

// Create a ToastAware wrapper component
const ToastAware = memo(function ToastAware({ children }) {
  const toast = useToast();

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && toast) {
        toast.dismiss();
      }
    };
  }, [toast]);

  return children;
});

// Memoize the Head component
const Head = memo(function Head() {
  const defaultMeta = {
    title: 'Dott: Small Business Platform',
    description: 'Small Business Platform',
    favicon: '/static/images/favicon.png',
  };

  return (
    <>
      <link rel="icon" type="image/png" href={APP_CONFIG?.app?.favicon || defaultMeta.favicon} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="description" content={APP_CONFIG?.app?.description || defaultMeta.description} />
      <title>{APP_CONFIG?.app?.title || defaultMeta.title}</title>
    </>
  );
});

// Memoize the main content wrapper
const ContentWrapper = memo(function ContentWrapper({ children }) {
  return (
    <Suspense fallback={<Loading />}>
      <Providers>{children}</Providers>
    </Suspense>
  );
});

// Main layout component - Notice the html and body tags are here
const RootLayout = memo(function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <Head />
      </head>
      <body suppressHydrationWarning>
        <ContentWrapper>{children}</ContentWrapper>
      </body>
    </html>
  );
});

// Error boundary component
const LayoutErrorBoundary = memo(
  class LayoutErrorBoundary extends React.Component {
    constructor(props) {
      super(props);
      this.state = {
        hasError: false,
        isClient: false,
      };
    }

    componentDidMount() {
      this.setState({ isClient: true });
    }

    static getDerivedStateFromError(error) {
      return { hasError: true };
    }

    showToast = (type, message) => {
      if (typeof window !== 'undefined' && this.state.isClient && this.props.toast) {
        this.props.toast[type](message);
      }
    };

    componentDidCatch(error, errorInfo) {
      logger.error('Layout Error:', { error, errorInfo });
      this.showToast('error', 'A critical error occurred. Please reload the page.');
    }

    handleReload = () => {
      try {
        if (typeof window !== 'undefined' && this.state.isClient) {
          this.setState({ hasError: false });
          this.showToast('success', 'Reloading application...');

          setTimeout(() => {
            if (this.state.isClient) {
              window.location.reload();
            }
          }, 1000);
        }
      } catch (error) {
        logger.error('Reload error:', error);
        this.showToast('error', 'Failed to reload. Please try again.');
      }
    };

    render() {
      if (this.state.hasError) {
        return (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
              <p className="text-gray-600 mb-4">
                We're sorry for the inconvenience. Please try reloading the page.
              </p>
              <button
                onClick={this.handleReload}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        );
      }

      return this.props.children;
    }
  }
);

// No need for ContentWrapper anymore since we're restructuring
const ErrorBoundaryWithToast = memo(function ErrorBoundaryWithToast(props) {
  const toast = useToast();
  return <LayoutErrorBoundary {...props} toast={toast} />;
});

// Simplified export - no conditional wrapping
export default RootLayout;

// Add prop-types for development
if (process.env.NODE_ENV !== 'production') {
  const PropTypes = require('prop-types');

  const childrenProp = PropTypes.node.isRequired;

  ToastAware.propTypes = { children: childrenProp };
  RootLayout.propTypes = { children: childrenProp };
  LayoutErrorBoundary.propTypes = {
    children: childrenProp,
    toast: PropTypes.shape({
      error: PropTypes.func.isRequired,
      success: PropTypes.func.isRequired,
    }),
  };
  ErrorBoundaryWithToast.propTypes = {
    children: childrenProp,
  };
}
