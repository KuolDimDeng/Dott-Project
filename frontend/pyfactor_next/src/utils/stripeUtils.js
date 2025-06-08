/**
 * Stripe Utilities
 * Handles Stripe loading and initialization
 */

// Simple cache for Stripe loading status
const memoryCache = new Map();

const STRIPE_CACHE_KEY = 'stripeLoaded';
const STRIPE_SCRIPT_ID = 'stripe-js';

/**
 * Load Stripe script
 * @returns {Promise<void>}
 */
export const loadStripeScript = () => {
  return new Promise((resolve, reject) => {
    if (window.Stripe) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Stripe.js'));

    document.body.appendChild(script);
  });
};

/**
 * Check if Stripe is loaded
 * @returns {Promise<boolean>}
 */
export const isStripeLoaded = () => {
  try {
    return memoryCache.get(STRIPE_CACHE_KEY) || false;
  } catch (error) {
    console.error('Error checking Stripe loaded state:', error);
    return false;
  }
};

/**
 * Initialize Stripe with public key
 * @param {string} publicKey - Stripe public key
 * @returns {Promise<any>} Stripe instance
 */
export const initializeStripe = async (publicKey) => {
  try {
    if (!window.Stripe) {
      await loadStripeScript();
    }
    return window.Stripe(publicKey);
  } catch (error) {
    console.error('Error initializing Stripe:', error);
    throw error;
  }
};

/**
 * Clear Stripe cache
 * @returns {Promise<void>}
 */
export const clearStripeCache = () => {
  try {
    memoryCache.delete(STRIPE_CACHE_KEY);
  } catch (error) {
    console.error('Error clearing Stripe cache:', error);
    throw error;
  }
};

/**
 * Utility functions for Stripe integration
 */

/**
 * Creates a payment method from card details
 * @param {Object} stripe - The Stripe instance
 * @param {Object} elements - The Stripe Elements instance
 * @param {Object} cardElement - The card Element
 * @returns {Promise} - Resolves with the payment method or rejects with an error
 */
export const createPaymentMethod = async (stripe, elements, cardElement) => {
  try {
    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
    });

    if (error) {
      throw new Error(error.message);
    }

    return paymentMethod;
  } catch (error) {
    console.error('Error creating payment method:', error);
    throw error;
  }
};

/**
 * Formats currency amounts for display
 * @param {number} amount - Amount in smallest currency unit (e.g., cents)
 * @param {string} currency - Currency code (e.g., 'usd')
 * @returns {string} - Formatted currency string
 */
export const formatCurrency = (amount, currency = 'usd') => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  });
  
  // Stripe amounts are in cents, convert to dollars for display
  return formatter.format(amount / 100);
}; 