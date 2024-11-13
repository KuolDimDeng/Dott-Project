// src/app/layout.js
'use client';

import React, { Suspense, memo } from 'react';
import Providers from '@/providers';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '@/app/globals.css';
import { APP_CONFIG } from '@/config';

// Memoize the Loading component
const Loading = memo(function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500" />
    </div>
  );
});

// Extract Toast configuration
const TOAST_CONFIG = APP_CONFIG.toast || {
  position: "top-right",
  autoClose: 5000,
  hideProgressBar: false,
  newestOnTop: true,
  closeOnClick: true,
  rtl: false,
  pauseOnFocusLoss: true,
  draggable: true,
  pauseOnHover: true,
  theme: "light",
  limit: 3,
  style: {
    fontSize: '14px',
    padding: '16px',
  },
  toastStyle: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    padding: '16px',
  },
  toastClassName: "custom-toast-class"
};

// Memoize the ToastProvider component
const ToastProvider = memo(function ToastProvider() {
  return <ToastContainer {...TOAST_CONFIG} />;
});

// Memoize the Head component
const Head = memo(function Head() {
  const defaultMeta = {
    title: 'Dott: Small Business Platform',
    description: 'Small Business Platform',
    favicon: '/static/images/favicon.png'
  };

  return (
    <head>
      <link
        rel="icon"
        type="image/png"
        href={APP_CONFIG?.app?.favicon || defaultMeta.favicon}
      />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="description" content={APP_CONFIG?.app?.description || defaultMeta.description} />
      <title>{APP_CONFIG?.app?.title || defaultMeta.title}</title>
    </head>
  );
});

// Memoize the main content wrapper
const ContentWrapper = memo(function ContentWrapper({ children }) {
  return (
    <Suspense fallback={<Loading />}>
      <Providers>
        {children}
        <ToastProvider />
      </Providers>
    </Suspense>
  );
});

// Main layout component
const RootLayout = memo(function RootLayout({ children }) {
  return (
    <html lang="en">
      <Head />
      <body suppressHydrationWarning>
        <ContentWrapper>
          {children}
        </ContentWrapper>
      </body>
    </html>
  );
});

// Add prop-types for development
if (process.env.NODE_ENV !== 'production') {
  const PropTypes = require('prop-types');

  ContentWrapper.propTypes = {
    children: PropTypes.node.isRequired,
  };

  RootLayout.propTypes = {
    children: PropTypes.node.isRequired,
  };
}

// Error boundary component
const LayoutErrorBoundary = memo(class LayoutErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Layout Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <html>
          <body>
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
                <button 
                  onClick={() => window.location.reload()}
                  className="bg-blue-500 text-white px-4 py-2 rounded"
                >
                  Reload Page
                </button>
              </div>
            </div>
          </body>
        </html>
      );
    }

    return this.props.children;
  }
});

// Export based on environment
const ExportedLayout = process.env.NODE_ENV === 'development'
  ? (props) => (
      <LayoutErrorBoundary>
        <RootLayout {...props} />
      </LayoutErrorBoundary>
    )
  : RootLayout;

export default ExportedLayout;