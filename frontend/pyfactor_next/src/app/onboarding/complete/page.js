'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { logger } from '@/utils/logger';
import { useSession } from '@/hooks/useSession-v2';
import { CenteredSpinner } from '@/components/ui/StandardSpinner';

export default function OnboardingCompletePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useSession();
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Completing your subscription...');

  useEffect(() => {
    const completePayment = async () => {
      try {
        // Get Paystack parameters
        const reference = searchParams.get('reference');
        const trxref = searchParams.get('trxref');
        const paymentRef = reference || trxref;
        
        logger.info('[OnboardingComplete] Processing payment return:', {
          reference: paymentRef,
          allParams: Object.fromEntries(searchParams.entries())
        });

        if (!paymentRef) {
          // If no reference, might be coming from a different payment method
          logger.warn('[OnboardingComplete] No payment reference found');
          setStatus('redirecting');
          setMessage('Redirecting to dashboard...');
          
          // Get subscription details from cookies
          const getCookie = (name) => {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop().split(';').shift();
            return null;
          };
          
          const cookieSubscriptionPlan = getCookie('subscriptionPlan');
          const cookieBillingCycle = getCookie('subscriptionInterval');
          
          // Still complete onboarding
          await fetch('/api/onboarding/complete-all', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              subscriptionPlan: cookieSubscriptionPlan || 'free',
              billingCycle: cookieBillingCycle || 'monthly',
              source: 'payment-complete',
              timestamp: new Date().toISOString()
            }),
          });
          
          setTimeout(() => {
            const tenantId = session?.user?.tenantId;
            if (tenantId) {
              router.push(`/${tenantId}/dashboard`);
            } else {
              router.push('/dashboard');
            }
          }, 2000);
          return;
        }

        // Verify Paystack payment
        setMessage('Verifying your payment...');
        
        const verifyResponse = await fetch('/api/payments/verify-paystack', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            reference: paymentRef,
          }),
        });

        const result = await verifyResponse.json();
        
        if (!verifyResponse.ok || !result.success) {
          throw new Error(result.error || 'Payment verification failed');
        }

        logger.info('[OnboardingComplete] Payment verified:', result);
        
        // Complete onboarding
        setMessage('Finalizing your account setup...');
        
        // Get subscription details from cookies (where they were saved during payment selection)
        const getCookie = (name) => {
          const value = `; ${document.cookie}`;
          const parts = value.split(`; ${name}=`);
          if (parts.length === 2) return parts.pop().split(';').shift();
          return null;
        };
        
        const cookieSubscriptionPlan = getCookie('subscriptionPlan');
        const cookieBillingCycle = getCookie('subscriptionInterval');
        
        logger.info('[OnboardingComplete] Cookie values:', {
          subscriptionPlan: cookieSubscriptionPlan,
          billingCycle: cookieBillingCycle
        });
        
        const completeResponse = await fetch('/api/onboarding/complete-all', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            paymentVerified: true,
            paymentReference: paymentRef,
            subscriptionPlan: cookieSubscriptionPlan || result.plan || session?.user?.subscription_plan || 'free',
            billingCycle: cookieBillingCycle || result.billing_cycle || 'monthly',
            source: 'paystack-payment',
            timestamp: new Date().toISOString()
          }),
        });

        if (!completeResponse.ok) {
          const errorData = await completeResponse.json();
          throw new Error(errorData.error || 'Failed to complete onboarding');
        }

        const completeResult = await completeResponse.json();
        logger.info('[OnboardingComplete] Onboarding completed:', completeResult);
        
        // Success!
        setStatus('success');
        setMessage('Payment successful! Redirecting to your dashboard...');
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          const tenantId = completeResult.tenantId || completeResult.tenant_id || session?.user?.tenantId;
          if (tenantId) {
            router.push(`/${tenantId}/dashboard`);
          } else {
            router.push('/dashboard');
          }
        }, 2000);
        
      } catch (error) {
        logger.error('[OnboardingComplete] Error processing payment:', error);
        setStatus('error');
        setMessage(error.message || 'An error occurred processing your payment. Please contact support.');
      }
    };

    completePayment();
  }, [searchParams, router, session]);

  if (status === 'processing') {
    return <CenteredSpinner size="large" text="Processing Payment" showText={true} minHeight="h-screen" />;
  }

  if (status === 'redirecting') {
    return <CenteredSpinner size="large" text="Almost Done! Redirecting to your dashboard..." showText={true} minHeight="h-screen" />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        
        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Payment Successful!</h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <p className="text-sm text-gray-500">Welcome to Dott!</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Payment Error</h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <button
              onClick={() => router.push('/onboarding/payment')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  );
}