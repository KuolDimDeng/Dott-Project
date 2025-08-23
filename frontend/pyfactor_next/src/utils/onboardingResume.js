/**
 * Handle resuming onboarding for users with partial data
 */

export function getOnboardingResumeStep(onboardingData) {
  if (!onboardingData) {
    return '/onboarding';
  }

  const { current_step, completed_steps = [] } = onboardingData;

  // Map backend steps to frontend routes
  const stepRoutes = {
    'business_info': '/onboarding',
    'subscription': '/onboarding/subscription',
    'payment': '/onboarding/payment',
    'setup': '/onboarding/setup',
    'completed': null // They're done, shouldn't be in onboarding
  };

  // If they have a current step, go there
  if (current_step && stepRoutes[current_step]) {
    console.log(`[Onboarding Resume] Continuing from step: ${current_step}`);
    return stepRoutes[current_step];
  }

  // Otherwise, find the next incomplete step
  const allSteps = ['business_info', 'subscription', 'payment', 'setup'];
  for (const step of allSteps) {
    if (!completed_steps.includes(step)) {
      console.log(`[Onboarding Resume] Next incomplete step: ${step}`);
      return stepRoutes[step];
    }
  }

  // If all steps are complete but status isn't, something's wrong
  console.warn('[Onboarding Resume] All steps complete but status not complete');
  return '/onboarding/complete';
}

export function shouldResumeOnboarding(user, onboardingProgress) {
  // User has partial data but didn't complete onboarding
  if (!user?.onboarding_completed && onboardingProgress?.completed_steps?.length > 0) {
    return true;
  }

  // User has tenant/business but onboarding not complete
  if (!user?.onboarding_completed && (user?.tenant_id || user?.business_id)) {
    return true;
  }

  return false;
}

export function getOnboardingMessage(onboardingProgress) {
  if (!onboardingProgress) {
    return 'Welcome! Let\'s set up your business.';
  }

  const { completed_steps = [], current_step } = onboardingProgress;
  
  if (completed_steps.length === 0) {
    return 'Welcome! Let\'s set up your business.';
  }

  if (completed_steps.length > 0 && completed_steps.length < 4) {
    return `Welcome back! Let's continue where you left off (${completed_steps.length}/4 steps completed).`;
  }

  return 'Almost done! Just a few more steps.';
}