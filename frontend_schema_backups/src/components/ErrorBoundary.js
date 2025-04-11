'use client';

import { Component } from 'react';
import { resetAllCircuitBreakers } from '@/utils/circuit-breaker';

/**
 * ErrorBoundary component to catch JavaScript errors in child components
 * and display a fallback UI instead of crashing the whole app
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console or an error reporting service
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
    
    // If there's an onError callback, call it
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleResetState = () => {
    try {
      // Reset circuit breakers to stop redirect loops
      resetAllCircuitBreakers();
      
      // Clear session storage and local storage
      sessionStorage.clear();
      localStorage.clear();
      
      this.setState({ 
        hasError: false,
        error: null,
        errorInfo: null,
        resetMessage: 'Application state reset successfully. Reloading...'
      });
      
      // Reload the page after a short delay
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    } catch (e) {
      this.setState({ 
        resetMessage: `Failed to reset state: ${e.message}. Try reloading manually.`
      });
    }
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return this.props.fallback || (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            <summary>Error details</summary>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
          {this.props.resetButton && (
            <button
              onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
              className="reset-button"
            >
              Try again
            </button>
          )}
        </div>
      );
    }

    // If there is no error, render children normally
    return this.props.children;
  }
}

// Default export for backward compatibility
export default ErrorBoundary;