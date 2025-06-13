'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { useAuth } from '@/hooks/auth';
import { logger } from '@/utils/logger';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

function PaymentForm({ plan, billingCycle }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const { user } = useAuth();
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  // Calculate the price based on plan and billing cycle
  const getPrice = () => {
    const prices = {
      professional: {
        monthly: 15,
        yearly: 290
      },
      enterprise: {
        monthly: 35,
        yearly: 990
      }
    };
    return prices[plan.toLowerCase()]?.[billingCycle] || 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Create subscription on the backend
      const response = await fetch('/api/stripe/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: plan.toLowerCase(),
          billingCycle,
          email: user?.email,
          userId: user?.sub
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create subscription');
      }

      const { clientSecret, subscriptionId } = await response.json();

      // Confirm the payment with automatic currency conversion
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: {
            email: user?.email,
          },
        },
        payment_method_options: {
          card: {
            // This enables automatic currency conversion
            currency: 'auto',
          },
        },
      });

      if (result.error) {
        setError(result.error.message);
        setProcessing(false);
      } else {
        if (result.paymentIntent.status === 'succeeded') {
          setSucceeded(true);
          
          // Complete the onboarding
          await fetch('/api/onboarding/complete-payment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              subscriptionId,
              plan,
              billingCycle,
              paymentIntentId: result.paymentIntent.id
            }),
          });

          // Redirect to dashboard
          setTimeout(() => {
            router.push('/dashboard');
          }, 2000);
        }
      }
    } catch (err) {
      logger.error('Payment error:', err);
      setError(err.message || 'An unexpected error occurred.');
      setProcessing(false);
    }
  };

  const cardStyle = {
    style: {
      base: {
        color: '#32325d',
        fontFamily: 'Arial, sans-serif',
        fontSmoothing: 'antialiased',
        fontSize: '16px',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#fa755a',
        iconColor: '#fa755a',
      },
    },
  };

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
        <div className="border border-gray-300 rounded-md p-3">
          <CardElement options={cardStyle} />
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {succeeded && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-600 text-sm">
            Payment successful! Redirecting to your dashboard...
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || processing || succeeded}
        className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${
          processing || succeeded
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {processing ? 'Processing...' : succeeded ? 'Payment Complete' : `Subscribe - $${getPrice()}`}
      </button>

      <p className="mt-4 text-xs text-gray-500 text-center">
        Your subscription will automatically renew {billingCycle === 'monthly' ? 'each month' : 'annually'}.
        You can cancel anytime from your dashboard.
      </p>
    </form>
  );
}

export default function PaymentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [plan, setPlan] = useState('');
  const [billingCycle, setBillingCycle] = useState('monthly');

  useEffect(() => {
    // Get plan details from URL params
    const planParam = searchParams.get('plan');
    const billingParam = searchParams.get('billing') || 'monthly';

    if (!planParam || planParam.toLowerCase() === 'free') {
      // Redirect to dashboard if free plan or no plan
      router.push('/dashboard');
      return;
    }

    setPlan(planParam);
    setBillingCycle(billingParam);
  }, [searchParams, router]);

  if (!plan) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <Elements stripe={stripePromise}>
          <PaymentForm plan={plan} billingCycle={billingCycle} />
        </Elements>
      </div>
    </div>
  );
}