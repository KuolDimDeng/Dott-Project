'use client';

import React, { createContext, useState, useContext, useCallback } from 'react';
import { Snackbar } from '@/components/ui/TailwindComponents';

const NotificationContext = createContext();

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((message, options = {}) => {
    const id = Date.now().toString();
    const notification = {
      id,
      message,
      severity: options.severity || 'info',
      autoHideDuration: options.autoHideDuration || 5000,
      ...options
    };
    
    setNotifications(prev => [...prev, notification]);
    return id;
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  // Convenience methods for different notification types
  const notifySuccess = useCallback((message, options = {}) => {
    return addNotification(message, { severity: 'success', ...options });
  }, [addNotification]);

  const notifyError = useCallback((message, options = {}) => {
    return addNotification(message, { severity: 'error', ...options });
  }, [addNotification]);

  const notifyInfo = useCallback((message, options = {}) => {
    return addNotification(message, { severity: 'info', ...options });
  }, [addNotification]);

  const notifyWarning = useCallback((message, options = {}) => {
    return addNotification(message, { severity: 'warning', ...options });
  }, [addNotification]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        removeNotification,
        notifySuccess,
        notifyError,
        notifyInfo,
        notifyWarning
      }}
    >
      {children}
      
      {/* Render all active notifications */}
      {notifications.map(notification => (
        <Snackbar
          key={notification.id}
          open={true}
          message={notification.message}
          severity={notification.severity}
          autoHideDuration={notification.autoHideDuration}
          onClose={() => removeNotification(notification.id)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        />
      ))}
    </NotificationContext.Provider>
  );
} 