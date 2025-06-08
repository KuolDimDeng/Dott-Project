'use client';


import TransitionPage from '../TransitionPage';
import { ONBOARDING_STEPS } from '@/constants/onboarding';

export default function BusinessInfoToSubscriptionTransition() {
  // Handle server-side redirects if needed by storing session
  const handleBeforeNavigate = () => {
    try {
      // Set cookies to ensure proper navigation state
      document.cookie = `onboardingStep=${ONBOARDING_STEPS.SUBSCRIPTION}; path=/; max-age=${60*60*24}; samesite=lax`;
      document.cookie = `businessInfoCompleted=true; path=/; max-age=${60*60*24}; samesite=lax`;
    } catch (e) {
      console.error('Error setting transition cookies:', e);
    }
  };
  
  return (
    <TransitionPage
      from={ONBOARDING_STEPS.BUSINESS_INFO}
      to={ONBOARDING_STEPS.SUBSCRIPTION}
      message="Processing your business information..."
      delayMs={1800}
      onBeforeNavigate={handleBeforeNavigate}
    />
  );
} 