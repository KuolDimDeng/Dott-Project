'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import TransitionPage from '../TransitionPage';
import { ONBOARDING_STEPS } from '@/constants/onboarding';

export default function SubscriptionToPaymentTransition() {
  const searchParams = useSearchParams();
  const [subscriptionData, setSubscriptionData] = useState(null);
  
  // Extract plan info from URL or session storage
  useEffect(() => {
    try {
      // First check URL parameters
      const planParam = searchParams.get('plan');
      const cycleParam = searchParams.get('cycle');
      
      if (planParam) {
        setSubscriptionData({
          plan: planParam,
          billing_interval: cycleParam || 'monthly'
        });
        return;
      }
      
      // Fall back to session storage
      const storedData = sessionStorage.getItem('pendingSubscription') || 
                         sessionStorage.getItem('selectedPlan');
      
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        setSubscriptionData(parsedData);
      }
    } catch (e) {
      console.error('Error retrieving subscription data:', e);
    }
  }, [searchParams]);
  
  // Handler to ensure payment page gets necessary data
  const handleBeforeNavigate = () => {
    if (!subscriptionData) return;
    
    try {
      // Store subscription data in session storage for payment page
      sessionStorage.setItem('pendingSubscription', JSON.stringify({
        ...subscriptionData,
        timestamp: Date.now()
      }));
      
      // Set cookies for server-side recognition
      document.cookie = `onboardingStep=${ONBOARDING_STEPS.PAYMENT}; path=/; max-age=${60*60*24}; samesite=lax`;
      document.cookie = `subscriptionCompleted=true; path=/; max-age=${60*60*24}; samesite=lax`;
      document.cookie = `selectedPlan=${subscriptionData.plan}; path=/; max-age=${60*60*24}; samesite=lax`;
      document.cookie = `billingCycle=${subscriptionData.billing_interval || subscriptionData.billingCycle || 'monthly'}; path=/; max-age=${60*60*24}; samesite=lax`;
    } catch (e) {
      console.error('Error setting payment transition data:', e);
    }
  };
  
  // Get plan name for display
  const getPlanName = () => {
    if (!subscriptionData) return '';
    
    const plan = subscriptionData.plan?.toLowerCase() || '';
    if (plan === 'professional') return 'Professional';
    if (plan === 'enterprise') return 'Enterprise';
    return plan.charAt(0).toUpperCase() + plan.slice(1);
  };
  
  const message = `Preparing payment for ${getPlanName()} plan...`;
  
  return (
    <TransitionPage
      from={ONBOARDING_STEPS.SUBSCRIPTION}
      to={ONBOARDING_STEPS.PAYMENT}
      message={message}
      delayMs={2000}
      data={subscriptionData}
      onBeforeNavigate={handleBeforeNavigate}
    />
  );
} 