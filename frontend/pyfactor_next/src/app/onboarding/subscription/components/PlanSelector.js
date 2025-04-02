const handleSelectPlan = (plan) => {
  if (isSubmitting) return;
  
  if (plan === 'free') {
    // Set loading state while we prepare
    setIsSubmitting(true);
    
    // For RLS implementation, set all required flags/cookies
    setCookie('setupSkipDatabaseCreation', 'true');
    setCookie('setupUseRLS', 'true');
    setCookie('skipSchemaCreation', 'true');
    setCookie('freePlanSelected', 'true');
    setCookie('onboardingStep', 'complete'); // Mark as complete immediately
    setCookie('onboardedStatus', 'COMPLETE');
    setCookie('setupCompleted', 'true');
    
    // Store in localStorage for redundancy
    try {
      localStorage.setItem('setupSkipDatabaseCreation', 'true');
      localStorage.setItem('setupUseRLS', 'true');
      localStorage.setItem('skipSchemaCreation', 'true');
      localStorage.setItem('freePlanSelected', 'true');
      localStorage.setItem('onboardingStep', 'complete');
      localStorage.setItem('setupCompleted', 'true');
      localStorage.setItem('setupTimestamp', Date.now().toString());
    } catch (e) {
      // Ignore localStorage errors
    }
    
    // Trigger background setup via a fire-and-forget API call
    const setupInBackground = async () => {
      try {
        // Generate a unique request ID
        const requestId = crypto.randomUUID();
        
        // Create URL with parameters for tracking
        const url = `/api/onboarding/background-setup?plan=free&timestamp=${Date.now()}&requestId=${requestId}&background=true`;
        
        // Use fetch with no-cors to avoid waiting for response
        fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Background-Setup': 'true',
            'X-Request-ID': requestId
          },
          // Don't wait for response with keepalive
          keepalive: true,
          // Add basic body data
          body: JSON.stringify({
            plan: 'free',
            timestamp: Date.now(),
            requestId
          })
        }).catch(() => {
          // Ignore errors - this is background processing
        });
        
      } catch (error) {
        // Ignore errors in background setup
        console.log('Background setup triggered');
      }
    };
    
    // Start the background process
    setupInBackground();
    
    // Immediately go to dashboard
    window.location.href = '/dashboard?newAccount=true&setupBackground=true';
    return;
  }
  
  // For other plans, use normal selection
  setSelectedPlan(plan);
}; 