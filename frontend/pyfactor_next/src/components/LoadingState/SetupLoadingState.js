import React from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';

export function SetupLoadingState({ status }) {
  const getStatusMessage = () => {
    if (!status) return 'Preparing your workspace...';

    const messages = {
      initializing: 'Preparing your workspace...',
      creating_database: 'Creating your secure database...',
      configuring_database: 'Configuring your business settings...',
      running_migrations: 'Setting up your database structure...',
      importing_data: 'Importing your business data...',
      verifying_setup: 'Verifying your setup...',
      finalizing: 'Finalizing your workspace...',
      complete: 'Setup complete! Redirecting to dashboard...',
      error: status.error || 'An error occurred during setup',
      failed: status.error || 'Setup failed. Please try again.',
    };

    return messages[status.current_step] || 'Processing your setup...';
  };

  const getProgress = () => {
    if (!status) return 0;
    if (status.current_step === 'complete') return 100;
    if (status.current_step === 'error' || status.current_step === 'failed') return 0;
    return status.progress || 0;
  };

  const getEstimatedTime = () => {
    if (!status || status.current_step === 'complete') return null;
    if (status.current_step === 'error' || status.current_step === 'failed') return null;
    
    const progress = getProgress();
    if (progress === 0) return 'Estimated time: 2-3 minutes';
    
    const remaining = Math.ceil((100 - progress) / 20); // Rough estimate
    return `Estimated time remaining: ${remaining} minute${remaining !== 1 ? 's' : ''}`;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] p-8">
      {status?.current_step !== 'error' && status?.current_step !== 'failed' && (
        <LoadingSpinner />
      )}
      {(status?.current_step === 'error' || status?.current_step === 'failed') && (
        <div className="w-16 h-16 text-red-500 mb-4">
          <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
      )}
      
      <div className="mt-4 text-lg font-medium text-gray-700 text-center">
        {getStatusMessage()}
      </div>
      
      {status?.current_step !== 'error' && status?.current_step !== 'failed' && (
        <>
          <div className="w-full max-w-md mt-4 bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${getProgress()}%` }}
            />
          </div>
          
          <div className="mt-2 text-sm text-gray-500">
            {getProgress()}% complete
          </div>
          
          {getEstimatedTime() && (
            <div className="mt-1 text-xs text-gray-400">
              {getEstimatedTime()}
            </div>
          )}
        </>
      )}
      
      {status?.error && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm max-w-md text-center">
          {status.error}
        </div>
      )}
    </div>
  );
}
