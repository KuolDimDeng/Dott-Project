import { useState, useCallback } from 'react';
import { logger } from '@/utils/logger';

export const useStripe = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createCheckoutSession = useCallback(async (priceId) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/billing/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ priceId })
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (err) {
      logger.error('[useStripe] Error creating checkout session:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createPortalSession = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/billing/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to create portal session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (err) {
      logger.error('[useStripe] Error creating portal session:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createCheckoutSession,
    createPortalSession,
    loading,
    error
  };
};