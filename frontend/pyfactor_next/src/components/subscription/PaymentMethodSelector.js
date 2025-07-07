import React, { useState, useEffect } from 'react';
import { CreditCardIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

export default function PaymentMethodSelector({ selectedMethod, onMethodChange, country }) {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPaymentMethods();
  }, [country]);

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch('/api/users/api/payment-methods/', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPaymentMethods(data.payment_methods || []);
      } else {
        // Fallback to card only
        setPaymentMethods([{
          id: 'card',
          name: 'Credit/Debit Card',
          provider: 'stripe',
          icon: 'credit-card',
          description: 'Pay with Visa, Mastercard, or other cards'
        }]);
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      // Fallback to card only
      setPaymentMethods([{
        id: 'card',
        name: 'Credit/Debit Card',
        provider: 'stripe',
        icon: 'credit-card',
        description: 'Pay with Visa, Mastercard, or other cards'
      }]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-20 bg-gray-200 rounded-lg mb-4"></div>
        <div className="h-20 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Select Payment Method</h3>
      
      <div className="space-y-3">
        {paymentMethods.map((method) => (
          <div
            key={method.id}
            onClick={() => onMethodChange(method)}
            className={`relative rounded-lg border ${
              selectedMethod?.id === method.id
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-300 bg-white hover:border-gray-400'
            } p-4 cursor-pointer transition-all`}
          >
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {method.id === 'card' ? (
                  <CreditCardIcon className={`h-6 w-6 ${
                    selectedMethod?.id === method.id ? 'text-blue-600' : 'text-gray-400'
                  }`} />
                ) : (
                  <DevicePhoneMobileIcon className={`h-6 w-6 ${
                    selectedMethod?.id === method.id ? 'text-blue-600' : 'text-gray-400'
                  }`} />
                )}
              </div>
              
              <div className="ml-3 flex-1">
                <label className="block text-sm font-medium text-gray-900">
                  {method.name}
                  {method.is_beta && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                      Beta
                    </span>
                  )}
                </label>
                <p className="mt-1 text-sm text-gray-500">
                  {method.description}
                </p>
                {method.providers && method.providers.length > 0 && (
                  <p className="mt-1 text-xs text-gray-400">
                    Available: {method.providers.join(', ')}
                  </p>
                )}
              </div>
              
              {selectedMethod?.id === method.id && (
                <CheckCircleIcon className="h-5 w-5 text-blue-600 flex-shrink-0" />
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedMethod?.id === 'mobile_money' && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Mobile Money Payment</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• You'll receive a payment prompt on your phone</li>
            <li>• Enter your PIN to complete the payment</li>
            <li>• Payment will be processed in {selectedMethod.currency || 'local currency'}</li>
          </ul>
        </div>
      )}
    </div>
  );
}