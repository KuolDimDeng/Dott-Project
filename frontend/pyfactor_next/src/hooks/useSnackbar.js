'use client';


import { useNotification } from '@/context/NotificationContext';

/**
 * Hook to provide snackbar/toast notification functionality
 * This is a wrapper around useNotification for backward compatibility
 */
export function useSnackbar() {
  const { 
    notifySuccess, 
    notifyError, 
    notifyInfo, 
    notifyWarning 
  } = useNotification();

  // Return a simplified API for SubscriptionPopup component
  return {
    showSnackbar: (message, severity = 'info') => {
      switch (severity) {
        case 'success':
          return notifySuccess(message);
        case 'error':
          return notifyError(message);
        case 'warning':
          return notifyWarning(message);
        case 'info':
        default:
          return notifyInfo(message);
      }
    },
    // Also expose the original notification methods for direct use
    notifySuccess,
    notifyError,
    notifyInfo,
    notifyWarning
  };
}

export default useSnackbar; 