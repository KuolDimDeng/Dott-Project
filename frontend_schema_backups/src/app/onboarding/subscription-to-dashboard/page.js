'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import TransitionPage from '../TransitionPage';
import { ONBOARDING_STEPS } from '@/constants/onboarding';

export default function SubscriptionToDashboardTransition() {
  const searchParams = useSearchParams();
  const [planData, setPlanData] = useState(null);
  
  // Extract plan info from URL or session storage
  useEffect(() => {
    try {
      // Check URL parameters first
      const planParam = searchParams.get('plan');
      
      if (planParam) {
        setPlanData({
          plan: planParam,
          isFreePlan: planParam.toLowerCase() === 'free' || planParam.toLowerCase() === 'basic'
        });
        return;
      }
      
      // Fall back to session storage
      const storedData = sessionStorage.getItem('selectedPlan') || 
                         sessionStorage.getItem('pendingSubscription');
      
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        setPlanData({
          ...parsedData,
          isFreePlan: parsedData.plan?.toLowerCase() === 'free' || parsedData.plan?.toLowerCase() === 'basic'
        });
      }
    } catch (e) {
      console.error('Error retrieving plan data:', e);
    }
  }, [searchParams]);
  
  // Handler for dashboard redirect setup
  const handleBeforeNavigate = () => {
    try {
      // Set cookies for session state tracking
      document.cookie = `onboardingStep=dashboard; path=/; max-age=${60*60*24*30}; samesite=lax`;
      document.cookie = `subscriptionCompleted=true; path=/; max-age=${60*60*24*30}; samesite=lax`;
      document.cookie = `freePlanSelected=true; path=/; max-age=${60*60*24*30}; samesite=lax`;
      document.cookie = `selectedPlan=${planData?.plan || 'free'}; path=/; max-age=${60*60*24*30}; samesite=lax`;
      
      // Store onboarding status in localStorage
      localStorage.setItem('onboardingStatus', 'complete');
      localStorage.setItem('freePlanSelected', 'true');
      
      // Store plan data in sessionStorage for dashboard
      sessionStorage.setItem('freePlanActivated', JSON.stringify({
        plan: planData?.plan || 'free',
        timestamp: Date.now(),
        activationSource: 'onboarding'
      }));
    } catch (e) {
      console.error('Error setting dashboard transition data:', e);
    }
  };
  
  // Get plan name for friendly display
  const getPlanName = () => {
    if (!planData) return 'Free';
    
    const plan = planData.plan?.toLowerCase() || 'free';
    if (plan === 'basic') return 'Basic';
    return 'Free';
  };
  
  const message = `Setting up your ${getPlanName()} account...`;
  
  return (
    <TransitionPage
      from={ONBOARDING_STEPS.SUBSCRIPTION}
      to="dashboard"
      message={message}
      delayMs={2500} 
      data={planData}
      onBeforeNavigate={handleBeforeNavigate}
    />
  );
} 