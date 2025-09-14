/**
 * Enhanced AuthContext with automatic session refresh and better error handling
 * This wraps your existing AuthContext with production-ready features
 */

import React, { createContext, useContext, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { ErrorToast } from '../components/ErrorFeedback/ErrorToast';
import Logger from '../services/logger/Logger';
import enhancedAPI from '../services/api/enhancedApi';

// Import your existing AuthContext
import { AuthContext as OriginalAuthContext, AuthProvider as OriginalAuthProvider } from './AuthContext';

const EnhancedAuthContext = createContext({});

export const EnhancedAuthProvider = ({ children }) => {
  const originalAuth = useContext(OriginalAuthContext);
  const sessionCheckInterval = useRef(null);
  const lastActivityTime = useRef(Date.now());
  const isRefreshing = useRef(false);

  // Track user activity
  const updateActivity = () => {
    lastActivityTime.current = Date.now();
  };

  // Check session validity
  const checkSessionHealth = async () => {
    try {
      // Skip if recently active (within 30 seconds)
      if (Date.now() - lastActivityTime.current < 30000) {
        return;
      }

      // Check if we're online
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        Logger.debug('auth', 'Skipping session check - offline');
        return;
      }

      // Verify session is still valid
      const response = await enhancedAPI.get('/api/auth/session/verify', {
        showErrorToast: false,
        retryOnFailure: false,
        timeout: 5000
      });

      if (!response.data?.valid) {
        await handleSessionExpiry();
      }

    } catch (error) {
      if (error.response?.status === 401) {
        await handleSessionExpiry();
      }
      // Ignore other errors silently
    }
  };

  // Handle session expiry with grace
  const handleSessionExpiry = async () => {
    if (isRefreshing.current) {
      return; // Already refreshing
    }

    isRefreshing.current = true;

    try {
      Logger.info('auth', 'Session expired, attempting refresh...');

      // Try to refresh the session
      const refreshed = await attemptSessionRefresh();

      if (refreshed) {
        Logger.success('auth', 'Session refreshed successfully');
        ErrorToast.showSuccess('Session Refreshed', 'You\'re still logged in');
      } else {
        // Only logout if refresh truly fails
        Logger.warning('auth', 'Session refresh failed, logging out');
        ErrorToast.show401('Your session has expired. Please sign in again.');

        // Give user 3 seconds to see the message
        setTimeout(() => {
          originalAuth.logout();
        }, 3000);
      }
    } finally {
      isRefreshing.current = false;
    }
  };

  // Attempt to refresh the session
  const attemptSessionRefresh = async () => {
    try {
      // First try: Use refresh token if available
      const refreshToken = await SecureStorage.getSecureItem('refreshToken');
      if (refreshToken) {
        const response = await enhancedAPI.post('/api/auth/refresh',
          { refresh_token: refreshToken },
          {
            showErrorToast: false,
            retryOnFailure: false
          }
        );

        if (response.data?.session_id) {
          await SecureStorage.setSecureItem('sessionId', response.data.session_id);
          return true;
        }
      }

      // Second try: Re-authenticate with stored credentials (if user allowed)
      const savedCredentials = await SecureStorage.getSecureItem('savedCredentials');
      if (savedCredentials) {
        const creds = JSON.parse(savedCredentials);
        const loginResult = await originalAuth.login(creds.email, creds.password);
        return loginResult.success;
      }

      return false;
    } catch (error) {
      Logger.error('auth', 'Session refresh failed', error);
      return false;
    }
  };

  // Enhanced login with better error handling
  const loginEnhanced = async (email, password, rememberMe = false) => {
    try {
      // Check network first
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        ErrorToast.showOffline();
        return { success: false, offline: true };
      }

      // Show loading toast
      ErrorToast.showLoading('Signing in...');

      const result = await originalAuth.login(email, password);

      ErrorToast.hide();

      if (result.success) {
        // Save credentials if remember me is checked (encrypted)
        if (rememberMe) {
          await SecureStorage.setSecureItem('savedCredentials',
            JSON.stringify({ email, password })
          );
        }

        ErrorToast.showSuccess('Welcome Back!', 'Successfully signed in');

        // Start session monitoring
        startSessionMonitoring();
      } else {
        // Show specific error messages
        if (result.message?.includes('password')) {
          ErrorToast.showError('Invalid Credentials', 'Please check your email and password');
        } else if (result.message?.includes('network')) {
          ErrorToast.showNetworkError();
        } else {
          ErrorToast.showError('Sign In Failed', result.message || 'Please try again');
        }
      }

      return result;
    } catch (error) {
      ErrorToast.hide();

      if (!error.response) {
        ErrorToast.showNetworkError();
        return { success: false, offline: true };
      }

      ErrorToast.showError('Sign In Failed', 'An unexpected error occurred');
      return { success: false, message: error.message };
    }
  };

  // Start monitoring session health
  const startSessionMonitoring = () => {
    // Clear any existing interval
    if (sessionCheckInterval.current) {
      clearInterval(sessionCheckInterval.current);
    }

    // Check session every 5 minutes
    sessionCheckInterval.current = setInterval(checkSessionHealth, 5 * 60 * 1000);

    if (__DEV__) {
      Logger.info('auth', 'Session monitoring started');
    }
  };

  // Stop monitoring
  const stopSessionMonitoring = () => {
    if (sessionCheckInterval.current) {
      clearInterval(sessionCheckInterval.current);
      sessionCheckInterval.current = null;
    }

    if (__DEV__) {
      Logger.info('auth', 'Session monitoring stopped');
    }
  };

  // Monitor app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        // App came to foreground, check session
        checkSessionHealth();
        updateActivity();
      }
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSessionMonitoring();
    };
  }, []);

  // Enhanced logout with cleanup
  const logoutEnhanced = async () => {
    try {
      ErrorToast.showLoading('Signing out...');

      // Stop monitoring
      stopSessionMonitoring();

      // Clear saved credentials
      await SecureStorage.removeSecureItem('savedCredentials');

      // Call original logout
      await originalAuth.logout();

      ErrorToast.hide();
      ErrorToast.showInfo('Signed Out', 'You have been logged out successfully');
    } catch (error) {
      ErrorToast.hide();
      ErrorToast.showError('Logout Failed', 'Please try again');
    }
  };

  // Provide enhanced auth context
  const enhancedValue = {
    ...originalAuth,
    login: loginEnhanced,
    logout: logoutEnhanced,
    checkSessionHealth,
    updateActivity,
    isSessionHealthy: !isRefreshing.current
  };

  return (
    <EnhancedAuthContext.Provider value={enhancedValue}>
      {children}
    </EnhancedAuthContext.Provider>
  );
};

// Export hooks
export const useEnhancedAuth = () => {
  const context = useContext(EnhancedAuthContext);
  if (!context) {
    throw new Error('useEnhancedAuth must be used within EnhancedAuthProvider');
  }
  return context;
};

// Export for backward compatibility
export { EnhancedAuthContext };