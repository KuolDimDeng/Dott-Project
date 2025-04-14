const handleSelectPlan = (plan) => {
  if (isSubmitting) return;
  
  if (plan === 'free') {
    // Set loading state while we prepare
    setIsSubmitting(true);
    
    // Update Cognito attributes with setup config
    try {
      Auth.updateUserAttributes(Auth.currentAuthenticatedUser(), {
        'custom:onboarding': 'COMPLETE',
        'custom:onboarding_step': 'complete',
        'custom:setupdone': 'true',
        'custom:setup_freeplan': 'true',
        'custom:setup_rlsused': 'true',
        'custom:setup_skipdatabase': 'true',
        'custom:updated_at': new Date().toISOString()
      }).catch(err => {
        console.error('Failed to update Cognito attributes:', err);
      });
    } catch (err) {
      console.error('Failed to update user attributes:', err);
    }
    
    // Store in app cache instead of localStorage and cookies
    try {
      // Initialize app cache
      if (typeof window !== 'undefined') {
        window.__APP_CACHE = window.__APP_CACHE || {};
        window.__APP_CACHE.setup = window.__APP_CACHE.setup || {};
        
        // Store setup configuration
        window.__APP_CACHE.setup.skipDatabaseCreation = true;
        window.__APP_CACHE.setup.useRLS = true;
        window.__APP_CACHE.setup.skipSchemaCreation = true;
        window.__APP_CACHE.setup.freePlanSelected = true;
        
        // Store onboarding state
        window.__APP_CACHE.onboarding = window.__APP_CACHE.onboarding || {};
        window.__APP_CACHE.onboarding.step = 'complete';
        window.__APP_CACHE.onboarding.status = 'COMPLETE';
        window.__APP_CACHE.onboarding.setupCompleted = true;
        window.__APP_CACHE.onboarding.setupTimestamp = Date.now();
      }
    } catch (e) {
      // Ignore storage errors
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