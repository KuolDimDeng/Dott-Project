/**
 * Dott Pay API Service
 * Revolutionary QR payment system for instant merchant-consumer transactions
 */
import api from './api';

class DottPayService {
  /**
   * Get or create user's Dott Pay profile
   */
  async getMyProfile() {
    try {
      const response = await api.get('/payments/dott-pay/profile/my/');
      return response.data;
    } catch (error) {
      console.error('Error getting Dott Pay profile:', error);
      throw error;
    }
  }

  /**
   * Get user's QR code data for display
   */
  async getQRCode() {
    try {
      const response = await api.get('/payments/dott-pay/profile/qr-code/');
      return response.data;
    } catch (error) {
      console.error('Error getting QR code:', error);
      throw error;
    }
  }

  /**
   * Update transaction limits
   */
  async updateLimits(limits) {
    try {
      const response = await api.post('/payments/dott-pay/profile/limits/', limits);
      return response.data;
    } catch (error) {
      console.error('Error updating limits:', error);
      throw error;
    }
  }

  /**
   * Set default payment method for Dott Pay
   */
  async setDefaultPaymentMethod(paymentMethodId) {
    try {
      const response = await api.post('/payments/dott-pay/profile/payment-method/', {
        payment_method_id: paymentMethodId,
      });
      return response.data;
    } catch (error) {
      console.error('Error setting default payment method:', error);
      throw error;
    }
  }

  /**
   * Get user's Dott Pay transaction history
   */
  async getTransactionHistory() {
    try {
      const response = await api.get('/payments/dott-pay/profile/transactions/');
      return response.data;
    } catch (error) {
      console.error('Error getting transaction history:', error);
      throw error;
    }
  }

  /**
   * MERCHANT: Scan and process a QR code payment
   */
  async scanAndPay(qrData, amount, currency = 'USD', posTransactionId = null, notes = '') {
    try {
      const payload = {
        qr_data: qrData,
        amount: amount,
        currency: currency,
        notes: notes,
      };

      if (posTransactionId) {
        payload.pos_transaction_id = posTransactionId;
      }

      // Add location if available
      if (navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          payload.location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
        } catch (geoError) {
          console.log('Location not available:', geoError);
        }
      }

      const response = await api.post('/payments/dott-pay/merchant/scan/', payload);
      return response.data;
    } catch (error) {
      console.error('Error processing QR payment:', error);
      throw error;
    }
  }

  /**
   * MERCHANT: Check transaction status
   */
  async checkTransactionStatus(transactionId) {
    try {
      const response = await api.get('/payments/dott-pay/merchant/status/', {
        params: { transaction_id: transactionId }
      });
      return response.data;
    } catch (error) {
      console.error('Error checking transaction status:', error);
      throw error;
    }
  }

  /**
   * Get available payment methods for Dott Pay
   */
  async getPaymentMethods() {
    try {
      const response = await api.get('/payments/methods/');
      return response.data;
    } catch (error) {
      console.error('Error getting payment methods:', error);
      throw error;
    }
  }

  /**
   * Link a new card through Stripe
   */
  async linkCard(cardDetails) {
    try {
      const response = await api.post('/payments/methods/add/', {
        ...cardDetails,
        gateway: 'STRIPE',
        method_type: 'card',
      });
      return response.data;
    } catch (error) {
      console.error('Error linking card:', error);
      throw error;
    }
  }

  /**
   * Link mobile money account (M-Pesa/MTN)
   */
  async linkMobileMoney(phoneNumber, provider) {
    try {
      const response = await api.post('/payments/methods/add/', {
        phone_number: phoneNumber,
        mobile_provider: provider,
        method_type: 'mobile_money',
        gateway: provider === 'M-PESA' ? 'M_PESA' : 'MTN',
      });
      return response.data;
    } catch (error) {
      console.error('Error linking mobile money:', error);
      throw error;
    }
  }

  /**
   * Remove a payment method
   */
  async removePaymentMethod(paymentMethodId) {
    try {
      const response = await api.delete(`/payments/methods/${paymentMethodId}/`);
      return response.data;
    } catch (error) {
      console.error('Error removing payment method:', error);
      throw error;
    }
  }

  /**
   * Verify payment method with code
   */
  async verifyPaymentMethod(paymentMethodId, verificationCode) {
    try {
      const response = await api.post(`/payments/methods/${paymentMethodId}/verify/`, {
        verification_code: verificationCode,
      });
      return response.data;
    } catch (error) {
      console.error('Error verifying payment method:', error);
      throw error;
    }
  }

  /**
   * Generate a fresh QR code (regenerate for security)
   */
  async regenerateQRCode() {
    try {
      const response = await api.post('/payments/dott-pay/profile/regenerate-qr/');
      return response.data;
    } catch (error) {
      console.error('Error regenerating QR code:', error);
      throw error;
    }
  }

  /**
   * Enable/disable Dott Pay
   */
  async toggleDottPay(enabled) {
    try {
      const response = await api.patch('/payments/dott-pay/profile/my/', {
        is_active: enabled,
      });
      return response.data;
    } catch (error) {
      console.error('Error toggling Dott Pay:', error);
      throw error;
    }
  }

  /**
   * Set PIN for high-value transactions
   */
  async setPIN(pin) {
    try {
      const response = await api.post('/payments/dott-pay/profile/set-pin/', {
        pin: pin,
      });
      return response.data;
    } catch (error) {
      console.error('Error setting PIN:', error);
      throw error;
    }
  }

  /**
   * Enable biometric authentication
   */
  async enableBiometric(enabled) {
    try {
      const response = await api.patch('/payments/dott-pay/profile/my/', {
        biometric_enabled: enabled,
      });
      return response.data;
    } catch (error) {
      console.error('Error updating biometric setting:', error);
      throw error;
    }
  }

  /**
   * Get security logs for the user's account
   */
  async getSecurityLogs() {
    try {
      const response = await api.get('/payments/dott-pay/profile/security-logs/');
      return response.data;
    } catch (error) {
      console.error('Error getting security logs:', error);
      throw error;
    }
  }
}

export default new DottPayService();