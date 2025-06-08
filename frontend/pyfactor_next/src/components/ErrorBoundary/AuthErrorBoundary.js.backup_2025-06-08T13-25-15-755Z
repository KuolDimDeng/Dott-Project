'use client';

import React from 'react';
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
        <div
          className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center"
        >
          <h5 className="mb-2 text-xl font-semibold text-error-main">
            Authentication Error
          </h5>
          
          <p className="mb-6 max-w-[600px] text-gray-600 dark:text-gray-400">
            We encountered an error with the authentication system. This could be due to an expired session or network issues.
          </p>

          <div className="flex gap-4">
            <button
              className="rounded-md bg-primary-main px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
              onClick={this.handleSignOut}
            >
              Sign Out
            </button>
            
            <button
              className="rounded-md border border-primary-main bg-transparent px-4 py-2 text-sm font-medium text-primary-main hover:bg-primary-main/5"
              onClick={this.handleRetry}
            >
              Retry
            </button>
          </div>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <div className="mt-8 w-full max-w-[800px] text-left">
              <h6 className="mb-2 text-sm font-semibold text-error-main">
                Error Details:
              </h6>
              <pre className="overflow-auto rounded bg-gray-100 p-4 text-xs dark:bg-gray-800">
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </div>
          )}
        </div>
      );
    }

    // Simply return children without SafeWrapper to avoid Context.Consumer issues
    return this.props.children;
  }
}

export default AuthErrorBoundary;
