/**
 * Enhanced Dott Pay API Service with production-ready error handling
 * CRITICAL: Payments should NEVER be retried automatically
 */

import enhancedAPI from './api/enhancedApi';
import { ErrorToast } from '../components/ErrorFeedback/ErrorToast';
import Logger from './logger/Logger';

class EnhancedDottPayService {
  /**
   * Process a payment with comprehensive error handling
   * NEVER RETRIES to avoid duplicate charges
   */
  async scanAndPay(qrData, amount, currency = 'USD', posTransactionId = null, notes = '') {
    try {
      // Validate inputs before attempting payment
      if (!qrData || !amount || amount <= 0) {
        ErrorToast.showValidationError('Invalid payment details');
        return { success: false, error: 'Invalid payment details' };
      }

      // Check network before payment
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        ErrorToast.showError(
          'No Connection',
          'Please check your internet connection before making a payment'
        );
        return { success: false, offline: true };
      }

      // Show processing indicator
      ErrorToast.showLoading('Processing payment...');

      const payload = {
        qr_data: qrData,
        amount: amount,
        currency: currency,
        notes: notes,
      };

      if (posTransactionId) {
        payload.pos_transaction_id = posTransactionId;
      }

      // Get location if available (React Native)
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          payload.location = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
          };
        }
      } catch (geoError) {
        // Location is optional, don't fail payment
        Logger.debug('payment', 'Location not available', geoError);
      }

      // Process payment with NO RETRY
      const response = await enhancedAPI.post('/payments/dott-pay/merchant/scan/',
        payload,
        {
          retryOnFailure: false, // CRITICAL: Never retry payments
          timeout: 45000, // 45 seconds for payment processing
          showErrorToast: false, // We'll handle errors specifically
        }
      );

      ErrorToast.hide();

      if (response.data?.success) {
        ErrorToast.showSuccess(
          'Payment Successful',
          `$${amount} ${currency} has been processed`
        );

        Logger.payment('success', {
          amount,
          currency,
          transactionId: response.data.transaction_id
        });

        return {
          success: true,
          data: response.data
        };
      } else {
        // Payment was rejected
        const message = response.data?.message || 'Payment could not be processed';
        ErrorToast.showError('Payment Failed', message);

        Logger.payment('failed', {
          amount,
          currency,
          reason: message
        });

        return {
          success: false,
          error: message,
          data: response.data
        };
      }

    } catch (error) {
      ErrorToast.hide();

      // Handle specific payment errors
      if (error.response?.status === 400) {
        // Invalid payment details
        const message = error.response.data?.message || 'Invalid payment information';
        ErrorToast.showError('Invalid Payment', message);

        return {
          success: false,
          error: message,
          validationError: true
        };
      }

      if (error.response?.status === 402) {
        // Insufficient funds
        ErrorToast.showError(
          'Insufficient Funds',
          'Please check your account balance and try again'
        );

        return {
          success: false,
          error: 'Insufficient funds',
          insufficientFunds: true
        };
      }

      if (error.response?.status === 409) {
        // Duplicate transaction
        ErrorToast.showWarning(
          'Duplicate Transaction',
          'This payment may have already been processed'
        );

        Logger.warning('payment', 'Possible duplicate transaction', {
          amount,
          posTransactionId
        });

        return {
          success: false,
          error: 'Duplicate transaction',
          duplicate: true
        };
      }

      if (error.response?.status === 429) {
        // Rate limited
        ErrorToast.showError(
          'Too Many Attempts',
          'Please wait a moment before trying again'
        );

        return {
          success: false,
          error: 'Rate limited',
          rateLimited: true
        };
      }

      if (!error.response) {
        // Network error
        ErrorToast.showError(
          'Connection Lost',
          'Payment could not be processed. Please check your connection and try again.'
        );

        Logger.error('payment', 'Network error during payment', {
          amount,
          currency
        });

        return {
          success: false,
          error: 'Network error',
          networkError: true
        };
      }

      // Generic error
      ErrorToast.showError(
        'Payment Error',
        'An unexpected error occurred. Please contact support if you were charged.'
      );

      Logger.error('payment', 'Payment processing error', error);

      return {
        success: false,
        error: error.message,
        unknown: true
      };
    }
  }

  /**
   * Check transaction status with proper error handling
   */
  async checkTransactionStatus(transactionId, options = {}) {
    const { showLoading = true, showError = true } = options;

    try {
      if (showLoading) {
        ErrorToast.showLoading('Checking payment status...');
      }

      const response = await enhancedAPI.get('/payments/dott-pay/merchant/status/',
        {
          params: { transaction_id: transactionId },
          retryOnFailure: true, // Safe to retry status checks
          cacheKey: `payment:status:${transactionId}`,
          cacheTTL: 5000, // Cache for 5 seconds
          showErrorToast: false
        }
      );

      if (showLoading) {
        ErrorToast.hide();
      }

      if (response.data) {
        // Show appropriate message based on status
        const status = response.data.status;

        if (status === 'completed' || status === 'success') {
          if (showError) {
            ErrorToast.showSuccess('Payment Confirmed', 'Transaction completed successfully');
          }
        } else if (status === 'pending') {
          if (showError) {
            ErrorToast.showInfo('Payment Pending', 'Transaction is being processed');
          }
        } else if (status === 'failed') {
          if (showError) {
            ErrorToast.showError('Payment Failed', 'Transaction could not be completed');
          }
        }

        return response.data;
      }

      return null;

    } catch (error) {
      if (showLoading) {
        ErrorToast.hide();
      }

      if (error.response?.status === 404) {
        if (showError) {
          ErrorToast.showError('Transaction Not Found', 'This transaction does not exist');
        }
        return { status: 'not_found' };
      }

      if (showError) {
        ErrorToast.showError('Status Check Failed', 'Could not verify payment status');
      }

      throw error;
    }
  }

  /**
   * Get transaction history with error handling
   */
  async getTransactionHistory() {
    try {
      const response = await enhancedAPI.get('/payments/dott-pay/profile/transactions/',
        {
          fallbackData: [], // Return empty array on error
          cacheKey: 'payment:history',
          cacheTTL: 60000, // Cache for 1 minute
          showErrorToast: false
        }
      );

      if (response.offline && response.data) {
        ErrorToast.showInfo('Offline', 'Showing cached transaction history');
      }

      return response.data || [];

    } catch (error) {
      Logger.error('payment', 'Failed to load transaction history', error);
      return []; // Return empty array on error
    }
  }

  /**
   * Refund a payment (with extra confirmation)
   */
  async refundPayment(transactionId, amount, reason) {
    try {
      // Double-check before refunding
      const confirmed = await new Promise((resolve) => {
        Alert.alert(
          'Confirm Refund',
          `Are you sure you want to refund $${amount}?`,
          [
            { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
            { text: 'Refund', onPress: () => resolve(true), style: 'destructive' }
          ]
        );
      });

      if (!confirmed) {
        return { success: false, cancelled: true };
      }

      ErrorToast.showLoading('Processing refund...');

      const response = await enhancedAPI.post('/payments/dott-pay/merchant/refund/',
        {
          transaction_id: transactionId,
          amount: amount,
          reason: reason
        },
        {
          retryOnFailure: false, // Never retry refunds
          timeout: 30000,
          showErrorToast: false
        }
      );

      ErrorToast.hide();

      if (response.data?.success) {
        ErrorToast.showSuccess('Refund Processed', `$${amount} has been refunded`);

        Logger.payment('refund', {
          transactionId,
          amount,
          reason
        });

        return { success: true, data: response.data };
      }

      ErrorToast.showError('Refund Failed', response.data?.message || 'Could not process refund');
      return { success: false, error: response.data?.message };

    } catch (error) {
      ErrorToast.hide();

      if (error.response?.status === 409) {
        ErrorToast.showError('Already Refunded', 'This transaction has already been refunded');
        return { success: false, alreadyRefunded: true };
      }

      ErrorToast.showError('Refund Error', 'Could not process refund. Please try again.');
      throw error;
    }
  }
}

export default new EnhancedDottPayService();