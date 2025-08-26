'use client';

import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { CardElementForm, BankAccountForm, SplitCardElementForm } from './StripePaymentForm';
import { toast } from 'react-hot-toast';

// Initialize Stripe - this should be done once at the app level
// In production, use your publishable key from environment variables
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

export const StripePaymentModal = ({ 
  isOpen, 
  onClose, 
  customerId, 
  customerEmail,
  onSuccess 
}) => {
  const [paymentType, setPaymentType] = useState('card');
  const [clientSecret, setClientSecret] = useState(null);
  const [isLoadingSecret, setIsLoadingSecret] = useState(false);

  // Fetch setup intent when modal opens (for Payment Element)
  useEffect(() => {
    if (isOpen && paymentType === 'payment_element') {
      fetchSetupIntent();
    }
  }, [isOpen, paymentType]);

  const fetchSetupIntent = async () => {
    setIsLoadingSecret(true);
    try {
      const response = await fetch('/api/payments/create-setup-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          customer_id: customerId,
          customer_email: customerEmail,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setClientSecret(data.client_secret);
      } else {
        toast.error(data.error || 'Failed to initialize payment setup');
      }
    } catch (error) {
      toast.error('Failed to initialize payment setup');
      console.error('Setup intent error:', error);
    } finally {
      setIsLoadingSecret(false);
    }
  };

  const handleSuccess = async (paymentMethod) => {
    toast.success('Payment method added successfully');
    onSuccess && onSuccess(paymentMethod);
    onClose();
    
    // Reset state
    setPaymentType('card');
    setClientSecret(null);
  };

  const handleClose = () => {
    onClose();
    // Reset state
    setPaymentType('card');
    setClientSecret(null);
  };

  // Stripe Elements options
  const elementsOptions = {
    clientSecret,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#2563eb',
        colorBackground: '#ffffff',
        colorText: '#111827',
        colorDanger: '#dc2626',
        fontFamily: 'system-ui, sans-serif',
        borderRadius: '8px',
      },
    },
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900"
                >
                  Add Payment Method
                </Dialog.Title>
                
                <div className="mt-4">
                  {/* Payment Type Selection */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Type
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setPaymentType('card')}
                        className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                          paymentType === 'card'
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        💳 Credit/Debit Card
                      </button>
                      <button
                        onClick={() => setPaymentType('bank')}
                        className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                          paymentType === 'bank'
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        🏦 Bank Account
                      </button>
                    </div>
                  </div>

                  {/* PCI Compliance Notice */}
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-green-800">
                          <strong>PCI Compliant & Secure</strong>
                        </p>
                        <p className="text-xs text-green-700 mt-1">
                          Your payment information is encrypted and processed securely by Stripe. 
                          We never store sensitive card details on our servers.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Stripe Elements Forms */}
                  <Elements stripe={stripePromise} options={paymentType === 'payment_element' ? elementsOptions : {}}>
                    {paymentType === 'card' && (
                      <CardElementForm
                        customerId={customerId}
                        onSuccess={handleSuccess}
                        onCancel={handleClose}
                      />
                    )}
                    
                    {paymentType === 'bank' && (
                      <BankAccountForm
                        customerId={customerId}
                        onSuccess={handleSuccess}
                        onCancel={handleClose}
                      />
                    )}
                  </Elements>

                  {/* Security Badges */}
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-center space-x-4">
                      <div className="flex items-center text-xs text-gray-500">
                        <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        SSL Encrypted
                      </div>
                      <div className="flex items-center text-xs text-gray-500">
                        <img 
                          src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" 
                          alt="Stripe" 
                          className="h-4 mr-1"
                        />
                        Secured by Stripe
                      </div>
                      <div className="flex items-center text-xs text-gray-500">
                        PCI DSS Compliant
                      </div>
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};