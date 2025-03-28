///Users/kuoldeng/projectx/frontend/pyfactor_next/src/components/LoadingSpinner/index.js
'use client';

import { useTranslation } from 'react-i18next';

export default function LoadingSpinner({
  size = 'medium', 
  text = '',
  fullScreen = false,
  overlay = false
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
  
  // If fullScreen, show a centered spinner on the entire screen
  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-white dark:bg-gray-900 z-50">
        {spinner}
        {text && <p className="mt-4 text-gray-600 dark:text-gray-300">{loadingText}</p>}
      </div>
    );
  }
  
  // If overlay, show a semi-transparent overlay with spinner
  if (overlay) {
    return (
      <div className="fixed inset-0 bg-black/20 dark:bg-black/50 flex flex-col items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 flex flex-col items-center">
          {spinner}
          {text && <p className="mt-3 text-gray-600 dark:text-gray-300">{loadingText}</p>}
        </div>
      </div>
    );
  }
  
  // Default: just the spinner with optional text
  return (
    <div className="flex flex-col items-center">
      {spinner}
      {text && <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{loadingText}</p>}
    </div>
  );
}