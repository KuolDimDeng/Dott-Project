import axios from 'axios';
import { logger } from './logger';

/**
 * Create a payment intent for subscription
 * @param {string} plan - Subscription plan ID (e.g., 'professional', 'enterprise')
 * @param {string} billingCycle - Billing cycle ('monthly' or 'annual')
 * @returns {Promise<Object>} - Payment intent information with client secret
 */
export const createPaymentIntent = async (plan, billingCycle) => {
  try {
    logger.debug('[stripeClient] Creating payment intent', { plan, billingCycle });
    
    const response = await axios.post('/api/payments/create-payment-intent', {
      plan,
      billingCycle
    });
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to create payment intent');
    }
    
    return {
      clientSecret: response.data.clientSecret,
      amount: response.data.amount
    };
  } catch (error) {
    logger.error('[stripeClient] Error creating payment intent:', error);
    throw new Error(error.response?.data?.message || error.message || 'Payment service unavailable');
  }
};

/**
 * Format payment amount from cents to dollars
 * @param {number} amount - Amount in cents
 * @returns {string} - Formatted amount in dollars
 */
export const formatPaymentAmount = (amount) => {
  return (amount / 100).toFixed(2);
};

/**
 * Get display-friendly payment method info
 * @param {Object} paymentMethod - Stripe payment method object
 * @returns {Object} - Simplified payment method info
 */
export const getPaymentMethodInfo = (paymentMethod) => {
  if (!paymentMethod) return null;
  
  const { type } = paymentMethod;
  
  // Handle card payment method
  if (type === 'card') {
    const { card } = paymentMethod;
    return {
      type: 'card',
      brand: card.brand,
      last4: card.last4,
      expiryMonth: card.exp_month,
      expiryYear: card.exp_year,
      displayName: `${card.brand.charAt(0).toUpperCase() + card.brand.slice(1)} •••• ${card.last4}`
    };
  }
  
  // Handle PayPal
  if (type === 'paypal') {
    return {
      type: 'paypal',
      displayName: 'PayPal'
    };
  }
  
  // Default case
  return {
    type,
    displayName: type.charAt(0).toUpperCase() + type.slice(1)
  };
};

export default {
  createPaymentIntent,
  formatPaymentAmount,
  getPaymentMethodInfo
}; 