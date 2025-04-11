'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import TransitionPage from '../TransitionPage';
import { ONBOARDING_STEPS } from '@/constants/onboarding';

export default function PaymentToDashboardTransition() {
  const searchParams = useSearchParams();
  const [paymentData, setPaymentData] = useState(null);
  
  // Extract payment info from URL or session storage
  useEffect(() => {
    try {
      // Check URL parameters
      const paymentSuccessParam = searchParams.get('success');
      const planParam = searchParams.get('plan');
      const paymentIdParam = searchParams.get('payment_id');
      
      if (paymentSuccessParam === 'true' || paymentIdParam) {
        setPaymentData({
          paymentSuccess: true,
          plan: planParam,
          paymentId: paymentIdParam || 'unknown',
          timestamp: Date.now()
        });
        return;
      }
      
      // Fall back to session storage
      const storedData = sessionStorage.getItem('paymentCompleted') || 
                         sessionStorage.getItem('subscriptionActivated');
      
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        setPaymentData(parsedData);
      } else {
        // Default to success state for this page
        setPaymentData({
          paymentSuccess: true,
          plan: 'paid',
          timestamp: Date.now()
        });
      }
    } catch (e) {
      console.error('Error retrieving payment data:', e);
      // Default data on error
      setPaymentData({
        paymentSuccess: true,
        timestamp: Date.now()
      });
    }
  }, [searchParams]);
  
  // Handler for dashboard redirect setup
  const handleBeforeNavigate = () => {
    try {
      // Set cookies for session state tracking
      document.cookie = `onboardingStep=dashboard; path=/; max-age=${60*60*24*30}; samesite=lax`;
      document.cookie = `paymentCompleted=true; path=/; max-age=${60*60*24*30}; samesite=lax`;
      document.cookie = `onboardingCompleted=true; path=/; max-age=${60*60*24*30}; samesite=lax`;
      document.cookie = `paidPlanActive=true; path=/; max-age=${60*60*24*30}; samesite=lax`;
      
      // Store onboarding status in localStorage
      localStorage.setItem('onboardingStatus', 'complete');
      localStorage.setItem('paymentCompleted', 'true');
      
      // Store payment data in sessionStorage for dashboard
      sessionStorage.setItem('paidPlanActivated', JSON.stringify({
        ...paymentData,
        activationSource: 'payment_complete'
      }));
    } catch (e) {
      console.error('Error setting dashboard transition data:', e);
    }
  };
  
  // Get plan name for display
  const getPlanName = () => {
    if (!paymentData || !paymentData.plan) return 'subscription';
    
    const plan = paymentData.plan.toLowerCase();
    if (plan === 'professional') return 'Professional';
    if (plan === 'enterprise') return 'Enterprise';
    return plan.charAt(0).toUpperCase() + plan.slice(1);
  };
  
  const message = `Finalizing your ${getPlanName()} plan...`;
  
  return (
    <TransitionPage
      from={ONBOARDING_STEPS.PAYMENT}
      to="dashboard"
      message={message}
      delayMs={3000} // Longer delay to build anticipation for the dashboard
      data={paymentData}
      onBeforeNavigate={handleBeforeNavigate}
    />
  );
} 