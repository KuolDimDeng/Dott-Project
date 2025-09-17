/**
 * Payment Service
 * Handles Stripe card payments and MTN Mobile Money payments
 */
import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ENV from '../config/environment';

class PaymentService {
  constructor() {
    this.baseURL = ENV.apiUrl;
  }

  /**
   * Create a payment intent for Stripe card payment
   */
  async createPaymentIntent(amount, currency = 'USD', metadata = {}) {
    try {
      const response = await api.post('/marketplace/consumer/payments/stripe/create-intent/', {
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        metadata,
        description: metadata.description || 'Marketplace Order',
      });

      return {
        success: response.data.success,
        clientSecret: response.data.client_secret,
        paymentIntentId: response.data.payment_intent_id,
      };
    } catch (error) {
      console.error('Error creating payment intent:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to create payment intent',
      };
    }
  }

  /**
   * Initialize MTN Mobile Money payment
   */
  async initiateMTNPayment(amount, phoneNumber, currency = 'SSP', metadata = {}) {
    try {
      // Format phone number (remove spaces, add country code if missing)
      let formattedPhone = phoneNumber.replace(/\s+/g, '');
      if (!formattedPhone.startsWith('+')) {
        // Add South Sudan country code if not present
        if (!formattedPhone.startsWith('211')) {
          formattedPhone = '+211' + formattedPhone;
        } else {
          formattedPhone = '+' + formattedPhone;
        }
      }

      const response = await api.post('/marketplace/consumer/payments/mtn/initiate/', {
        amount,
        currency,
        phone_number: formattedPhone,
        metadata,
        description: metadata.description || 'Marketplace Order',
      });

      return {
        success: response.data.success,
        transactionId: response.data.transaction_id,
        referenceId: response.data.reference_id,
        status: response.data.status,
        message: response.data.message,
      };
    } catch (error) {
      console.error('Error initiating MTN payment:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to initiate MTN payment',
      };
    }
  }

  /**
   * Check MTN payment status
   */
  async checkMTNPaymentStatus(transactionId) {
    try {
      const response = await api.get(`/marketplace/consumer/payments/mtn/status/${transactionId}/`);

      return {
        success: response.data.success,
        status: response.data.status,
        completed: response.data.completed,
        failed: response.data.failed,
      };
    } catch (error) {
      console.error('Error checking MTN payment status:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to check payment status',
      };
    }
  }

  /**
   * Confirm payment completion (for both Stripe and MTN)
   */
  async confirmPayment(paymentData) {
    try {
      const response = await api.post('/payments/confirm/', paymentData);

      return {
        success: true,
        orderId: response.data.order_id,
        receipt: response.data.receipt,
      };
    } catch (error) {
      console.error('Error confirming payment:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to confirm payment',
      };
    }
  }

  /**
   * Process checkout with selected payment method
   */
  async processCheckout(orderData, paymentMethod, paymentDetails) {
    try {
      const checkoutData = {
        ...orderData,
        payment_method: paymentMethod,
        payment_details: paymentDetails,
      };

      const response = await api.post('/marketplace/consumer/checkout/', checkoutData);

      return {
        success: true,
        orderId: response.data.order_id,
        orderNumber: response.data.order_number,
        receipt: response.data.receipt,
      };
    } catch (error) {
      console.error('Error processing checkout:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Checkout failed',
      };
    }
  }
}

export default new PaymentService();