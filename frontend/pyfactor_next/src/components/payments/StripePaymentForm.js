'use client';

import React, { useState, useEffect } from 'react';
import {
  PaymentElement,
  CardElement,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { ButtonSpinner } from '@/components/ui/StandardSpinner';

// Option 1: Using the unified Payment Element (Recommended - supports all payment methods)
export const PaymentElementForm = ({ customerId, onSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    // Confirm the setup using the Payment Element
    const { error, setupIntent } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        // Return URL for redirect-based payment methods
        return_url: `${window.location.origin}/dashboard/customers?payment_setup=success`,
      },
      redirect: 'if_required', // Only redirect if necessary (for bank debits, etc.)
    });

    if (error) {
      setErrorMessage(error.message);
      setIsProcessing(false);
    } else if (setupIntent && setupIntent.status === 'succeeded') {
      // Payment method successfully attached
      onSuccess(setupIntent);
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement 
        options={{
          layout: 'tabs',
          paymentMethodOrder: ['card', 'us_bank_account'],
        }}
      />
      
      {errorMessage && (
        <div className="text-red-600 text-sm mt-2">
          {errorMessage}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          disabled={isProcessing}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <span className="flex items-center">
              <ButtonSpinner />
              Processing...
            </span>
          ) : (
            'Add Payment Method'
          )}
        </button>
      </div>
    </form>
  );
};

// Option 2: Using individual Card Elements (More control over styling)
export const CardElementForm = ({ customerId, onSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [cardholderName, setCardholderName] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    const cardElement = elements.getElement(CardElement);

    // Create a payment method
    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
      billing_details: {
        name: cardholderName,
      },
    });

    if (error) {
      setErrorMessage(error.message);
      setIsProcessing(false);
      return;
    }

    // Send payment method to your server
    try {
      const response = await fetch('/api/payments/attach-payment-method', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          customer_id: customerId,
          payment_method_id: paymentMethod.id,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        onSuccess(paymentMethod);
      } else {
        setErrorMessage(data.error || 'Failed to add payment method');
      }
    } catch (err) {
      setErrorMessage('An error occurred. Please try again.');
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Cardholder Name
        </label>
        <input
          type="text"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="John Doe"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Card Details
        </label>
        <div className="p-3 border border-gray-300 rounded-lg">
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

      {errorMessage && (
        <div className="text-red-600 text-sm">
          {errorMessage}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          disabled={isProcessing}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <span className="flex items-center">
              <ButtonSpinner />
              Processing...
            </span>
          ) : (
            'Add Payment Method'
          )}
        </button>
      </div>
    </form>
  );
};

// Option 3: Using split Card Elements (Maximum control)
export const SplitCardElementForm = ({ customerId, onSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [cardholderName, setCardholderName] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    const cardNumberElement = elements.getElement(CardNumberElement);

    // Create a payment method
    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardNumberElement,
      billing_details: {
        name: cardholderName,
      },
    });

    if (error) {
      setErrorMessage(error.message);
      setIsProcessing(false);
      return;
    }

    // Send payment method to your server
    try {
      const response = await fetch('/api/payments/attach-payment-method', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          customer_id: customerId,
          payment_method_id: paymentMethod.id,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        onSuccess(paymentMethod);
      } else {
        setErrorMessage(data.error || 'Failed to add payment method');
      }
    } catch (err) {
      setErrorMessage('An error occurred. Please try again.');
    }

    setIsProcessing(false);
  };

  const elementOptions = {
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
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Cardholder Name
        </label>
        <input
          type="text"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="John Doe"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Card Number
        </label>
        <div className="p-3 border border-gray-300 rounded-lg">
          <CardNumberElement options={elementOptions} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Expiration Date
          </label>
          <div className="p-3 border border-gray-300 rounded-lg">
            <CardExpiryElement options={elementOptions} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            CVC
          </label>
          <div className="p-3 border border-gray-300 rounded-lg">
            <CardCvcElement options={elementOptions} />
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="text-red-600 text-sm">
          {errorMessage}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          disabled={isProcessing}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <span className="flex items-center">
              <ButtonSpinner />
              Processing...
            </span>
          ) : (
            'Add Payment Method'
          )}
        </button>
      </div>
    </form>
  );
};

// Bank Account Form using ACH
export const BankAccountForm = ({ customerId, onSuccess, onCancel }) => {
  const stripe = useStripe();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [bankDetails, setBankDetails] = useState({
    accountHolderName: '',
    accountNumber: '',
    routingNumber: '',
    accountType: 'checking',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // Create a token for the bank account
      const { error, token } = await stripe.createToken('bank_account', {
        country: 'US',
        currency: 'usd',
        account_holder_name: bankDetails.accountHolderName,
        account_holder_type: 'individual',
        routing_number: bankDetails.routingNumber,
        account_number: bankDetails.accountNumber,
      });

      if (error) {
        setErrorMessage(error.message);
        setIsProcessing(false);
        return;
      }

      // Send token to your server
      const response = await fetch('/api/payments/attach-bank-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          customer_id: customerId,
          bank_token: token.id,
          account_type: bankDetails.accountType,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        onSuccess(data);
      } else {
        setErrorMessage(data.error || 'Failed to add bank account');
      }
    } catch (err) {
      setErrorMessage('An error occurred. Please try again.');
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Account Holder Name
        </label>
        <input
          type="text"
          value={bankDetails.accountHolderName}
          onChange={(e) => setBankDetails({ ...bankDetails, accountHolderName: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="John Doe"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Account Type
        </label>
        <select
          value={bankDetails.accountType}
          onChange={(e) => setBankDetails({ ...bankDetails, accountType: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="checking">Checking</option>
          <option value="savings">Savings</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Routing Number
        </label>
        <input
          type="text"
          value={bankDetails.routingNumber}
          onChange={(e) => setBankDetails({ ...bankDetails, routingNumber: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="110000000"
          maxLength="9"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Account Number
        </label>
        <input
          type="text"
          value={bankDetails.accountNumber}
          onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="000123456789"
          required
        />
      </div>

      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          ⚠️ Bank account verification: After adding your account, we'll make two small deposits 
          (less than $1 each) within 1-2 business days. You'll need to verify these amounts to 
          complete the setup.
        </p>
      </div>

      {errorMessage && (
        <div className="text-red-600 text-sm">
          {errorMessage}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          disabled={isProcessing}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <span className="flex items-center">
              <ButtonSpinner />
              Processing...
            </span>
          ) : (
            'Add Bank Account'
          )}
        </button>
      </div>
    </form>
  );
};