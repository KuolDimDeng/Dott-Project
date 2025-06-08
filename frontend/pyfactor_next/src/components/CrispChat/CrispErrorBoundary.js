'use client';


import React from 'react';
import { logger } from '@/utils/logger';

class CrispErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    logger.error('CrispChat Error:', {
      error,
      componentStack: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      // Return null to silently handle the error without affecting the UI
      return null;
    }

    return this.props.children;
  }
}

export default CrispErrorBoundary;
