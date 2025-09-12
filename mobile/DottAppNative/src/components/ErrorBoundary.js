import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
// Temporarily disable Sentry import to fix app startup
// import * as Sentry from '@sentry/react-native';
const Sentry = null;

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to error reporting service
    if (__DEV__) {
      console.error('ErrorBoundary caught:', error, errorInfo);
    }
    
    // Report to Sentry in production (disabled temporarily)
    if (false && !__DEV__ && Sentry) {
      Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
      });
    }

    this.setState({
      error,
      errorInfo,
      errorCount: this.state.errorCount + 1,
    });

    // If app crashes repeatedly, offer to clear app data
    if (this.state.errorCount >= 3) {
      Alert.alert(
        'App Stability Issue',
        'The app is experiencing repeated crashes. Would you like to clear app data and start fresh?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Clear Data',
            onPress: this.clearAppData,
            style: 'destructive',
          },
        ]
      );
    }
  }

  clearAppData = async () => {
    try {
      // Clear all storage
      const SecureStorage = require('../services/secureStorage').default;
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      
      await SecureStorage.clearAll();
      await AsyncStorage.clear();
      
      // Restart the app
      this.handleReset();
    } catch (error) {
      if (__DEV__) {
        console.error('Failed to clear app data:', error);
      }
    }
  };

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.errorContainer}>
              <Icon name="warning-outline" size={64} color="#ef4444" />
              
              <Text style={styles.title}>Oops! Something went wrong</Text>
              <Text style={styles.subtitle}>
                We're sorry for the inconvenience. The app encountered an unexpected error.
              </Text>

              <TouchableOpacity style={styles.button} onPress={this.handleReset}>
                <Icon name="refresh" size={20} color="#fff" />
                <Text style={styles.buttonText}>Try Again</Text>
              </TouchableOpacity>

              {__DEV__ && this.state.error && (
                <View style={styles.errorDetails}>
                  <Text style={styles.errorDetailsTitle}>Error Details (Dev Only):</Text>
                  <Text style={styles.errorMessage}>{this.state.error.toString()}</Text>
                  {this.state.errorInfo && (
                    <ScrollView style={styles.stackTrace}>
                      <Text style={styles.stackTraceText}>
                        {this.state.errorInfo.componentStack}
                      </Text>
                    </ScrollView>
                  )}
                </View>
              )}

              <View style={styles.helpSection}>
                <Text style={styles.helpTitle}>Need help?</Text>
                <Text style={styles.helpText}>
                  If this problem persists, please contact support at support@dottapps.com
                </Text>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  errorContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  errorDetails: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    width: '100%',
  },
  errorDetailsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#991b1b',
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 12,
    color: '#991b1b',
    fontFamily: 'Courier',
  },
  stackTrace: {
    maxHeight: 200,
    marginTop: 10,
  },
  stackTraceText: {
    fontSize: 10,
    color: '#991b1b',
    fontFamily: 'Courier',
  },
  helpSection: {
    marginTop: 40,
    alignItems: 'center',
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 5,
  },
  helpText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});

export default ErrorBoundary;