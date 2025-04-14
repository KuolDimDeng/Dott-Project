'use client';

import TransitionPage from '../TransitionPage';
import { ONBOARDING_STEPS } from '@/constants/onboarding';
import { setCacheValue } from '@/utils/appCache';
import { updateUserAttributes } from '@/utils/cognitoAttributes';

export default function BusinessInfoToSubscriptionTransition() {
  // Handle server-side redirects if needed by storing session
  const handleBeforeNavigate = async () => {
    try {
      // Update Cognito attributes
      const attributes = {
        'custom:onboarding_step': ONBOARDING_STEPS.SUBSCRIPTION,
        'custom:business_info_completed': 'true'
      };
      
      // Update Cognito in background
      updateUserAttributes(attributes).catch(err => {
        console.error('Error updating Cognito attributes:', err);
      });
      
      // Update AppCache for immediate access
      setCacheValue('user_pref_custom:onboarding_step', ONBOARDING_STEPS.SUBSCRIPTION, { ttl: 24 * 60 * 60 * 1000 });
      setCacheValue('user_pref_custom:business_info_completed', 'true', { ttl: 24 * 60 * 60 * 1000 });
    } catch (e) {
      console.error('Error setting transition state:', e);
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