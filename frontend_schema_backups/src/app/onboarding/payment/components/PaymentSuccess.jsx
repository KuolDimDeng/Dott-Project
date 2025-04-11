'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/utils/logger';

export default function PaymentSuccess({ paymentData, plan }) {
  const router = useRouter();
  
  // Automatically redirect to the transition page
  useEffect(() => {
    // Store payment data for later use
    try {
      // Store in session storage so dashboard can access it
      sessionStorage.setItem('paymentCompleted', JSON.stringify({
        paymentSuccess: true,
        timestamp: Date.now(),
        plan: plan || 'professional',
        paymentId: paymentData?.paymentId || 'unknown',
        ...paymentData
      }));
      
      // Set cookies to track completion state
      document.cookie = `paymentCompleted=true; path=/; max-age=${60*60*24*30}; samesite=lax`;
      document.cookie = `subscriptionActive=true; path=/; max-age=${60*60*24*30}; samesite=lax`;
      
      logger.info('[PaymentSuccess] Payment processed successfully, redirecting to dashboard');
      
      // Redirect to transition page after a short delay
      const redirectTimer = setTimeout(() => {
        router.push('/onboarding/payment-to-dashboard');
      }, 600);
      
      return () => clearTimeout(redirectTimer);
    } catch (e) {
      logger.error('[PaymentSuccess] Error during redirect:', e);
      // Fall back to direct navigation
      router.push('/dashboard');
    }
  }, [router, paymentData, plan]);
  
  // This component doesn't actually render anything visible
  // as it immediately redirects to the transition page
  return null;
} 