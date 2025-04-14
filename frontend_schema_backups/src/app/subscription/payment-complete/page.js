useEffect(() => {
  const handlePaymentComplete = async () => {
    try {
      setLoading(true);
      setMessage('Payment successful! Finalizing your account...');
      
      // Update Cognito attributes with completion status
      try {
        await Auth.updateUserAttributes(Auth.currentAuthenticatedUser(), {
          'custom:onboarding': 'COMPLETE',
          'custom:onboarding_step': 'complete',
          'custom:setupdone': 'true',
          'custom:setup_rlsused': 'true',
          'custom:updated_at': new Date().toISOString()
        });
      } catch (err) {
        console.error('Failed to update Cognito attributes:', err);
      }
      
      // Set app cache for immediate UI feedback
      if (typeof window !== 'undefined') {
        window.__APP_CACHE = window.__APP_CACHE || {};
        window.__APP_CACHE.onboarding = window.__APP_CACHE.onboarding || {};
        window.__APP_CACHE.setup = window.__APP_CACHE.setup || {};
        
        // Onboarding completion
        window.__APP_CACHE.onboarding.status = 'COMPLETE';
        window.__APP_CACHE.onboarding.step = 'complete';
        window.__APP_CACHE.onboarding.setupCompleted = true;
        window.__APP_CACHE.onboarding.setupTimestamp = Date.now();
        
        // Setup configuration
        window.__APP_CACHE.setup.skipDatabaseCreation = true;
        window.__APP_CACHE.setup.useRLS = true;
        window.__APP_CACHE.setup.skipSchemaCreation = true;
      }
      
      // Trigger background setup before redirecting
      const requestId = crypto.randomUUID();
      
      // Fire-and-forget background setup
      fetch('/api/onboarding/background-setup?plan=paid&background=true', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Background-Setup': 'true',
          'X-Request-ID': requestId
        },
        keepalive: true,
        body: JSON.stringify({
          plan: 'paid',
          timestamp: Date.now(),
          requestId,
          paymentComplete: true
        })
      }).catch(() => {
        // Ignore errors - background process
      });
      
      // Prefetch dashboard data
      fetch('/api/dashboard/initial-data?prefetch=true', {
        headers: {
          'x-prefetch': 'true',
          'Cache-Control': 'no-store'
        }
      }).catch(() => {
        // Ignore prefetch errors
      });
      
      // Show success message briefly, then redirect
      setMessage('Payment processed successfully! Redirecting to your dashboard...');
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        window.location.href = '/dashboard?newAccount=true&setupBackground=true';
      }, 1500);
      
    } catch (error) {
      setError('There was an error processing your payment. Please contact support.');
      setLoading(false);
    }
  };
  
  handlePaymentComplete();
}, []); 