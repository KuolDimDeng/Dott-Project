// PostHog Environment Check Utility
// Run this to verify PostHog configuration

export function checkPostHogConfig() {
  console.log('=== PostHog Configuration Check ===');
  
  // Check environment variables
  console.log('\n1. Environment Variables:');
  console.log('NEXT_PUBLIC_POSTHOG_KEY:', process.env.NEXT_PUBLIC_POSTHOG_KEY ? 
    `${process.env.NEXT_PUBLIC_POSTHOG_KEY.substring(0, 10)}...` : 'NOT SET ❌');
  console.log('NEXT_PUBLIC_POSTHOG_HOST:', process.env.NEXT_PUBLIC_POSTHOG_HOST || 'Using default (https://app.posthog.com)');
  
  // Check if running in browser
  if (typeof window !== 'undefined') {
    console.log('\n2. Browser Environment:');
    console.log('Window.posthog exists:', !!window.posthog ? '✅' : '❌');
    console.log('Navigator online:', navigator.onLine ? '✅' : '❌');
    
    if (window.posthog) {
      console.log('\n3. PostHog Instance:');
      console.log('Distinct ID:', window.posthog.get_distinct_id?.());
      console.log('Session ID:', window.posthog.get_session_id?.());
      console.log('API Host:', window.posthog.config?.api_host);
      console.log('Persistence:', window.posthog.config?.persistence);
      
      console.log('\n4. Local Storage Keys:');
      const phKeys = Object.keys(localStorage).filter(k => k.includes('posthog'));
      console.log('PostHog keys in localStorage:', phKeys.length > 0 ? phKeys : 'None found ❌');
      
      console.log('\n5. Queue Status:');
      console.log('Request queue length:', window.posthog._request_queue?.length || 0);
    }
  }
  
  console.log('\n=== End Configuration Check ===');
  
  // Return configuration status
  return {
    hasApiKey: !!process.env.NEXT_PUBLIC_POSTHOG_KEY,
    isInitialized: typeof window !== 'undefined' && !!window.posthog,
    isOnline: typeof window !== 'undefined' && navigator.onLine
  };
}

// Add to window for easy console access
if (typeof window !== 'undefined') {
  window.checkPostHog = checkPostHogConfig;
}