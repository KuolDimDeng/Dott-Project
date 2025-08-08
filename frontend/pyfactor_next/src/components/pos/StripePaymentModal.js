'use client';

import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { CreditCardIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

// Card element options
const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      '::placeholder': {
        color: '#aab7c4',
      },
      fontFamily: 'Inter, system-ui, sans-serif',
    },
    invalid: {
      color: '#9e2146',
      iconColor: '#9e2146',
    },
  },
  hidePostalCode: false,
};

// Payment form component
function PaymentForm({ amount, onSuccess, onCancel, saleData, customerName }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [cardComplete, setCardComplete] = useState(false);

  const handleCardChange = (event) => {
    setError(event.error ? event.error.message : null);
    setCardComplete(event.complete);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Step 1: Create payment intent on backend
      console.log('[StripePayment] Creating payment intent for amount:', amount);
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          amount: Math.round(amount * 100), // Convert to cents
          currency: 'usd',
          sale_data: saleData,
          customer_name: customerName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create payment intent');
      }

      const { client_secret, payment_intent_id } = await response.json();
      console.log('[StripePayment] Payment intent created:', payment_intent_id);

      // Step 2: Confirm the payment with Stripe
      const cardElement = elements.getElement(CardElement);
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        client_secret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: customerName || 'Walk-In Customer',
            },
          },
        }
      );

      if (stripeError) {
        console.error('[StripePayment] Payment confirmation error:', stripeError);
        setError(stripeError.message);
        toast.error(stripeError.message);
      } else if (paymentIntent.status === 'succeeded') {
        console.log('[StripePayment] Payment succeeded:', paymentIntent.id);
        toast.success('Payment successful!');
        
        // Call success callback with payment details
        onSuccess({
          payment_intent_id: paymentIntent.id,
          amount_charged: paymentIntent.amount / 100,
          payment_method_id: paymentIntent.payment_method,
          status: paymentIntent.status,
        });
      }
    } catch (err) {
      console.error('[StripePayment] Error processing payment:', err);
      setError(err.message);
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Amount Display */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <span className="text-lg font-medium text-gray-700">Total Amount:</span>
          <span className="text-2xl font-bold text-gray-900">
            ${amount.toFixed(2)}
          </span>
        </div>
        {customerName && (
          <div className="mt-2 text-sm text-gray-600">
            Customer: {customerName}
          </div>
        )}
      </div>

      {/* Card Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Card Details
        </label>
        <div className="p-3 border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
          <CardElement
            options={CARD_ELEMENT_OPTIONS}
            onChange={handleCardChange}
          />
        </div>
        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}
      </div>

      {/* Security Notice */}
      <div className="flex items-start space-x-2 text-xs text-gray-500">
        <CreditCardIcon className="h-4 w-4 mt-0.5" />
        <span>
          Your payment information is secure and encrypted. We never store card details.
        </span>
      </div>

      {/* Buttons */}
      <div className="flex space-x-3">
        <button
          type="submit"
          disabled={!stripe || processing || !cardComplete}
          className={`flex-1 py-3 px-4 rounded-md font-medium transition-colors ${
            processing || !cardComplete
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {processing ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Processing...
            </span>
          ) : (
            `Pay $${amount.toFixed(2)}`
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={processing}
          className="px-6 py-3 bg-gray-200 text-gray-700 rounded-md font-medium hover:bg-gray-300 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// Main modal component
export default function StripePaymentModal({ 
  isOpen, 
  onClose, 
  amount, 
  onSuccess, 
  saleData,
  customerName 
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />

      {/* Modal */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">
              Credit Card Payment
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <Elements stripe={stripePromise}>
              <PaymentForm
                amount={amount}
                onSuccess={onSuccess}
                onCancel={onClose}
                saleData={saleData}
                customerName={customerName}
              />
            </Elements>
          </div>

          {/* Footer with security badges */}
          <div className="px-6 py-4 bg-gray-50 border-t">
            <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
              <span>Powered by</span>
              <svg className="h-5" viewBox="0 0 60 25" fill="none">
                <path
                  d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.48zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.08 1.02a4.7 4.7 0 0 1 3.23-1.29c2.9 0 5.62 2.6 5.62 7.4 0 5.23-2.7 7.6-5.65 7.6zM40 8.95c-.95 0-1.54.34-1.97.81l.02 6.12c.4.44.98.78 1.95.78 1.52 0 2.54-1.65 2.54-3.87 0-2.15-1.04-3.84-2.54-3.84zM28.24 5.57h4.13v14.44h-4.13V5.57zm0-4.7L32.37 0v3.36l-4.13.88V.88zm-3.06 9.01v4.12c0 2.32 1.15 2.97 2.81 2.97.5 0 1.08-.05 1.5-.13v3.8c-.44.13-1.22.23-2.19.23-3.52 0-6.11-1.51-6.11-6.11V9.88h-2.13V5.62h2.13V2.3l4.11-.88v4.21h3.88v4.24h-3.88zm-7.4-4.31h4.12v14.44h-4.12V5.57zm0-4.7L17.91 0v3.36l-4.13.88V.88zM8.44 20.3c-1.54 0-2.44-.56-3.08-1.11l.05 4.56L1.3 24.6V5.57h3.72l.1 1.1A4.06 4.06 0 0 1 8.3 5.28c2.99 0 5.8 2.51 5.8 7.45 0 5.05-2.81 7.58-5.66 7.58zm-.96-11.36c-.96 0-1.6.36-2.04.86v5.97c.42.48 1.1.88 2.08.88 1.56 0 2.62-1.6 2.62-3.78 0-2.23-1.1-3.93-2.66-3.93zM0 3.85l4.13-.88v2.33L0 6.18V3.85z"
                  fill="#6772E5"
                />
              </svg>
              <span>•</span>
              <span>Secure Payment</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}