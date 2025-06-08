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
      
      logger.info('[PaymentSuccess] Payment processed successfully, redirecting to tenant dashboard');
      
      // Redirect to tenant dashboard after completing setup in background
      const redirectToDashboard = async () => {
        try {
          // Complete setup in background
          await fetch('/api/onboarding/setup/complete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              status: 'complete',
              completedAt: new Date().toISOString(),
              background: true,
              source: 'payment-success'
            })
          });
          
          // Get user's tenant ID for correct dashboard redirect
          const profileResponse = await fetch('/api/auth/profile');
          if (profileResponse.ok) {
            const profile = await profileResponse.json();
            if (profile && profile.tenantId) {
              logger.info('[PaymentSuccess] Redirecting to tenant dashboard:', profile.tenantId);
              router.push(`/tenant/${profile.tenantId}/dashboard`);
              return;
            }
          }
          
          // Fallback: try session
          const sessionResponse = await fetch('/api/auth/session');
          if (sessionResponse.ok) {
            const sessionData = await sessionResponse.json();
            if (sessionData && sessionData.user && sessionData.user.tenantId) {
              logger.info('[PaymentSuccess] Redirecting to tenant dashboard from session:', sessionData.user.tenantId);
              router.push(`/tenant/${sessionData.user.tenantId}/dashboard`);
              return;
            }
          }
          
          // Last resort: payment-to-dashboard transition page
          router.push('/onboarding/payment-to-dashboard');
          
        } catch (error) {
          logger.error('[PaymentSuccess] Error during dashboard redirect:', error);
          // Fallback to payment-to-dashboard page
          router.push('/onboarding/payment-to-dashboard');
        }
      };
      
      // Start redirect after a short delay
      const redirectTimer = setTimeout(redirectToDashboard, 600);
      
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