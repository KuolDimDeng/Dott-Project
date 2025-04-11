// Handle the free plan selection
const handleFreePlanSelect = async () => {
  logger.info('[SubscriptionForm] Free plan selected');
  setSelectedPlan('free');
  setPlanType('free');
  setShowConfirmation(true);
};

// Handle confirmation of the free plan selection
const handleConfirmFreePlan = async () => {
  logger.info('[SubscriptionForm] Free plan selection confirmed');
  setIsUpdating(true);
  setLoadingText('Processing free plan...');
  
  // Log the plan selection details
  logger.debug('[SubscriptionForm] Plan selection confirmed:', {
    plan: 'basic',
    billingCycle: selectedInterval,
    price: 'Free'
  });
  
  // Set a safety timeout to redirect to dashboard in case of any issues
  const safetyTimeout = setTimeout(() => {
    logger.warn('[SubscriptionForm] Safety timeout triggered for free plan - redirecting to dashboard');
    window.location.href = '/dashboard?source=timeout&freePlan=true';
  }, 5000);
  
  try {
    // Call the onSelectPlan prop if available
    if (typeof onSelectPlan === 'function') {
      await onSelectPlan({
        id: 'basic',
        name: 'Basic',
        price: { monthly: '0', annual: '0' }
      });
    } else {
      // Fallback - use the window.location directly
      logger.warn('[SubscriptionForm] No onSelectPlan prop, using direct redirect');
      
      // Set cookies for the free plan
      const expiresDate = new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000);
      document.cookie = `selectedPlan=free; path=/; expires=${expiresDate.toUTCString()}; samesite=lax`;
      document.cookie = `billingCycle=${selectedInterval}; path=/; expires=${expiresDate.toUTCString()}; samesite=lax`;
      document.cookie = `freePlanSelected=true; path=/; expires=${expiresDate.toUTCString()}; samesite=lax`;
      document.cookie = `onboardingStep=complete; path=/; expires=${expiresDate.toUTCString()}; samesite=lax`;
      
      // Go to dashboard
      window.location.href = '/dashboard?newAccount=true&plan=free&direct=true';
    }
  } catch (error) {
    logger.error('[SubscriptionForm] Error confirming free plan:', error);
    setError('An error occurred while processing your request. Please try again.');
    
    // Clear the safety timeout
    clearTimeout(safetyTimeout);
    
    // Still set a final fallback redirect after 2 more seconds
    setTimeout(() => {
      logger.warn('[SubscriptionForm] Error fallback - redirecting to dashboard');
      window.location.href = '/dashboard?source=error&freePlan=true';
    }, 2000);
  }
}; 