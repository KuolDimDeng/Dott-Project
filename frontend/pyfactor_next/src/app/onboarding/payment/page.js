'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
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
  const [cardholderName, setCardholderName] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [tenantId, setTenantId] = useState(null);

  // Fetch profile data to get tenant ID on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        logger.info('[PaymentForm] Fetching profile to get tenant ID...');
        const response = await fetch('/api/auth/profile');
        
        if (response.ok) {
          const profileData = await response.json();
          logger.info('[PaymentForm] Profile data received:', {
            tenantId: profileData.tenantId,
            email: profileData.email,
            onboardingCompleted: profileData.onboardingCompleted
          });
          
          if (profileData.tenantId) {
            setTenantId(profileData.tenantId);
            logger.info('[PaymentForm] Set tenant ID:', profileData.tenantId);
          } else {
            logger.warn('[PaymentForm] No tenant ID in profile data');
          }
        } else {
          logger.error('[PaymentForm] Profile fetch failed with status:', response.status);
        }
      } catch (error) {
        logger.error('[PaymentForm] Error fetching profile:', error);
      }
    };
    fetchProfile();
  }, []);

  // Card element styling - modern design
  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        letterSpacing: '0.025em',
        fontFamily: 'Source Code Pro, monospace',
        '::placeholder': {
          color: '#aab7c4',
        },
        padding: '10px',
      },
      invalid: {
        color: '#9e2146',
      },
    },
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
      // Validate required fields
      if (!cardholderName.trim()) {
        throw new Error('Please enter the cardholder name');
      }
      if (!postalCode.trim()) {
        throw new Error('Please enter your postal code');
      }

      // Get card elements
      const cardNumber = elements.getElement(CardNumberElement);
      const cardExpiry = elements.getElement(CardExpiryElement);
      const cardCvc = elements.getElement(CardCvcElement);
      
      if (!cardNumber || !cardExpiry || !cardCvc) {
        throw new Error('Card elements not found');
      }

      // Create payment method
      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardNumber,
        billing_details: {
          email: user?.email,
          name: cardholderName,
          address: {
            postal_code: postalCode,
          },
        },
      });

      if (pmError) {
        throw pmError;
      }

      logger.info('Payment method created:', paymentMethod.id);

      // Get CSRF token from session
      let csrfToken = null;
      try {
        const sessionResponse = await fetch('/api/auth/session', {
          credentials: 'include'
        });
        
        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          csrfToken = sessionData.csrfToken;
          logger.info('Got CSRF token from session');
        }
      } catch (error) {
        logger.error('Failed to get CSRF token:', error);
      }

      // Create subscription through secure backend proxy
      logger.info('Calling create-subscription API with:', {
        plan: plan.toLowerCase(),
        billingCycle: billingCycle,
        hasCSRFToken: !!csrfToken,
      });

      const response = await fetch('/api/payments/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || '',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({
          payment_method_id: paymentMethod.id,
          plan: plan.toLowerCase(),
          billing_cycle: billingCycle,
        }),
      });

      // Log response details
      logger.info('API Response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      let result;
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
        logger.info('Response JSON:', result);
      } else {
        const text = await response.text();
        logger.error('Non-JSON response from subscription endpoint:', {
          status: response.status,
          contentType: contentType,
          text: text,
        });
        throw new Error(`Invalid response from payment server (${response.status}): ${text}`);
      }

      if (!response.ok) {
        logger.error('Subscription creation failed:', {
          status: response.status,
          error: result.error || result.detail || 'Unknown error',
          fullResponse: result,
        });
        throw new Error(result.error || result.detail || 'Subscription creation failed');
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
      logger.info('[PaymentForm] Tenant ID for redirect:', tenantId);
      
      // Synchronize session to mark onboarding as complete
      try {
        logger.info('[PaymentForm] Synchronizing session with onboarding completion');
        const syncResponse = await fetch('/api/auth/sync-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            tenantId: tenantId,
            needsOnboarding: false,
            onboardingCompleted: true,
            subscriptionPlan: plan.toLowerCase()
          }),
        });
        
        if (!syncResponse.ok) {
          logger.error('[PaymentForm] Failed to sync session:', syncResponse.status);
        } else {
          const syncResult = await syncResponse.json();
          logger.info('[PaymentForm] Session synchronized successfully:', syncResult);
        }
      } catch (syncError) {
        logger.error('[PaymentForm] Error synchronizing session:', syncError);
      }
      
      setSuccess(true);
      
      // Redirect to tenant dashboard after short delay
      setTimeout(() => {
        if (tenantId) {
          const redirectUrl = `/tenant/${tenantId}/dashboard?welcome=true`;
          logger.info('[PaymentForm] Redirecting to tenant dashboard:', redirectUrl);
          // Use window.location.href for a full page reload to ensure session is properly refreshed
          window.location.href = redirectUrl;
        } else {
          // Fallback to regular dashboard if no tenant ID
          logger.warn('[PaymentForm] No tenant ID available, redirecting to regular dashboard');
          window.location.href = '/dashboard?welcome=true';
        }
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
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
      {/* Header Section */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Subscription</h2>
        <div className="flex items-center justify-center gap-2 text-lg">
          <span className="text-gray-600">{plan} Plan</span>
          <span className="text-gray-400">•</span>
          <span className="font-semibold text-gray-900">
            ${getPrice()}/{billingCycle === 'monthly' ? 'month' : 'year'}
          </span>
        </div>
      </div>

      {/* Payment Form Card */}
      <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
        {/* Cardholder Name */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Cardholder Name
          </label>
          <input
            type="text"
            value={cardholderName}
            onChange={(e) => setCardholderName(e.target.value)}
            placeholder="John Doe"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            required
          />
        </div>

        {/* Card Number */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Card Number
          </label>
          <div className="relative">
            <CardNumberElement
              options={cardElementOptions}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all"
              onReady={() => {
                logger.info('CardNumberElement ready');
              }}
              onChange={(e) => {
                if (e.error) {
                  setError(e.error.message);
                } else if (error && error.includes('card number')) {
                  setError(null);
                }
              }}
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Expiry and CVC Row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Expiration Date
            </label>
            <CardExpiryElement
              options={cardElementOptions}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all"
              onChange={(e) => {
                if (e.error) {
                  setError(e.error.message);
                } else if (error && error.includes('expir')) {
                  setError(null);
                }
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              CVC
            </label>
            <CardCvcElement
              options={cardElementOptions}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all"
              onChange={(e) => {
                if (e.error) {
                  setError(e.error.message);
                } else if (error && error.includes('security code')) {
                  setError(null);
                }
              }}
            />
          </div>
        </div>

        {/* Postal Code */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Postal Code
          </label>
          <input
            type="text"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            placeholder="12345"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            required
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className={`w-full py-4 px-6 rounded-lg font-semibold text-white transition-all transform ${
            !stripe || isProcessing
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 active:scale-[0.98] shadow-lg hover:shadow-xl'
          }`}
        >
          {isProcessing ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing Payment...
            </span>
          ) : (
            `Subscribe for $${getPrice()}/${billingCycle === 'monthly' ? 'mo' : 'yr'}`
          )}
        </button>

        {/* Security Badge */}
        <div className="flex items-center justify-center text-sm text-gray-500">
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Secured by Stripe
        </div>
      </div>

      {/* Footer Text */}
      <p className="mt-6 text-sm text-center text-gray-500">
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