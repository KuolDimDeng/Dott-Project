'use client';


import { useState } from 'react';
import { CreditCardIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { useUser } from '@/hooks/useUser';
import { fetchWithCache } from '@/utils/cacheClient';
import { logger } from '@/utils/logger';
import { StripeProvider } from '@/components/providers/StripeProvider';
import { StripePaymentForm } from './StripePaymentForm';

export const PaymentForm = ({ 
  subscriptionData, 
  onSuccess, 
  onError,
  paymentMethod = 'card'
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useUser();
  
  // PayPal option
  if (paymentMethod === 'paypal') {
    return (
      <div className="flex flex-col items-center">
        <div className="w-full max-w-md bg-blue-50 rounded-lg p-6 border border-blue-200 mb-6">
          <div className="flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-blue-600 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7.763 3c-.507 0-.967.258-1.221.683l-3.2 6.597C3.123 10.846 3.64 11.5 4.305 11.5h4.34c.608 0 1.143-.394 1.324-.97l1.474-4.698C11.637 5.116 11.075 4.5 10.327 4.5H7.763z"/>
              <path d="M3 14.5c0-.828.707-1.5 1.5-1.5h5c.828 0 1.5.672 1.5 1.5v4c0 .828-.672 1.5-1.5 1.5h-5c-.793 0-1.5-.672-1.5-1.5v-4z"/>
              <path d="M14.177 3c-.507 0-.967.258-1.221.683l-3.2 6.597c-.219.566.298 1.22.963 1.22h4.34c.608 0 1.143-.394 1.324-.97l1.474-4.698C17.051 5.116 16.489 4.5 15.741 4.5h-1.564z"/>
              <path d="M12 14.5c0-.828.707-1.5 1.5-1.5h5c.828 0 1.5.672 1.5 1.5v4c0 .828-.672 1.5-1.5 1.5h-5c-.793 0-1.5-.672-1.5-1.5v-4z"/>
            </svg>
            <span className="text-blue-600 font-semibold">PayPal</span>
          </div>
          <p className="text-center text-sm text-blue-700 mb-6">
            You'll be redirected to PayPal to complete your payment
          </p>
        </div>
        
        <button
          className="w-full max-w-md py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:outline-none"
          onClick={() => alert('PayPal integration coming soon')}
          disabled={isLoading}
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
            'Continue to PayPal'
          )}
        </button>
      </div>
    );
  }
  
  // For Stripe card payments
  // Set up Stripe appearance options
  const appearance = {
    theme: 'stripe',
    variables: {
      colorPrimary: '#4f46e5',
      colorBackground: '#ffffff',
      colorText: '#1f2937',
      colorDanger: '#ef4444',
      fontFamily: 'Inter, system-ui, sans-serif',
      borderRadius: '8px',
    }
  };
  
  const handleStripeSuccess = async (paymentResult) => {
    // Store payment details in cache
    await fetchWithCache('payment_details', {
      id: paymentResult.paymentId,
      method: 'card',
      lastFour: paymentResult.lastFour,
      timestamp: new Date().toISOString()
    }, { bypassCache: true });
    
    // Call the success callback
    onSuccess(paymentResult);
  };
  
  return (
    <StripeProvider options={{ appearance }}>
      <StripePaymentForm
        subscriptionData={subscriptionData}
        onSuccess={handleStripeSuccess}
        onError={onError}
      />
    </StripeProvider>
  );
}; 