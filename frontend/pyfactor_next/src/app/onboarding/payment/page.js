'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { DynamicStripeProvider } from '@/components/payment/DynamicStripeProvider';
import { useAuth } from '@/hooks/auth';
import { logger } from '@/utils/logger';

// PaymentForm component that uses Stripe hooks
function PaymentForm({ plan, billingCycle }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Card element styling
  const cardStyle = {
    style: {
      base: {
        color: '#32325d',
        fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
        fontSmoothing: 'antialiased',
        fontSize: '16px',
        '::placeholder': {
          color: '#aab7c4'
        }
      },
      invalid: {
        color: '#fa755a',
        iconColor: '#fa755a'
      }
    }
  };

  const getPrice = () => {
    const prices = {
      professional: { monthly: 15, yearly: 144 },
      enterprise: { monthly: 35, yearly: 336 }
    };
    return prices[plan.toLowerCase()]?.[billingCycle] || 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      logger.error('Stripe not loaded');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Get card element
      const cardElement = elements.getElement(CardElement);
      
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      // Create payment method
      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          email: user?.email,
          name: user?.name,
        },
      });

      if (pmError) {
        throw pmError;
      }

      logger.info('Payment method created:', paymentMethod.id);

      // Create subscription on backend
      const response = await fetch('/api/payments/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentMethodId: paymentMethod.id,
          plan: plan.toLowerCase(),
          billingCycle,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Subscription creation failed');
      }

      // Handle 3D Secure if required
      if (result.requiresAction) {
        const { error: confirmError } = await stripe.confirmCardPayment(
          result.clientSecret
        );

        if (confirmError) {
          throw confirmError;
        }
      }

      logger.info('Subscription created successfully');
      setSuccess(true);
      
      // Redirect to dashboard after short delay
      setTimeout(() => {
        router.push('/dashboard?welcome=true');
      }, 2000);

    } catch (err) {
      logger.error('Payment error:', err);
      setError(err.message || 'An error occurred during payment');
    } finally {
      setIsProcessing(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto text-center">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-green-800 mb-2">Payment Successful!</h3>
          <p className="text-green-700">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Complete Your Subscription</h2>
        <p className="text-gray-600">
          {plan} Plan - ${getPrice()}/{billingCycle === 'monthly' ? 'month' : 'year'}
        </p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Card Information
        </label>
        <div className="border border-gray-300 rounded-md p-3 min-h-[50px]">
          <CardElement 
            options={cardStyle}
            onReady={() => {
              logger.info('CardElement ready');
              console.log('[Stripe] Card element is ready');
            }}
            onChange={(e) => {
              if (e.error) {
                logger.error('CardElement error:', e.error);
                setError(e.error.message);
              } else {
                setError(null);
              }
            }}
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${
          !stripe || isProcessing
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {isProcessing ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </span>
        ) : (
          `Subscribe - $${getPrice()}/${billingCycle === 'monthly' ? 'mo' : 'yr'}`
        )}
      </button>

      <p className="mt-4 text-sm text-center text-gray-500">
        You can cancel or change your plan anytime from your dashboard.
      </p>
    </form>
  );
}

// Main PaymentPage component
export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [plan, setPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const planParam = searchParams.get('plan');
    const billingParam = searchParams.get('billing') || 'monthly';

    logger.info('PaymentPage initialized', {
      planParam,
      billingParam,
    });

    if (!planParam || planParam.toLowerCase() === 'free') {
      // Redirect to dashboard if free plan or no plan
      logger.info('Redirecting to dashboard - free plan or no plan selected');
      router.push('/dashboard');
      return;
    }

    setPlan(planParam);
    setBillingCycle(billingParam);
    setLoading(false);
  }, [searchParams, router]);

  if (loading || !plan) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <DynamicStripeProvider>
        <PaymentForm plan={plan} billingCycle={billingCycle} />
      </DynamicStripeProvider>
    </div>
  );
}