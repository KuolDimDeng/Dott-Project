///Users/kuoldeng/projectx/frontend/pyfactor_next/src/components/ErrorBoundary/ErrorBoundaryContext.js
import React from 'react';
import { createSafeContext, SafeWrapper } from '@/utils/ContextFix';

export const ErrorBoundaryContext = createSafeContext({
  handleError: (error) => {
    console.error('Uncaught error:', error);
  },
});

export const ErrorBoundaryProvider = ({ children }) => {
  const handleError = (error) => {
    // TODO: Add error reporting service integration
    console.error('Error captured:', error);
  };

  return (
    <ErrorBoundaryContext.Provider value={{ handleError }}>
      <SafeWrapper>{children}</SafeWrapper>
    </ErrorBoundaryContext.Provider>
  );
};