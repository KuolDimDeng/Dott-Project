useEffect(() => {
  const handlePaymentComplete = async () => {
    try {
      setLoading(true);
      setMessage('Payment successful! Finalizing your account...');
      
      // Set all required cookies and localStorage for completion
      const expiresDate = new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000);
      
      // Mark everything complete immediately for better UX
      document.cookie = `setupCompleted=true; path=/; expires=${expiresDate.toUTCString()}; samesite=lax`;
      document.cookie = `onboardingStep=complete; path=/; expires=${expiresDate.toUTCString()}; samesite=lax`;
      document.cookie = `onboardedStatus=COMPLETE; path=/; expires=${expiresDate.toUTCString()}; samesite=lax`;
      document.cookie = `setupUseRLS=true; path=/; expires=${expiresDate.toUTCString()}; samesite=lax`;
      document.cookie = `hasSession=true; path=/; expires=${expiresDate.toUTCString()}; samesite=lax`;
      
      // Set localStorage flags
      localStorage.setItem('setupCompleted', 'true');
      localStorage.setItem('setupTimestamp', Date.now().toString());
      localStorage.setItem('onboardingStep', 'complete');
      localStorage.setItem('setupUseRLS', 'true');
      
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