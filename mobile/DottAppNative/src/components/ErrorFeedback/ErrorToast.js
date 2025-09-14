import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Toast, { BaseToast, ErrorToast as RNErrorToast } from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/Ionicons';

// Custom toast configuration for better error feedback
export const toastConfig = {
  // Success toast
  success: (props) => (
    <BaseToast
      {...props}
      style={[styles.toast, styles.successToast]}
      contentContainerStyle={styles.toastContent}
      text1Style={styles.toastTitle}
      text2Style={styles.toastMessage}
      renderLeadingIcon={() => (
        <Icon name="checkmark-circle" size={24} color="#10B981" style={styles.icon} />
      )}
    />
  ),

  // Error toast with retry option
  error: (props) => (
    <View style={[styles.toast, styles.errorToast]}>
      <View style={styles.toastHeader}>
        <Icon name="alert-circle" size={24} color="#EF4444" />
        <Text style={styles.errorTitle}>{props.text1}</Text>
      </View>
      <Text style={styles.errorMessage}>{props.text2}</Text>
      {props.props?.retry && (
        <TouchableOpacity
          style={styles.retryButton}
          onPress={props.props.retry}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  ),

  // Warning toast
  warning: (props) => (
    <BaseToast
      {...props}
      style={[styles.toast, styles.warningToast]}
      contentContainerStyle={styles.toastContent}
      text1Style={styles.toastTitle}
      text2Style={styles.toastMessage}
      renderLeadingIcon={() => (
        <Icon name="warning" size={24} color="#F59E0B" style={styles.icon} />
      )}
    />
  ),

  // Info toast
  info: (props) => (
    <BaseToast
      {...props}
      style={[styles.toast, styles.infoToast]}
      contentContainerStyle={styles.toastContent}
      text1Style={styles.toastTitle}
      text2Style={styles.toastMessage}
      renderLeadingIcon={() => (
        <Icon name="information-circle" size={24} color="#3B82F6" style={styles.icon} />
      )}
    />
  ),

  // Network offline toast
  offline: (props) => (
    <View style={[styles.toast, styles.offlineToast]}>
      <View style={styles.toastHeader}>
        <Icon name="cloud-offline" size={24} color="#6B7280" />
        <Text style={styles.offlineTitle}>You're Offline</Text>
      </View>
      <Text style={styles.offlineMessage}>
        {props.text2 || 'Your request will be processed when you\'re back online'}
      </Text>
    </View>
  ),

  // Loading toast
  loading: (props) => (
    <View style={[styles.toast, styles.loadingToast]}>
      <View style={styles.toastHeader}>
        <Icon name="hourglass" size={24} color="#3B82F6" />
        <Text style={styles.loadingTitle}>{props.text1 || 'Processing...'}</Text>
      </View>
      {props.text2 && <Text style={styles.loadingMessage}>{props.text2}</Text>}
    </View>
  )
};

// Helper functions for showing different types of toasts
export const ErrorToast = {
  // Show error with optional retry
  showError: (title, message, retry = null) => {
    Toast.show({
      type: 'error',
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 5000,
      autoHide: !retry,
      topOffset: 60,
      props: { retry }
    });
  },

  // Show 404 not found
  show404: (resource = 'Item') => {
    Toast.show({
      type: 'warning',
      text1: 'Not Found',
      text2: `${resource} doesn't exist or has been removed`,
      position: 'top',
      visibilityTime: 4000,
      topOffset: 60
    });
  },

  // Show 401 unauthorized
  show401: (message = 'Please sign in to continue') => {
    Toast.show({
      type: 'error',
      text1: 'Authentication Required',
      text2: message,
      position: 'top',
      visibilityTime: 4000,
      topOffset: 60
    });
  },

  // Show network error
  showNetworkError: (retry = null) => {
    Toast.show({
      type: 'offline',
      text1: 'Connection Error',
      text2: 'Please check your internet connection',
      position: 'top',
      visibilityTime: retry ? 10000 : 4000,
      autoHide: !retry,
      topOffset: 60,
      props: { retry }
    });
  },

  // Show server error
  showServerError: (retry = null) => {
    Toast.show({
      type: 'error',
      text1: 'Server Error',
      text2: 'Something went wrong. Please try again later.',
      position: 'top',
      visibilityTime: 5000,
      topOffset: 60,
      props: { retry }
    });
  },

  // Show validation error
  showValidationError: (message) => {
    Toast.show({
      type: 'warning',
      text1: 'Invalid Input',
      text2: message,
      position: 'top',
      visibilityTime: 4000,
      topOffset: 60
    });
  },

  // Show success
  showSuccess: (title, message) => {
    Toast.show({
      type: 'success',
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 3000,
      topOffset: 60
    });
  },

  // Show info
  showInfo: (title, message) => {
    Toast.show({
      type: 'info',
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 4000,
      topOffset: 60
    });
  },

  // Show offline status
  showOffline: () => {
    Toast.show({
      type: 'offline',
      position: 'top',
      visibilityTime: 4000,
      topOffset: 60
    });
  },

  // Show loading
  showLoading: (message = 'Loading...') => {
    Toast.show({
      type: 'loading',
      text1: message,
      position: 'top',
      autoHide: false,
      topOffset: 60
    });
  },

  // Hide all toasts
  hide: () => {
    Toast.hide();
  }
};

const styles = StyleSheet.create({
  toast: {
    width: '90%',
    borderLeftWidth: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5
  },
  successToast: {
    borderLeftColor: '#10B981'
  },
  errorToast: {
    borderLeftColor: '#EF4444'
  },
  warningToast: {
    borderLeftColor: '#F59E0B'
  },
  infoToast: {
    borderLeftColor: '#3B82F6'
  },
  offlineToast: {
    borderLeftColor: '#6B7280'
  },
  loadingToast: {
    borderLeftColor: '#3B82F6'
  },
  toastContent: {
    paddingHorizontal: 12
  },
  toastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  toastTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937'
  },
  toastMessage: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8
  },
  errorMessage: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    marginLeft: 32
  },
  offlineTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8
  },
  offlineMessage: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    marginLeft: 32
  },
  loadingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8
  },
  loadingMessage: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    marginLeft: 32
  },
  retryButton: {
    marginTop: 8,
    marginLeft: 32,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 4,
    alignSelf: 'flex-start'
  },
  retryText: {
    color: '#EF4444',
    fontWeight: '600',
    fontSize: 14
  },
  icon: {
    marginLeft: 12
  }
});

export default ErrorToast;