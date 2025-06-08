'use client';

// src/components/ErrorStep/ErrorStep.js

import React from 'react';
import { logger } from '@/utils/logger';

export function ErrorStep({ error, stepNumber, onRetry, isRetrying = false, message }) {
  // Log error for debugging
  React.useEffect(() => {
    if (error) {
      logger.error(`Step ${stepNumber} error:`, error);
    }
  }, [error, stepNumber]);

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-4 p-6"
    >
      <div
        className="w-full max-w-[500px] rounded-md bg-error-main/10 p-4 text-error-dark border-l-4 border-error-main"
        role="alert"
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h6 className="mb-1 text-sm font-medium">
              {message || `Error in Step ${stepNumber}`}
            </h6>
            {error?.message && (
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {error.message}
              </p>
            )}
          </div>
          
          <button
            onClick={onRetry}
            disabled={isRetrying}
            className="ml-4 inline-flex items-center rounded-md bg-error-main/10 px-3 py-1 text-xs font-medium text-error-main hover:bg-error-main/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRetrying && (
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-error-main/20 border-t-error-main"></div>
            )}
            {isRetrying ? 'Retrying...' : 'Retry'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Add PropTypes
if (process.env.NODE_ENV !== 'production') {
  const PropTypes = require('prop-types');

  ErrorStep.propTypes = {
    error: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.shape({
        message: PropTypes.string,
        code: PropTypes.string,
      }),
    ]),
    stepNumber: PropTypes.number.isRequired,
    onRetry: PropTypes.func.isRequired,
    isRetrying: PropTypes.bool,
    message: PropTypes.string,
  };
}
