'use client';


import React, { createContext, useContext, useState, useCallback } from 'react';
import { Snackbar } from '@/components/ui/TailwindComponents';
import { logger } from '@/utils/logger';

/**
 * Context for managing application notifications and alerts
 */
const NotificationContext = createContext();

/**
 * NotificationProvider component
 * Provides notification functionality to all children
 */
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  
  // Function to add a notification
  const addNotification = useCallback((message, severity, autoHideDuration = 5000) => {
    logger.info(`[NotificationContext] Adding ${severity} notification: ${typeof message === 'string' ? message : 'React component'}`);
    
    // Generate unique ID for this notification
    const id = Date.now().toString();
    
    setNotifications(prev => [
      ...prev,
      { id, message, severity, autoHideDuration, open: true }
    ]);
    
    return id;
  }, []);
  
  // Function to remove a notification
  const removeNotification = useCallback((id) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id 
          ? { ...notif, open: false } 
          : notif
      )
    );
    
    // Clean up closed notifications after animation
    setTimeout(() => {
      setNotifications(prev => prev.filter(notif => notif.id !== id));
    }, 300);
  }, []);
  
  // Helper function for success notifications
  const notifySuccess = useCallback((message, duration) => {
    return addNotification(message, 'success', duration);
  }, [addNotification]);
  
  // Helper function for error notifications
  const notifyError = useCallback((message, duration) => {
    return addNotification(message, 'error', duration);
  }, [addNotification]);
  
  // Helper function for info notifications
  const notifyInfo = useCallback((message, duration) => {
    return addNotification(message, 'info', duration);
  }, [addNotification]);
  
  // Helper function for warning notifications
  const notifyWarning = useCallback((message, duration) => {
    return addNotification(message, 'warning', duration);
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
      {notifications.map((notification, index) => (
        <Snackbar
          key={notification.id}
          open={notification.open}
          message={notification.message}
          severity={notification.severity}
          autoHideDuration={notification.autoHideDuration}
          onClose={() => removeNotification(notification.id)}
          anchorOrigin={{ 
            vertical: 'bottom', 
            horizontal: 'left'
          }}
          style={{
            marginBottom: `${index * 60}px`, // Stack notifications
            zIndex: 9999 // Ensure notifications appear on top
          }}
        />
      ))}
    </NotificationContext.Provider>
  );
};

/**
 * Hook for using notifications
 * @returns {Object} Notification functions
 */
export const useNotification = () => {
  const context = useContext(NotificationContext);
  
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  
  return context;
}; 