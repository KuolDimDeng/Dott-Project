'use client';

///Users/kuoldeng/projectx/frontend/pyfactor_next/src/components/ErrorBoundary/ErrorBoundary.js

import { useState } from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';

// Custom error fallback component
function ErrorFallback({ error, resetErrorBoundary, isLoading = false }) {
  const { t } = useTranslation();
  
  return (
    <div className="p-6 rounded-lg bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-lg font-medium text-red-800 dark:text-red-200">
            {t('error.title', 'Something went wrong')}
          </h3>
          <div className="mt-2 text-sm text-red-700 dark:text-red-300">
            <p>{error.message || t('error.unknown', 'An unexpected error occurred')}</p>
          </div>
          
          {process.env.NODE_ENV === 'development' && error.stack && (
            <details className="mt-4 cursor-pointer">
              <summary className="text-xs font-medium text-red-800 dark:text-red-200">
                {t('error.details', 'Error details')}
              </summary>
              <pre className="mt-2 text-xs text-red-800 dark:text-red-200 whitespace-pre-wrap bg-red-100 dark:bg-red-900/40 p-3 rounded-md overflow-x-auto">
                {error.stack}
              </pre>
            </details>
          )}
          
          <div className="mt-4">
            <button
              type="button"
              onClick={resetErrorBoundary}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('error.retrying', 'Retrying...')}
                </>
              ) : (
                t('error.retry', 'Try again')
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export as both default and named export
function ErrorBoundaryComponent({ children, fallback, onReset, onError }) {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleReset = async (...args) => {
    if (onReset) {
      try {
        setIsLoading(true);
        await onReset(...args);
      } catch (error) {
        console.error('Error during reset:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  return (
    <ReactErrorBoundary
      FallbackComponent={(props) => 
        fallback ? 
          fallback({...props, isLoading}) : 
          <ErrorFallback {...props} isLoading={isLoading} />
      }
      onReset={handleReset}
      onError={onError}
    >
      {children}
    </ReactErrorBoundary>
  );
}

ErrorBoundaryComponent.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.func,
  onReset: PropTypes.func,
  onError: PropTypes.func
};

// Export as both default and named export
export { ErrorBoundaryComponent as ErrorBoundary };
export default ErrorBoundaryComponent;

// Export a HOC for easier usage
export const withErrorBoundary = (WrappedComponent, options = {}) => {
  function WithErrorBoundary(props) {
    return (
      <ErrorBoundaryComponent {...options}>
        <WrappedComponent {...props} />
      </ErrorBoundaryComponent>
    );
  }

  WithErrorBoundary.displayName = `WithErrorBoundary(${
    options.componentName || 
    WrappedComponent.displayName || 
    WrappedComponent.name || 
    'Component'
  })`;

  return WithErrorBoundary;
};

// Create pre-configured app error boundary
export const AppErrorBoundary = ({ children, ...props }) => (
  <ErrorBoundaryComponent
    componentName="App"
    {...props}
  >
    {children}
  </ErrorBoundaryComponent>
);

AppErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired
};