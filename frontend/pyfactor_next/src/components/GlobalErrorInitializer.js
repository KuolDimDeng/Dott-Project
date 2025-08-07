'use client';

import { useEffect } from 'react';
import globalErrorHandler from '@/utils/globalErrorHandler';

/**
 * Component to initialize global error handling
 * Must be used in a client component to access window object
 */
export default function GlobalErrorInitializer() {
  useEffect(() => {
    // Initialize global error handler
    globalErrorHandler.init();

    // Add some custom event listeners for dashboard-specific error handling
    const handleNetworkError = (event) => {
      console.log('[GlobalErrorInitializer] Network error event received:', event.detail);
      // Could show a toast or update some global state here
    };

    const handleAuthError = (event) => {
      console.log('[GlobalErrorInitializer] Auth error event received:', event.detail);
      // Could show a auth error modal or redirect after a delay
    };

    const handleHydrationError = (event) => {
      console.log('[GlobalErrorInitializer] Hydration error event received:', event.detail);
      // Could show a message about refreshing the page
    };

    // Listen for custom error events
    window.addEventListener('networkError', handleNetworkError);
    window.addEventListener('authError', handleAuthError);
    window.addEventListener('hydrationError', handleHydrationError);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('networkError', handleNetworkError);
      window.removeEventListener('authError', handleAuthError);
      window.removeEventListener('hydrationError', handleHydrationError);
      globalErrorHandler.destroy();
    };
  }, []);

  // This component doesn't render anything
  return null;
}