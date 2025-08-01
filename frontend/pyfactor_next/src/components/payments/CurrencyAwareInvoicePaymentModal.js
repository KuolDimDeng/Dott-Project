'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { XMarkIcon, CreditCardIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { useToast } from '@/components/Toast/ToastProvider';
import { formatCurrency, getCurrencyInfo } from '@/utils/currencyFormatter';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

// Currency-aware payment form component
const CurrencyAwarePaymentForm = ({ invoice, clientSecret, onSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { showToast } = useToast();
  const [processing, setProcessing] = useState(false);
  const [fees, setFees] = useState(null);
  const [currencyPreferences, setCurrencyPreferences] = useState(null);
  const [exchangeRate, setExchangeRate] = useState(null);
  const [showRateWarning, setShowRateWarning] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    loadCurrencyPreferences();
  }, []);

  useEffect(() => {
    if (currencyPreferences) {
      calculateFees();
      if (currencyPreferences.currency_code !== 'USD') {
        getExchangeRate();
      }
    }
  }, [currencyPreferences, invoice.amount]);

  const loadCurrencyPreferences = async () => {
    try {
      const response = await fetch('/api/currency/preferences');
      const data = await response.json();
      
      if (data.success) {
        setCurrencyPreferences(data.preferences);
      } else {
        // Default to USD
        setCurrencyPreferences({
          currency_code: 'USD',
          currency_name: 'US Dollar',
          currency_symbol: '$'
        });
      }
    } catch (error) {
      console.error('Error loading currency preferences:', error);
      setCurrencyPreferences({
        currency_code: 'USD',
        currency_name: 'US Dollar',
        currency_symbol: '$'
      });
    }
  };

  const getExchangeRate = async () => {
    try {
      const response = await fetch('/api/currency/exchange-rate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from_currency: 'USD',
          to_currency: currencyPreferences.currency_code,
          amount: invoice.amount,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setExchangeRate(data.exchange_rate);
        setShowRateWarning(data.exchange_rate.is_outdated);
      }
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
    }
  };

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

    if (!confirmed && currencyPreferences?.currency_code !== 'USD') {
      showToast('Please confirm you understand the USD payment amount', 'error');
      return;
    }

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
        invoice_id: invoice.id,
        exchange_rate_used: exchangeRate?.rate,
        local_currency: currencyPreferences?.currency_code,
        local_amount: exchangeRate?.original_amount
      })
    });

    if (!response.ok) {
      throw new Error('Failed to confirm payment');
    }
  };

  const formatLocalAmount = (usdAmount) => {
    if (!currencyPreferences || currencyPreferences.currency_code === 'USD') {
      return `$${usdAmount.toFixed(2)}`;
    }
    
    if (exchangeRate) {
      const localAmount = parseFloat(exchangeRate.converted_amount);
      return formatCurrency(localAmount, currencyPreferences.currency_code);
    }
    
    return `$${usdAmount.toFixed(2)}`;
  };

  if (!currencyPreferences) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Currency Display Section */}
      {currencyPreferences.currency_code !== 'USD' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <InformationCircleIcon className="h-5 w-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-blue-900 mb-2">
                Multi-Currency Payment
              </h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p>• Invoice Amount: {formatLocalAmount(invoice.amount)}</p>
                <p>• Payment will be charged in USD: <span className="font-medium">${invoice.amount.toFixed(2)}</span></p>
                {exchangeRate && (
                  <p>• Exchange Rate: 1 USD = {exchangeRate.rate} {currencyPreferences.currency_code}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exchange Rate Warning */}
      {showRateWarning && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">
                Exchange Rate Notice
              </h4>
              <p className="text-sm text-yellow-700 mt-1">
                The exchange rate may be outdated. The actual charge will be based on current rates at the time of payment.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Payment Summary */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
        <h3 className="font-medium text-gray-900">Payment Summary</h3>
        
        {currencyPreferences.currency_code !== 'USD' && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Invoice Amount ({currencyPreferences.currency_code}):</span>
            <span className="font-medium">{formatLocalAmount(invoice.amount)}</span>
          </div>
        )}
        
        <div className="flex justify-between">
          <span className="text-gray-600">Amount to be charged (USD):</span>
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
            <span>Total Charge (USD):</span>
            <span className="text-lg">{fees?.total || '...'}</span>
          </div>
        </div>
      </div>

      {/* Confirmation Checkbox for Non-USD */}
      {currencyPreferences.currency_code !== 'USD' && (
        <div className="border border-gray-200 rounded-lg p-4">
          <label className="flex items-start">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-3 text-sm text-gray-700">
              I understand that I will be charged <strong>{fees?.total || '...'}</strong> USD, 
              regardless of exchange rate fluctuations. This is equivalent to approximately{' '}
              <strong>{formatLocalAmount(parseFloat(fees?.total?.replace('$', '') || invoice.amount))}</strong> 
              {' '}based on current rates.
            </span>
          </label>
        </div>
      )}

      {/* Card Element */}
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
            },
          }}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || processing || (currencyPreferences.currency_code !== 'USD' && !confirmed)}
          className={`flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            processing || (currencyPreferences.currency_code !== 'USD' && !confirmed)
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {processing ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : (
            `Pay ${fees?.total || '...'}`
          )}
        </button>
      </div>
    </form>
  );
};

// Main modal component
const CurrencyAwareInvoicePaymentModal = ({ isOpen, onClose, invoice, onSuccess }) => {
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen && invoice) {
      createPaymentIntent();
    }
  }, [isOpen, invoice]);

  const createPaymentIntent = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/payments/create-invoice-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_id: invoice.id,
          amount: invoice.amount
        })
      });

      const data = await response.json();
      if (data.success) {
        setClientSecret(data.client_secret);
      } else {
        showToast('Failed to initialize payment', 'error');
        onClose();
      }
    } catch (error) {
      showToast('Failed to initialize payment', 'error');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    setClientSecret('');
    onSuccess();
    onClose();
  };

  const handleCancel = () => {
    setClientSecret('');
    onClose();
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleCancel}>
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
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 flex items-center">
                    <CreditCardIcon className="h-5 w-5 mr-2" />
                    Pay Invoice
                  </Dialog.Title>
                  <button
                    onClick={handleCancel}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                {loading ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : clientSecret ? (
                  <Elements stripe={stripePromise}>
                    <CurrencyAwarePaymentForm
                      invoice={invoice}
                      clientSecret={clientSecret}
                      onSuccess={handleSuccess}
                      onCancel={handleCancel}
                    />
                  </Elements>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    Failed to initialize payment
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default CurrencyAwareInvoicePaymentModal;