'use client';

import { Component } from 'react';
import { logger } from '@/utils/logger';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
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

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error || new Error("An unexpected error occurred"),
          resetError: () => this.setState({ hasError: false, error: null })
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

    return this.props.children;
  }
}

// Export as both named export and default export
export const AppErrorBoundary = ErrorBoundary;
export default ErrorBoundary;