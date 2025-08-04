/**
 * Notification utilities
 * Provides consistent notification handling across the app
 */

// Simple notification functions that can be replaced with your notification system
export const notifySuccess = (message) => {
  if (typeof window !== 'undefined') {
    console.log('✅ Success:', message);
    // Replace with your notification library (toast, snackbar, etc.)
    if (window.showNotification) {
      window.showNotification({ type: 'success', message });
    }
  }
};

export const notifyError = (message) => {
  if (typeof window !== 'undefined') {
    console.error('❌ Error:', message);
    // Replace with your notification library
    if (window.showNotification) {
      window.showNotification({ type: 'error', message });
    }
  }
};

export const notifyInfo = (message) => {
  if (typeof window !== 'undefined') {
    console.info('ℹ️ Info:', message);
    // Replace with your notification library
    if (window.showNotification) {
      window.showNotification({ type: 'info', message });
    }
  }
};

export const notifyWarning = (message) => {
  if (typeof window !== 'undefined') {
    console.warn('⚠️ Warning:', message);
    // Replace with your notification library
    if (window.showNotification) {
      window.showNotification({ type: 'warning', message });
    }
  }
};

// Default export
export default {
  success: notifySuccess,
  error: notifyError,
  info: notifyInfo,
  warning: notifyWarning,
};