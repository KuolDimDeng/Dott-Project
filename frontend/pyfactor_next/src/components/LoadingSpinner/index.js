'use client';

///Users/kuoldeng/projectx/frontend/pyfactor_next/src/components/LoadingSpinner/index.js

import { useTranslation } from 'react-i18next';

export default function LoadingSpinner({
  size = 'medium',
  text = '',
  fullScreen = false,
  overlay = false,
  showProgress = false,
  progress = 0,
  className = '',
  status = ''
}) {
  const { t } = useTranslation();
  
  // Set spinner size based on prop
  const sizeClasses = {
    small: 'h-5 w-5 border-2',
    medium: 'h-8 w-8 border-3',
    large: 'h-12 w-12 border-4',
    xl: 'h-16 w-16 border-4'
  };
  
  // Default loading text
  const loadingText = text || t('loading', 'Loading...');
  
  // Basic spinner
  const spinner = (
    <div className={`${sizeClasses[size] || sizeClasses.medium} rounded-full border-t-primary-main border-primary-light/30 animate-spin`}></div>
  );

  // Status badge component
  const StatusBadge = () => {
    if (!status) return null;
    
    const statusColors = {
      initializing: 'bg-blue-200 text-blue-800',
      in_progress: 'bg-blue-200 text-blue-800',
      complete: 'bg-green-200 text-green-800',
      error: 'bg-red-200 text-red-800',
      pending: 'bg-yellow-200 text-yellow-800'
    };
    
    const statusText = {
      initializing: t('initializing', 'Initializing'),
      in_progress: t('inProgress', 'In Progress'),
      complete: t('complete', 'Complete'),
      error: t('error', 'Error'),
      pending: t('pending', 'Pending')
    };
    
    return (
      <span className={`text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full ${statusColors[status] || 'bg-gray-200 text-gray-800'}`}>
        {statusText[status] || status}
      </span>
    );
  };
  
  // Progress bar component
  const ProgressBar = () => {
    if (!showProgress) return null;
    
    return (
      <div className="w-full mt-4">
        <div className="flex mb-2 items-center justify-between">
          <StatusBadge />
          <div className="text-right">
            <span className="text-xs font-semibold inline-block text-primary-main">
              {progress}%
            </span>
          </div>
        </div>
        <div className="overflow-hidden h-2 mb-2 text-xs flex rounded bg-primary-light/30">
          <div 
            style={{ width: `${progress}%` }}
            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary-main transition-all duration-500"
          ></div>
        </div>
      </div>
    );
  };
  
  // If fullScreen, show a centered spinner on the entire screen
  if (fullScreen) {
    return (
      <div className={`fixed inset-0 flex flex-col items-center justify-center bg-white dark:bg-gray-900 z-50 ${className}`}>
        {spinner}
        {text && <p className="mt-4 text-gray-600 dark:text-gray-300">{loadingText}</p>}
        {showProgress && <div className="w-64 mt-4"><ProgressBar /></div>}
      </div>
    );
  }
  
  // If overlay, show a semi-transparent overlay with spinner
  if (overlay) {
    return (
      <div className={`fixed inset-0 bg-black/20 dark:bg-black/50 flex flex-col items-center justify-center z-50 ${className}`}>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 flex flex-col items-center max-w-lg w-full">
          {spinner}
          {text && <p className="mt-3 text-gray-600 dark:text-gray-300">{loadingText}</p>}
          {showProgress && <div className="w-full mt-4"><ProgressBar /></div>}
        </div>
      </div>
    );
  }
  
  // Default: just the spinner with optional text and progress
  return (
    <div className={`flex flex-col items-center ${className}`}>
      {spinner}
      {text && <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{loadingText}</p>}
      {showProgress && <div className="w-64 mt-4"><ProgressBar /></div>}
    </div>
  );
}