'use client';

import { useState, useEffect } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { logger } from '@/utils/logger';

// Load Stripe instance once
let stripePromise;

export const getStripe = () => {
  if (!stripePromise) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    
    if (!publishableKey) {
      logger.error('[StripeProvider] Missing Stripe publishable key');
      throw new Error('Missing Stripe publishable key');
    }
    
    // Initialize Stripe with cookie options to fix partitioned cookie warnings
    stripePromise = loadStripe(publishableKey, {
      betas: ['partitioned_cookies_beta_1'],
      cookieOptions: {
        secure: true,
        sameSite: 'none',
        partitioned: true
      }
    });
    
    logger.debug('[StripeProvider] Initialized Stripe with partitioned cookie support');
  }
  
  return stripePromise;
};

export function StripeProvider({ children, options }) {
  const [stripe, setStripe] = useState(null);
  
  useEffect(() => {
    const loadAndSetStripe = async () => {
      try {
        const stripeInstance = await getStripe();
        setStripe(stripeInstance);
      } catch (error) {
        logger.error('[StripeProvider] Error loading Stripe:', error);
      }
    };
    
    loadAndSetStripe();
  }, []);
  
  return (
    <Elements stripe={stripe} options={options}>
      {children}
    </Elements>
  );
}

export default StripeProvider; 