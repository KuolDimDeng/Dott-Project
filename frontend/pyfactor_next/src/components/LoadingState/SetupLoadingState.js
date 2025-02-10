import React from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';

export function SetupLoadingState({ status }) {
  const getStatusMessage = () => {
    if (!status) return 'Initializing setup...';

    switch (status.current_step) {
      case 'initializing':
        return 'Initializing database setup...';
      case 'creating_database':
        return 'Creating your database...';
      case 'configuring_database':
        return 'Configuring database settings...';
      case 'running_migrations':
        return 'Setting up database structure...';
      case 'verifying_setup':
        return 'Verifying database setup...';
      case 'finalizing':
        return 'Finalizing setup...';
      case 'complete':
        return 'Setup complete!';
      case 'error':
        return 'Setup error occurred';
      default:
        return 'Processing...';
    }
  };

  const getProgress = () => {
    if (!status) return 0;
    return status.progress || 0;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] p-8">
      <LoadingSpinner />
      <div className="mt-4 text-lg font-medium text-gray-700">
        {getStatusMessage()}
      </div>
      <div className="mt-2 text-sm text-gray-500">
        {getProgress()}% complete
      </div>
      {status?.error && (
        <div className="mt-4 text-sm text-red-600">Error: {status.error}</div>
      )}
    </div>
  );
}
