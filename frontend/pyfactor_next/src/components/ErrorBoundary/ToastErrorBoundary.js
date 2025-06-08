'use client';

// src/components/ErrorBoundary/ToastErrorBoundary.js

import React from 'react';

export class ToastErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Toast Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return null;
    }

    return this.props.children;
  }
}

// Usage in ToastProvider
export const ToastProvider = memo(function ToastProvider() {
  return (
    <ToastErrorBoundary>
      <div ref={containerRef}>
        <ToastContainer {...TOAST_CONFIG} />
      </div>
    </ToastErrorBoundary>
  );
});
