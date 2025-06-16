'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { handleAuthError, formatErrorForDisplay } from '@/utils/authErrorHandler';
import { logger } from '@/utils/logger';

/**
 * Error Display Component
 */
function ErrorDisplay({ error, onRetry, onDismiss }) {
  const { title, message, type, actionRequired, action } = formatErrorForDisplay(error);
  
  const getIcon = () => {
    switch (type) {
      case 'error':
        return (
          <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };
  
  const getBgColor = () => {
    switch (type) {
      case 'error': return 'bg-red-50 border-red-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      default: return 'bg-blue-50 border-blue-200';
    }
  };
  
  return (
    <div className={`rounded-lg border p-4 ${getBgColor()} animate-fadeIn`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">{getIcon()}</div>
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium ${
            type === 'error' ? 'text-red-800' : 
            type === 'warning' ? 'text-yellow-800' : 
            'text-blue-800'
          }`}>
            {title}
          </h3>
          <p className={`mt-1 text-sm ${
            type === 'error' ? 'text-red-700' : 
            type === 'warning' ? 'text-yellow-700' : 
            'text-blue-700'
          }`}>
            {message}
          </p>
          {actionRequired && (
            <div className="mt-3 flex space-x-3">
              {onRetry && action === 'retry' && (
                <button
                  onClick={onRetry}
                  className="text-sm font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:underline"
                >
                  Try Again
                </button>
              )}
              <button
                onClick={onDismiss}
                className="text-sm font-medium text-gray-600 hover:text-gray-500 focus:outline-none focus:underline"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Auth Error Boundary Component
 */
export default function AuthErrorBoundary({ children, onError }) {
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const router = useRouter();
  
  // Listen for auth errors
  useEffect(() => {
    const handleAuthError = (event) => {
      logger.error('[AuthErrorBoundary] Auth error event:', event.detail);
      setError(event.detail);
    };
    
    const handleSessionExpired = (event) => {
      logger.warn('[AuthErrorBoundary] Session expired event:', event.detail);
      router.push('/auth/signin?reason=session_expired');
    };
    
    const handleConcurrentSession = (event) => {
      logger.warn('[AuthErrorBoundary] Concurrent session event:', event.detail);
      setError({
        code: 'concurrent_session',
        message: 'You have been logged out because your account is being used in another location.'
      });
    };
    
    window.addEventListener('authError', handleAuthError);
    window.addEventListener('sessionExpired', handleSessionExpired);
    window.addEventListener('concurrentSession', handleConcurrentSession);
    
    return () => {
      window.removeEventListener('authError', handleAuthError);
      window.removeEventListener('sessionExpired', handleSessionExpired);
      window.removeEventListener('concurrentSession', handleConcurrentSession);
    };
  }, [router]);
  
  const handleError = useCallback((error) => {
    logger.error('[AuthErrorBoundary] Handling error:', error);
    
    const handled = handleAuthError(error);
    
    // Call parent error handler if provided
    if (onError) {
      onError(handled);
    }
    
    // Handle specific actions
    switch (handled.action) {
      case 'redirect_signin':
        router.push('/auth/signin?error=' + handled.code);
        break;
        
      case 'resend_verification':
        // TODO: Implement resend verification
        setError(handled);
        break;
        
      case 'reset_password':
        router.push('/auth/reset-password');
        break;
        
      case 'contact_support':
        window.location.href = 'mailto:support@dottapps.com?subject=Account Issue';
        break;
        
      case 'enable_cookies':
        setError({
          ...handled,
          message: handled.message + ' Click here for instructions on enabling cookies.',
          link: 'https://support.google.com/accounts/answer/61416'
        });
        break;
        
      case 'retry':
      case 'retry_payment':
        setError({ ...handled, canRetry: true });
        break;
        
      case 'wait':
        const waitTime = handled.waitTime || 60000;
        setError({
          ...handled,
          message: `${handled.message} (${Math.ceil(waitTime / 60000)} minutes remaining)`,
          canRetry: false
        });
        
        // Auto-clear after wait time
        setTimeout(() => {
          setError(null);
        }, waitTime);
        break;
        
      default:
        setError(handled);
    }
  }, [router, onError]);
  
  const retry = useCallback(() => {
    if (retryCount >= 3) {
      setError({
        message: 'Multiple retry attempts failed. Please refresh the page or contact support.',
        type: 'error',
        action: 'contact_support'
      });
      return;
    }
    
    setRetryCount(prev => prev + 1);
    setError(null);
    
    // Emit retry event
    window.dispatchEvent(new CustomEvent('authRetry', {
      detail: { attempt: retryCount + 1 }
    }));
  }, [retryCount]);
  
  const dismiss = useCallback(() => {
    setError(null);
    setRetryCount(0);
  }, []);
  
  // Error boundary error handler
  const errorBoundaryHandler = useCallback((error, errorInfo) => {
    logger.error('[AuthErrorBoundary] React error boundary caught:', { error, errorInfo });
    handleError(error);
  }, [handleError]);
  
  return (
    <ErrorBoundary onError={errorBoundaryHandler}>
      {error && (
        <div className="fixed top-4 right-4 z-50 max-w-md">
          <ErrorDisplay 
            error={error}
            onRetry={error.canRetry ? retry : null}
            onDismiss={dismiss}
          />
        </div>
      )}
      {children}
    </ErrorBoundary>
  );
}

/**
 * React Error Boundary Class Component
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full space-y-8 p-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">Something went wrong</h2>
              <p className="mt-2 text-gray-600">
                We're sorry, but something unexpected happened. Please refresh the page to try again.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      );
    }
    
    return this.props.children;
  }
}