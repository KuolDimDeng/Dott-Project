/**
 * Stripe Utilities
 * Handles Stripe loading and initialization
 */

import { Cache as cache } from '@aws-amplify/core';

const STRIPE_CACHE_KEY = 'stripeLoaded';
const STRIPE_SCRIPT_ID = 'stripe-js';

/**
 * Load Stripe script
 * @returns {Promise<void>}
 */
export const loadStripeScript = () => {
  return new Promise((resolve, reject) => {
    if (document.getElementById(STRIPE_SCRIPT_ID)) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.id = STRIPE_SCRIPT_ID;
    script.src = 'https://js.stripe.com/v3/';
    script.async = true;
    script.onload = () => {
      cache.setItem(STRIPE_CACHE_KEY, true)
        .then(() => resolve())
        .catch(error => {
          console.error('Error caching Stripe loaded state:', error);
          resolve(); // Still resolve as script loaded successfully
        });
    };
    script.onerror = (error) => {
      console.error('Error loading Stripe script:', error);
      reject(error);
    };
    document.head.appendChild(script);
  });
};

/**
 * Check if Stripe is loaded
 * @returns {Promise<boolean>}
 */
export const isStripeLoaded = async () => {
  try {
    return await cache.getItem(STRIPE_CACHE_KEY) || false;
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
export const clearStripeCache = async () => {
  try {
    await cache.removeItem(STRIPE_CACHE_KEY);
  } catch (error) {
    console.error('Error clearing Stripe cache:', error);
    throw error;
  }
}; 