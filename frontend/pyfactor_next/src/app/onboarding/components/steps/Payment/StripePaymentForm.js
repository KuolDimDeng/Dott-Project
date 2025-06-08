'use client';


import { useState, useEffect } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { LockClosedIcon } from '@heroicons/react/24/outline';
import { logger } from '@/utils/logger';
import axios from 'axios';

export const StripePaymentForm = ({ 
  subscriptionData, 
  onSuccess, 
  onError
}) => {
  const stripe = useStripe();
  const elements = useElements();
  
  const [isLoading, setIsLoading] = useState(false);
  const [cardError, setCardError] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  
  // Fetch payment intent when component mounts
  useEffect(() => {
    if (!subscriptionData || !subscriptionData.plan) {
      onError('Missing subscription data. Please select a plan first.');
      return;
    }
    
    const fetchPaymentIntent = async () => {
      try {
        setIsLoading(true);
        
        const response = await axios.post('/api/payments/create-payment-intent', {
          plan: subscriptionData.plan,
          billingCycle: subscriptionData.billingCycle || 'monthly'
        });
        
        if (response.data && response.data.clientSecret) {
          setClientSecret(response.data.clientSecret);
          logger.debug('[StripePaymentForm] Payment intent created successfully');
        } else {
          throw new Error('Failed to create payment intent');
        }
      } catch (error) {
        logger.error('[StripePaymentForm] Error creating payment intent:', error);
        setCardError(error.response?.data?.message || 'Failed to create payment intent');
        onError(error.response?.data?.message || 'Failed to create payment intent');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPaymentIntent();
  }, [subscriptionData, onError]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!stripe || !elements || !clientSecret) {
      return;
    }
    
    try {
      setIsLoading(true);
      setCardError('');
      
      const cardElement = elements.getElement(CardElement);
      
      if (!cardElement) {
        throw new Error('Card element not found');
      }
      
      // Confirm card payment
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            // You can add additional billing details here if needed
          },
        },
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (paymentIntent.status === 'succeeded') {
        // Create a payment result object
        const paymentResult = {
          paymentId: paymentIntent.id,
          timestamp: new Date().toISOString(),
          amount: paymentIntent.amount / 100, // Convert from cents to dollars
          currency: paymentIntent.currency,
          status: paymentIntent.status,
          method: 'card',
          lastFour: paymentIntent.payment_method_details?.card?.last4 || ''
        };
        
        logger.debug('[StripePaymentForm] Payment successful:', { id: paymentIntent.id });
        onSuccess(paymentResult);
      } else {
        throw new Error(`Payment status: ${paymentIntent.status}`);
      }
    } catch (error) {
      logger.error('[StripePaymentForm] Payment error:', error);
      setCardError(error.message || 'Failed to process your payment. Please try again.');
      onError(error.message || 'Failed to process your payment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="w-full space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="space-y-6">
          <div>
            <label htmlFor="card-element" className="block text-sm font-medium text-gray-700 mb-1">
              Card Details
            </label>
            <div className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500">
              <CardElement 
                id="card-element"
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: '#32325d',
                      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
                      '::placeholder': {
                        color: '#a0aec0',
                      },
                    },
                    invalid: {
                      color: '#e53e3e',
                      iconColor: '#e53e3e',
                    },
                  },
                }}
              />
            </div>
            {cardError && (
              <p className="mt-1 text-sm text-red-600">{cardError}</p>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-center mt-2 mb-6 text-xs text-gray-500">
        <LockClosedIcon className="h-4 w-4 mr-1" />
        <span>Your payment information is secure and encrypted</span>
      </div>
      
      <button
        type="submit"
        disabled={!stripe || !elements || isLoading || !clientSecret}
        className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:outline-none"
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </div>
        ) : (
          `Pay $${(subscriptionData?.price || 0).toFixed(2)}`
        )}
      </button>
      
      <div className="mt-4 flex justify-center">
        <p className="text-xs text-gray-500">
          Use Stripe test card: 4242 4242 4242 4242, any future date, any CVC
        </p>
      </div>
    </form>
  );
}; 