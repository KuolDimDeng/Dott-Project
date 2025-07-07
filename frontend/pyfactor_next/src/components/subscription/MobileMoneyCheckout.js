import React, { useState } from 'react';
import { DevicePhoneMobileIcon } from '@heroicons/react/24/outline';
import { ExclamationCircleIcon } from '@heroicons/react/20/solid';

export default function MobileMoneyCheckout({ 
  planType, 
  billingCycle, 
  onSuccess, 
  onError,
  paymentMethod 
}) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [reference, setReference] = useState(null);

  const validatePhoneNumber = (phone) => {
    // Basic validation - can be enhanced based on country
    const phoneRegex = /^(?:\+254|0)?[71]\d{8}$/; // Kenya format
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const formatPhoneNumber = (phone) => {
    // Remove spaces and add country code if needed
    let formatted = phone.replace(/\s/g, '');
    if (formatted.startsWith('0')) {
      formatted = '+254' + formatted.substring(1);
    } else if (!formatted.startsWith('+')) {
      formatted = '+254' + formatted;
    }
    return formatted;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validatePhoneNumber(phoneNumber)) {
      setError('Please enter a valid phone number (e.g., 0712345678)');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/users/api/checkout/mobile-money/', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan_type: planType,
          billing_cycle: billingCycle,
          phone_number: formatPhoneNumber(phoneNumber),
          provider: 'mpesa'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setReference(data.reference);
        setPaymentStatus('pending');
        
        // Show success message
        setPaymentStatus('initiated');
        
        // Start polling for payment verification
        pollPaymentStatus(data.reference);
      } else {
        setError(data.error || 'Failed to initiate payment');
      }
    } catch (error) {
      console.error('Error initiating mobile money payment:', error);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const pollPaymentStatus = async (paymentReference, attempts = 0) => {
    const maxAttempts = 60; // Poll for up to 5 minutes (60 * 5 seconds)
    
    if (attempts >= maxAttempts) {
      setPaymentStatus('timeout');
      setError('Payment verification timed out. Please check your transaction history.');
      return;
    }

    try {
      const response = await fetch('/api/users/api/checkout/mobile-money/verify/', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reference: paymentReference
        }),
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        setPaymentStatus('success');
        if (onSuccess) {
          onSuccess(data);
        }
      } else if (data.status === 'failed') {
        setPaymentStatus('failed');
        setError(data.message || 'Payment failed');
        if (onError) {
          onError(data.message);
        }
      } else {
        // Continue polling
        setTimeout(() => {
          pollPaymentStatus(paymentReference, attempts + 1);
        }, 5000); // Poll every 5 seconds
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      // Continue polling on error
      setTimeout(() => {
        pollPaymentStatus(paymentReference, attempts + 1);
      }, 5000);
    }
  };

  return (
    <div className="space-y-6">
      {paymentStatus === null && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Mobile Phone Number
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <DevicePhoneMobileIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="tel"
                id="phone"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="0712345678"
                required
              />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Enter your M-Pesa registered phone number
            </p>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
            }`}
          >
            {loading ? 'Processing...' : 'Pay with M-Pesa'}
          </button>
        </form>
      )}

      {paymentStatus === 'initiated' && (
        <div className="text-center py-8">
          <DevicePhoneMobileIcon className="mx-auto h-12 w-12 text-blue-600 animate-pulse" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Check your phone</h3>
          <p className="mt-2 text-sm text-gray-600">
            We've sent a payment request to your phone.
          </p>
          <p className="mt-1 text-sm text-gray-600">
            Enter your M-Pesa PIN to complete the payment.
          </p>
          <div className="mt-4">
            <div className="inline-flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              <span className="text-sm text-gray-500">Waiting for payment confirmation...</span>
            </div>
          </div>
        </div>
      )}

      {paymentStatus === 'success' && (
        <div className="text-center py-8">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
            <CheckCircleIcon className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">Payment successful!</h3>
          <p className="mt-2 text-sm text-gray-600">
            Your subscription has been activated.
          </p>
        </div>
      )}

      {paymentStatus === 'failed' && (
        <div className="text-center py-8">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <ExclamationCircleIcon className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">Payment failed</h3>
          <p className="mt-2 text-sm text-gray-600">
            {error || 'The payment could not be processed. Please try again.'}
          </p>
          <button
            onClick={() => {
              setPaymentStatus(null);
              setError('');
            }}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}