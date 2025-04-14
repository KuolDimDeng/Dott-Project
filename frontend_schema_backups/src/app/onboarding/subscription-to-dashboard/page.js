'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import TransitionPage from '../TransitionPage';
import { ONBOARDING_STEPS } from '@/constants/onboarding';
import { setCacheValue } from '@/utils/appCache';
import { updateUserAttributes } from '@/utils/cognitoAttributes';

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
  const handleBeforeNavigate = async () => {
    try {
      // Update Cognito attributes
      const attributes = {
        'custom:onboarding_step': 'complete',
        'custom:subscription_completed': 'true',
        'custom:free_plan_selected': 'true',
        'custom:selected_plan': planData?.plan || 'free',
        'custom:onboarding_status': 'complete'
      };
      
      // Update Cognito in the background
      updateUserAttributes(attributes).catch(err => {
        console.error('Error updating Cognito attributes:', err);
      });
      
      // Update AppCache for immediate access
      setCacheValue('user_pref_custom:onboarding_step', 'complete', { ttl: 30 * 24 * 60 * 60 * 1000 });
      setCacheValue('user_pref_custom:subscription_completed', 'true', { ttl: 30 * 24 * 60 * 60 * 1000 });
      setCacheValue('user_pref_custom:free_plan_selected', 'true', { ttl: 30 * 24 * 60 * 60 * 1000 });
      setCacheValue('user_pref_custom:selected_plan', planData?.plan || 'free', { ttl: 30 * 24 * 60 * 60 * 1000 });
      setCacheValue('user_pref_custom:onboarding_status', 'complete', { ttl: 30 * 24 * 60 * 60 * 1000 });
      
      // Store plan data in sessionStorage for dashboard (keep this for immediate access during navigation)
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