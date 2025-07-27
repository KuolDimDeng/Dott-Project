import React from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';
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

  // Skip showing loading screen
  return null;
}