'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { XMarkIcon, CreditCardIcon } from '@heroicons/react/24/outline';
import { useToast } from '@/components/Toast/ToastProvider';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

// Payment form component
const PaymentForm = ({ invoice, clientSecret, onSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { showToast } = useToast();
  const [processing, setProcessing] = useState(false);
  const [fees, setFees] = useState(null);

  useEffect(() => {
    // Calculate fees when component mounts
    calculateFees();
  }, [invoice.amount]);

  const calculateFees = async () => {
    try {
      const response = await fetch('/api/payments/calculate-fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: invoice.amount,
          payment_type: 'invoice_payment'
        })
      });

      const data = await response.json();
      if (data.success) {
        setFees(data.fees);
      }
    } catch (error) {
      console.error('Error calculating fees:', error);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) return;

    setProcessing(true);

    try {
      // Confirm the payment
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: {
            email: invoice.customer_email,
            name: invoice.customer_name
          }
        }
      });

      if (result.error) {
        showToast(result.error.message, 'error');
      } else {
        // Payment succeeded
        await confirmPaymentOnBackend(result.paymentIntent.id);
        showToast('Payment successful!', 'success');
        onSuccess();
      }
    } catch (error) {
      showToast('Payment failed. Please try again.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const confirmPaymentOnBackend = async (paymentIntentId) => {
    const response = await fetch('/api/payments/confirm-invoice-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payment_intent_id: paymentIntentId,
        invoice_id: invoice.id
      })
    });

    if (!response.ok) {
      throw new Error('Failed to confirm payment');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Summary */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
        <h3 className="font-medium text-gray-900">Payment Summary</h3>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Invoice Amount:</span>
            <span className="font-medium">{fees?.subtotal || `$${invoice.amount.toFixed(2)}`}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Processing Fee:</span>
            <span className="font-medium">{fees?.processing_fee || '...'}</span>
          </div>
          <div className="text-xs text-gray-500 italic">
            {fees?.breakdown || '(2.9% + $0.60 processing fee)'}
          </div>
          <div className="border-t pt-1 mt-2">
            <div className="flex justify-between font-medium">
              <span>Total:</span>
              <span className="text-lg">{fees?.total || '...'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Card Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Card Details
        </label>
        <div className="border border-gray-300 rounded-md p-3">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
                invalid: {
                  color: '#9e2146',
                },
              },
            }}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-3">
        <button
          type="submit"
          disabled={!stripe || processing}
          className={`flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            processing
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {processing ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Processing...
            </>
          ) : (
            `Pay ${fees?.total || '...'}`
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>

      {/* Security Notice */}
      <div className="text-xs text-gray-500 text-center">
        <CreditCardIcon className="inline h-4 w-4 mr-1" />
        Your payment information is secure and encrypted
      </div>
    </form>
  );
};

// Main modal component
export default function InvoicePaymentModal({ invoice, isOpen, onClose, onSuccess }) {
  const [clientSecret, setClientSecret] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && invoice) {
      createPaymentIntent();
    }
  }, [isOpen, invoice]);

  const createPaymentIntent = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/payments/create-invoice-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_id: invoice.id })
      });

      const data = await response.json();

      if (data.success) {
        setClientSecret(data.client_secret);
      } else {
        setError(data.error || 'Failed to initialize payment');
      }
    } catch (err) {
      setError('Failed to connect to payment system');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="absolute inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="absolute right-0 top-0 pr-4 pt-4">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                      Pay Invoice #{invoice?.invoice_number}
                    </Dialog.Title>

                    <div className="mt-4">
                      {loading ? (
                        <div className="text-center py-8">
                          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                          <p className="mt-2 text-sm text-gray-500">Initializing payment...</p>
                        </div>
                      ) : error ? (
                        <div className="text-center py-8">
                          <p className="text-red-600">{error}</p>
                          <button
                            onClick={createPaymentIntent}
                            className="mt-4 text-sm text-blue-600 hover:text-blue-500"
                          >
                            Try again
                          </button>
                        </div>
                      ) : clientSecret ? (
                        <Elements stripe={stripePromise}>
                          <PaymentForm
                            invoice={invoice}
                            clientSecret={clientSecret}
                            onSuccess={onSuccess}
                            onCancel={onClose}
                          />
                        </Elements>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}