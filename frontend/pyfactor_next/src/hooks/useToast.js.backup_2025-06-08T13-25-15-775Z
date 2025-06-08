import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { logger } from '@/utils/logger';

/**
 * Hook for displaying toast notifications
 * @returns {Object} Toast notification methods
 */
export const useToast = () => {
  /**
   * Display a success notification
   * @param {string} message - The success message to display
   */
  const notifySuccess = useCallback((message) => {
    logger.info(`[Toast] Success: ${message}`);
    toast.success(message, {
      duration: 4000,
      position: 'top-right',
    });
  }, []);

  /**
   * Display an error notification
   * @param {string} message - The error message to display
   */
  const notifyError = useCallback((message) => {
    logger.error(`[Toast] Error: ${message}`);
    toast.error(message, {
      duration: 5000,
      position: 'top-right',
    });
  }, []);

  /**
   * Display an info notification
   * @param {string} message - The info message to display
   */
  const notifyInfo = useCallback((message) => {
    logger.info(`[Toast] Info: ${message}`);
    toast(message, {
      duration: 3000,
      position: 'top-right',
      icon: '🔔',
    });
  }, []);

  /**
   * Display a warning notification
   * @param {string} message - The warning message to display
   */
  const notifyWarning = useCallback((message) => {
    logger.warn(`[Toast] Warning: ${message}`);
    toast(message, {
      duration: 4000,
      position: 'top-right',
      icon: '⚠️',
      style: { backgroundColor: '#FEF3C7', color: '#92400E', borderColor: '#F59E0B' },
    });
  }, []);

  /**
   * Display a loading notification
   * @param {string} message - The loading message to display
   * @returns {string} The toast ID for dismissing
   */
  const notifyLoading = useCallback((message) => {
    logger.info(`[Toast] Loading: ${message}`);
    return toast.loading(message, {
      position: 'top-right',
    });
  }, []);

  /**
   * Dismiss a specific toast notification
   * @param {string} toastId - The ID of the toast to dismiss
   */
  const dismissToast = useCallback((toastId) => {
    toast.dismiss(toastId);
  }, []);

  return {
    notifySuccess,
    notifyError,
    notifyInfo,
    notifyWarning,
    notifyLoading,
    dismissToast,
  };
};

export default useToast; 