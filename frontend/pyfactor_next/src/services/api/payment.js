import { logger } from '@/utils/logger';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * Make authenticated request to payment API
 */
async function makePaymentRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      credentials: 'include' // Include cookies for Auth0 session
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: `Request failed with status ${response.status}`
      }));
      throw new Error(error.error || error.message || 'Payment request failed');
    }

    return response.json();
  } catch (error) {
    logger.error('[PaymentAPI] Request failed:', error);
    throw error;
  }
}

/**
 * Create a payment intent with Stripe
 * @param {Object} data - Payment data
 * @returns {Promise<Object>} Payment intent with client secret
 */
export async function createPaymentIntent(data = {}) {
  try {
    logger.debug('[PaymentAPI] Creating payment intent');

    const response = await makePaymentRequest(
      `${API_BASE_URL}/api/payments/create-intent/`,
      {
        method: 'POST',
        body: JSON.stringify(data)
      }
    );

    logger.info('[PaymentAPI] Payment intent created successfully');
    return response;
  } catch (error) {
    logger.error('[PaymentAPI] Failed to create payment intent:', error);
    throw error;
  }
}

/**
 * Confirm payment after successful Stripe payment
 * @param {string} paymentIntentId - Stripe payment intent ID
 * @returns {Promise<Object>} Confirmation response
 */
export async function confirmPayment(paymentIntentId) {
  try {
    logger.debug('[PaymentAPI] Confirming payment:', paymentIntentId);

    const response = await makePaymentRequest(
      `${API_BASE_URL}/api/payments/confirm/`,
      {
        method: 'POST',
        body: JSON.stringify({
          payment_intent_id: paymentIntentId
        })
      }
    );

    // Update localStorage for compatibility
    if (response?.success) {
      const userAttributes = JSON.parse(localStorage.getItem('userAttributes') || '{}');
      userAttributes['custom:payment_completed'] = 'true';
      localStorage.setItem('userAttributes', JSON.stringify(userAttributes));
    }

    logger.info('[PaymentAPI] Payment confirmed successfully');
    return response;
  } catch (error) {
    logger.error('[PaymentAPI] Failed to confirm payment:', error);
    throw error;
  }
}

/**
 * Get Stripe publishable key
 * @returns {string} Stripe publishable key
 */
export function getStripePublishableKey() {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
}

// Export payment API object
export const paymentApi = {
  createPaymentIntent,
  confirmPayment,
  getStripePublishableKey
};

export default paymentApi;