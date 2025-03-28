import React from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useSetupStatus } from '@/hooks/useSetupStatus';
import { logger } from '@/utils/logger';

export default function SetupInProgress() {
  const { isLoading, isComplete, error, progress, currentStep, stepMessage } = useSetupStatus();

  logger.debug('Setup status:', { isLoading, isComplete, error, progress, currentStep });

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 p-4 rounded-md mb-4">
          {error}
        </div>
        <p className="text-gray-700 dark:text-gray-300">
          There was an error setting up your dashboard. Please try refreshing the page or contact support if the issue persists.
        </p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8 flex flex-col items-center max-w-md w-full">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white text-center mb-2">
            {stepMessage || 'Setting up your dashboard...'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-center mb-4">
            We're preparing your workspace. This may take a few moments.
            Please don't close this window.
          </p>
          
          {/* Progress bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-4">
            <div 
              className="bg-blue-600 dark:bg-blue-500 h-2.5 rounded-full transition-all duration-300 ease-in-out" 
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {progress}% Complete
          </p>
          {currentStep && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Current step: {currentStep}
            </p>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}