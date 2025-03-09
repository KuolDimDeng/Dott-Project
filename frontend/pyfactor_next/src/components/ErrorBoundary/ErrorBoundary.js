'use client';

import { Component } from 'react';
import { logger } from '@/utils/logger';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
    // Bind the resetError method to the component instance
    this.resetError = this.resetError.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    logger.error('[ErrorBoundary] Caught error:', {
      error: error.toString(),
      errorInfo,
      context: this.props.context || 'unknown'
    });
    
    // Call the onError prop if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  // Method to reset the error state
  resetError() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error || new Error("An unexpected error occurred"),
          resetError: this.resetError
        });
      }
      
      // Default fallback
      return (
        <div className="error-fallback">
          <h2>Something went wrong</h2>
          <p>Our team has been notified. Please try refreshing the page.</p>
        </div>
      );
    }

    // Simply return children without SafeWrapper to avoid Context.Consumer issues
    return this.props.children;
  }
}

// Export as both named export and default export
export const AppErrorBoundary = ErrorBoundary;
export default ErrorBoundary;