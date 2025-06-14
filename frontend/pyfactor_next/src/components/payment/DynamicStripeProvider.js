'use client';

import { useState, useEffect } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { logger } from '@/utils/logger';

export function DynamicStripeProvider({ children }) {
  const [stripePromise, setStripePromise] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializeStripe = async () => {
      try {
        // First try to get from environment
        let publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
        
        // If not available, fetch from API
        if (!publishableKey) {
          console.log('[DynamicStripe] Fetching Stripe key from API...');
          const response = await fetch('/api/config/stripe');
          const data = await response.json();
          publishableKey = data.publishableKey;
        }

        if (!publishableKey) {
          throw new Error('Stripe publishable key not found');
        }

        console.log('[DynamicStripe] Initializing Stripe with key:', publishableKey.substring(0, 10) + '...');
        
        const stripe = await loadStripe(publishableKey, {
          betas: ['partitioned_cookies_beta_1'],
          cookieOptions: {
            secure: true,
            sameSite: 'none',
            partitioned: true
          }
        });
        
        setStripePromise(stripe);
        setLoading(false);
      } catch (err) {
        console.error('[DynamicStripe] Error:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    initializeStripe();
  }, []);

  if (loading) {
    return (
      <div className="max-w-md mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-12 bg-gray-200 rounded mb-4"></div>
          <div className="h-10 bg-gray-200 rounded w-32"></div>
        </div>
        <p className="text-center text-gray-600 mt-4">Loading payment system...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold">Payment System Error</h3>
          <p className="text-red-600 mt-2">{error}</p>
          <p className="text-sm text-red-500 mt-2">Please refresh the page or contact support.</p>
        </div>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      {children}
    </Elements>
  );
}