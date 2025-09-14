/**
 * Global error handling setup for the React Native app
 * Import this in your App.js or index.js to enable production-ready error handling
 */

import React, { useEffect } from 'react';
import { View } from 'react-native';
import Toast from 'react-native-toast-message';
import { toastConfig } from '../components/ErrorFeedback/ErrorToast';
import Logger from '../services/logger/Logger';
import ErrorTracker from '../services/errorTracking/errorTracker';
import NetInfo from '@react-native-community/netinfo';

// Global error boundary component
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log to error tracking
    ErrorTracker.track(error, {
      component: errorInfo.componentStack,
      errorBoundary: true
    });

    if (__DEV__) {
      Logger.error('error-boundary', 'Component crashed', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      });
    }
  }

  render() {
    if (this.state.hasError) {
      // You can render a custom error UI here
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Something went wrong</Text>
          <TouchableOpacity
            onPress={() => this.setState({ hasError: false, error: null })}
            style={{ marginTop: 20, padding: 10, backgroundColor: '#007AFF', borderRadius: 5 }}
          >
            <Text style={{ color: 'white' }}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

// Network monitoring component
export const NetworkMonitor = () => {
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      if (__DEV__) {
        Logger.network(state.isConnected ? 'online' : 'offline', {
          type: state.type,
          details: state.details
        });
      }

      // Show toast when going offline/online
      if (!state.isConnected) {
        Toast.show({
          type: 'offline',
          position: 'top',
          visibilityTime: 4000,
          topOffset: 60
        });
      }
    });

    return () => unsubscribe();
  }, []);

  return null;
};

// Setup function to initialize error handling
export const setupErrorHandling = () => {
  // Set up global error handler for unhandled promises
  const originalHandler = global.ErrorUtils.getGlobalHandler();

  global.ErrorUtils.setGlobalHandler((error, isFatal) => {
    // Track the error
    ErrorTracker.track(error, {
      fatal: isFatal,
      global: true
    });

    if (__DEV__) {
      Logger.error('global', `${isFatal ? 'Fatal' : 'Non-fatal'} error`, error);
    }

    // Call original handler
    if (originalHandler) {
      originalHandler(error, isFatal);
    }
  });

  // Handle unhandled promise rejections
  const tracking = require('promise/setimmediate/rejection-tracking');
  tracking.enable({
    allRejections: true,
    onUnhandled: (id, error) => {
      ErrorTracker.track(error, {
        promiseRejection: true,
        rejectionId: id
      });

      if (__DEV__) {
        Logger.error('promise', 'Unhandled promise rejection', error);
      }
    },
    onHandled: (id) => {
      if (__DEV__) {
        Logger.info('promise', `Promise rejection handled: ${id}`);
      }
    }
  });

  if (__DEV__) {
    Logger.success('setup', 'Error handling initialized');
  }
};

// Main component to wrap your app
export const ErrorHandlingProvider = ({ children }) => {
  useEffect(() => {
    setupErrorHandling();
  }, []);

  return (
    <ErrorBoundary>
      <NetworkMonitor />
      {children}
      <Toast config={toastConfig} />
    </ErrorBoundary>
  );
};

// Usage in App.js:
/*
import { ErrorHandlingProvider } from './src/setup/ErrorHandlingSetup';

function App() {
  return (
    <ErrorHandlingProvider>
      <YourAppContent />
    </ErrorHandlingProvider>
  );
}
*/