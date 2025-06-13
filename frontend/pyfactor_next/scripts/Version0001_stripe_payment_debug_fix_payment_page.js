#!/usr/bin/env node

/**
 * Script: Version0001_stripe_payment_debug_fix_payment_page.js
 * Purpose: Debug and fix Stripe payment initialization issues
 * Author: Claude
 * Date: 2025-01-13
 * 
 * This script:
 * 1. Adds comprehensive debug logging to the payment page
 * 2. Ensures Stripe environment variables are properly loaded
 * 3. Adds fallback handling for missing Stripe configuration
 * 4. Improves error messaging for users
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Updated payment page with enhanced debugging and error handling
const updatedPaymentPage = `'use client';

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

// Initialize Stripe with comprehensive error handling and debugging
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

// Enhanced debug logging
if (typeof window !== 'undefined') {
  console.log('[Stripe Debug] Client-side environment check:', {
    key: stripePublishableKey ? \`\${stripePublishableKey.substring(0, 10)}...\` : 'NOT FOUND',
    keyLength: stripePublishableKey?.length || 0,
    env: process.env.NODE_ENV,
    hasKey: !!stripePublishableKey,
    keyType: typeof stripePublishableKey,
    allEnvKeys: Object.keys(process.env).filter(key => key.includes('STRIPE')),
    timestamp: new Date().toISOString()
  });
}

logger.info('Stripe Initialization', {
  publishableKey: stripePublishableKey ? 'Configured' : 'Not configured',
  environment: process.env.NODE_ENV,
  timestamp: new Date().toISOString()
});

// Initialize Stripe with null check
let stripePromise = null;
if (stripePublishableKey && stripePublishableKey !== 'undefined' && stripePublishableKey !== 'null') {
  try {
    stripePromise = loadStripe(stripePublishableKey);
    logger.info('Stripe Promise created successfully');
  } catch (error) {
    logger.error('Failed to create Stripe Promise:', error);
    console.error('[Stripe Error] Failed to initialize:', error);
  }
} else {
  logger.error('Stripe publishable key is missing or invalid', {
    key: stripePublishableKey,
    type: typeof stripePublishableKey
  });
}

function PaymentForm({ plan, billingCycle }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const { user } = useAuth();
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const [debugInfo, setDebugInfo] = useState({});

  useEffect(() => {
    const debug = {
      stripeLoaded: !!stripe,
      elementsLoaded: !!elements,
      plan,
      billingCycle,
      userEmail: user?.email,
      price: getPrice(),
      stripeVersion: stripe?._apiVersion || 'N/A',
      timestamp: new Date().toISOString()
    };
    
    console.log('[PaymentForm] Component state:', debug);
    setDebugInfo(debug);
    
    logger.info('PaymentForm mounted', {
      stripe: stripe ? 'Loaded' : 'Not loaded',
      elements: elements ? 'Loaded' : 'Not loaded',
      plan,
      billingCycle,
      user: user ? 'Authenticated' : 'Not authenticated'
    });
  }, [stripe, elements, plan, billingCycle, user]);

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
      setError('Payment system is not ready. Please refresh the page and try again.');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Log the request details
      logger.info('Creating subscription', {
        plan: plan.toLowerCase(),
        billingCycle,
        email: user?.email,
        userId: user?.sub
      });

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

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create subscription');
      }

      const { clientSecret, subscriptionId } = data;

      if (!clientSecret) {
        throw new Error('No payment intent received from server');
      }

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
        logger.error('Payment confirmation error:', result.error);
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

  // Show loading state while Stripe loads
  if (!stripe || !elements) {
    return (
      <div className="max-w-md mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Loading Payment Form...</h2>
          <p className="text-gray-600">Please wait while we set up your payment details.</p>
        </div>
        <div className="animate-pulse">
          <div className="h-12 bg-gray-200 rounded mb-4"></div>
          <div className="h-10 bg-gray-200 rounded w-32"></div>
        </div>
        {/* Debug info for development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-2 bg-gray-100 rounded text-xs">
            <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Complete Your Subscription</h2>
        <p className="text-gray-600">
          {plan} Plan - \${getPrice()}/{billingCycle === 'monthly' ? 'month' : 'year'}
        </p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Card Information
        </label>
        <div className="border border-gray-300 rounded-md p-3 min-h-[50px]">
          <CardElement 
            options={cardStyle}
            onReady={() => {
              logger.info('CardElement ready');
              console.log('[Stripe] Card element is ready');
            }}
            onChange={(e) => {
              if (e.error) {
                logger.error('CardElement error:', e.error);
                setError(e.error.message);
              } else {
                setError(null);
              }
            }}
          />
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
        className={\`w-full py-3 px-4 rounded-md font-medium transition-colors \${
          processing || succeeded
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }\`}
      >
        {processing ? 'Processing...' : succeeded ? 'Payment Complete' : \`Subscribe - $\${getPrice()}\`}
      </button>

      <p className="mt-4 text-xs text-gray-500 text-center">
        Your subscription will automatically renew {billingCycle === 'monthly' ? 'each month' : 'annually'}.
        You can cancel anytime from your dashboard.
      </p>

      {/* Debug info for development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-2 bg-gray-100 rounded text-xs">
          <details>
            <summary className="cursor-pointer">Debug Information</summary>
            <pre className="mt-2">{JSON.stringify(debugInfo, null, 2)}</pre>
          </details>
        </div>
      )}
    </form>
  );
}

export default function PaymentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [plan, setPlan] = useState('');
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState({});

  useEffect(() => {
    // Get plan details from URL params
    const planParam = searchParams.get('plan');
    const billingParam = searchParams.get('billing') || 'monthly';

    // Enhanced debug information
    const debug = {
      plan: planParam,
      billing: billingParam,
      stripeKey: stripePublishableKey ? \`\${stripePublishableKey.substring(0, 20)}...\` : 'Not configured',
      stripeKeyFull: process.env.NODE_ENV === 'development' ? stripePublishableKey : '[HIDDEN]',
      stripePromiseStatus: stripePromise ? 'Initialized' : 'Failed to initialize',
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        hasStripeKey: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
        allPublicKeys: Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC_'))
      },
      timestamp: new Date().toISOString()
    };

    console.log('[PaymentPage] Debug info:', debug);
    setDebugInfo(debug);

    logger.info('PaymentPage initialized', {
      planParam,
      billingParam,
      stripePublishableKey: stripePublishableKey ? 'Present' : 'Missing',
      stripePromise: stripePromise ? 'Created' : 'Null'
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

  if (!plan) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Check if Stripe is configured
  if (!stripePromise) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-md mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-yellow-800 mb-2">
              Payment System Configuration Issue
            </h2>
            <p className="text-yellow-700 mb-4">
              The payment system is not properly configured. This is likely due to missing Stripe environment variables.
            </p>
            {process.env.NODE_ENV === 'development' && (
              <div className="mb-4 p-3 bg-yellow-100 rounded">
                <p className="text-sm font-medium text-yellow-800 mb-2">Debug Information:</p>
                <ul className="text-xs text-yellow-700 space-y-1">
                  <li>Stripe Key: {stripePublishableKey || 'NOT SET'}</li>
                  <li>Environment: {process.env.NODE_ENV}</li>
                  <li>Key Type: {typeof stripePublishableKey}</li>
                </ul>
              </div>
            )}
            <p className="text-sm text-yellow-600 mb-4">
              For now, you can continue with the Free plan and upgrade later from your dashboard.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-yellow-600 text-white py-2 px-4 rounded-md hover:bg-yellow-700 transition-colors"
            >
              Continue with Free Plan
            </button>
          </div>
        </div>
        
        {/* Detailed debug information for development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="max-w-4xl mx-auto mt-8">
            <details className="bg-gray-100 rounded-lg p-4">
              <summary className="cursor-pointer font-medium">Full Debug Information</summary>
              <pre className="mt-4 text-xs overflow-auto">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Debug Information - Only in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-8 p-4 bg-gray-100 rounded-lg">
            <details>
              <summary className="cursor-pointer font-bold">Debug Information</summary>
              <pre className="mt-2 text-xs overflow-auto">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </details>
          </div>
        )}
        
        <Elements stripe={stripePromise}>
          <PaymentForm plan={plan} billingCycle={billingCycle} />
        </Elements>
      </div>
    </div>
  );
}`;

async function updatePaymentPage() {
  try {
    console.log('🔧 Updating payment page with enhanced debugging...');
    
    const paymentPagePath = path.join(
      path.dirname(__dirname),
      'src/app/onboarding/payment/page.js'
    );
    
    // Create backup
    const backupPath = paymentPagePath + '.backup_' + Date.now();
    const originalContent = await fs.readFile(paymentPagePath, 'utf8');
    await fs.writeFile(backupPath, originalContent);
    console.log('✅ Created backup at:', backupPath);
    
    // Write updated content
    await fs.writeFile(paymentPagePath, updatedPaymentPage);
    console.log('✅ Updated payment page with enhanced debugging');
    
    // Update script registry
    const registryPath = path.join(__dirname, 'script_registry.md');
    const registryEntry = `
## Version0001_stripe_payment_debug_fix_payment_page.js
- **Date**: ${new Date().toISOString()}
- **Purpose**: Debug and fix Stripe payment initialization issues
- **Changes**:
  - Added comprehensive debug logging for Stripe initialization
  - Enhanced error handling for missing Stripe keys
  - Added fallback UI when Stripe is not configured
  - Improved client-side environment variable debugging
  - Added detailed debug information display in development mode
- **Files Modified**:
  - /src/app/onboarding/payment/page.js
`;
    
    try {
      const existingRegistry = await fs.readFile(registryPath, 'utf8');
      await fs.writeFile(registryPath, existingRegistry + registryEntry);
    } catch (error) {
      // Create new registry if it doesn't exist
      await fs.writeFile(registryPath, '# Script Registry\n' + registryEntry);
    }
    
    console.log('✅ Updated script registry');
    console.log('\n📝 Summary:');
    console.log('- Enhanced payment page with comprehensive debugging');
    console.log('- Added fallback handling for missing Stripe configuration');
    console.log('- Improved error messaging and user experience');
    console.log('\n⚠️  Important: Make sure to set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in your environment variables!');
    
  } catch (error) {
    console.error('❌ Error updating payment page:', error);
    process.exit(1);
  }
}

// Run the update
updatePaymentPage();