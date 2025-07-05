import React, { useState, useEffect, useCallback } from 'react';
import AdminSecureStorage from '@/utils/adminSecureStorage';
import adminApiClient from '@/utils/adminApiClient';

const SessionTimeout = ({ children }) => {
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [checkInterval, setCheckInterval] = useState(null);

  const logout = useCallback(async () => {
    try {
      await adminApiClient.post('/admin/logout/', {});
    } catch (error) {
      console.error('Logout failed:', error);
    }
    
    AdminSecureStorage.clearAll();
    window.location.href = '/admin/login';
  }, []);

  const extendSession = useCallback(async () => {
    try {
      // Refresh the token to extend the session
      const success = await adminApiClient.refreshToken();
      if (success) {
        setShowWarning(false);
        // Update session expiry time
        const adminData = AdminSecureStorage.getAdminData();
        if (adminData) {
          adminData.sessionExpiry = new Date(Date.now() + (8 * 60 * 60 * 1000)).toISOString();
          AdminSecureStorage.setAdminData(adminData);
        }
      }
    } catch (error) {
      console.error('Failed to extend session:', error);
      logout();
    }
  }, [logout]);

  const checkSessionTimeout = useCallback(() => {
    const warningTime = AdminSecureStorage.getSessionWarningTime();
    if (!warningTime) {
      return;
    }

    const now = Date.now();
    const adminData = AdminSecureStorage.getAdminData();
    const expiryTime = adminData?.sessionExpiry ? new Date(adminData.sessionExpiry).getTime() : null;

    if (!expiryTime) {
      return;
    }

    // Check if session has expired
    if (now >= expiryTime) {
      logout();
      return;
    }

    // Check if we should show warning
    if (now >= warningTime && !showWarning) {
      setShowWarning(true);
    }

    // Update time remaining
    if (showWarning) {
      const remaining = Math.max(0, Math.floor((expiryTime - now) / 1000));
      setTimeRemaining(remaining);

      if (remaining === 0) {
        logout();
      }
    }
  }, [showWarning, logout]);

  useEffect(() => {
    // Check every 10 seconds
    const interval = setInterval(checkSessionTimeout, 10000);
    setCheckInterval(interval);

    // Initial check
    checkSessionTimeout();

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [checkSessionTimeout]);

  // Update countdown every second when warning is shown
  useEffect(() => {
    if (showWarning && timeRemaining !== null) {
      const countdown = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            logout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(countdown);
    }
  }, [showWarning, timeRemaining, logout]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {children}
      
      {showWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Session Timeout Warning</h3>
            <p className="text-gray-600 mb-4">
              Your session will expire in {formatTime(timeRemaining || 0)} due to inactivity.
              Would you like to continue working?
            </p>
            <div className="flex gap-4">
              <button
                onClick={extendSession}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Continue Session
              </button>
              <button
                onClick={logout}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SessionTimeout;