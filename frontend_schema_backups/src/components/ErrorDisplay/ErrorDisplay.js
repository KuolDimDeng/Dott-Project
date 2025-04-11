// src/components/ErrorDisplay/ErrorDisplay.js
'use client';

import { useTranslation } from 'react-i18next';

export default function ErrorDisplay({ 
  error,
  title,
  showError = true,
  showStack = false,
  retry = null,
  children
}) {
  const { t } = useTranslation();
  
  const defaultTitle = title || t('error.title', 'Something went wrong');
  const message = error?.message || t('error.unknown', 'An unexpected error occurred');
  
  return (
    <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3 w-full">
          <h3 className="text-sm font-medium">{defaultTitle}</h3>
          
          {showError && (
            <div className="mt-2 text-sm">
              <p>{message}</p>
            </div>
          )}
          
          {/* Stack trace in development mode */}
          {showStack && process.env.NODE_ENV === 'development' && error?.stack && (
            <div className="mt-4">
              <details className="cursor-pointer">
                <summary className="text-xs font-medium">Error Details</summary>
                <pre className="mt-2 text-xs whitespace-pre-wrap bg-red-50 p-3 rounded-md border border-red-200 overflow-x-auto dark:bg-red-900/30 dark:border-red-800">
                  {error.stack}
                </pre>
              </details>
            </div>
          )}
          
          {/* Optional retry button */}
          {retry && (
            <div className="mt-4">
              <button
                onClick={retry}
                type="button"
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800"
              >
                <svg className="mr-2 -ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
                {t('error.retry', 'Try Again')}
              </button>
            </div>
          )}
          
          {/* Optional additional content */}
          {children && <div className="mt-4">{children}</div>}
        </div>
      </div>
    </div>
  );
}