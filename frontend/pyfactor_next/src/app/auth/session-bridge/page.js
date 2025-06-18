'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SessionBridge() {
  const router = useRouter();

  useEffect(() => {
    // Get session data from sessionStorage (set during login)
    const bridgeData = sessionStorage.getItem('session_bridge');
    
    if (!bridgeData) {
      console.error('[SessionBridge] No bridge data found');
      router.push('/auth/signin');
      return;
    }

    try {
      const { token, redirectUrl, timestamp } = JSON.parse(bridgeData);
      
      // Verify the bridge data is recent (within 30 seconds)
      if (Date.now() - timestamp > 30000) {
        console.error('[SessionBridge] Bridge data expired');
        sessionStorage.removeItem('session_bridge');
        router.push('/auth/signin');
        return;
      }

      // Clear the bridge data immediately
      sessionStorage.removeItem('session_bridge');

      // Submit form programmatically
      const form = document.getElementById('session-form');
      if (form) {
        form.submit();
      }
    } catch (error) {
      console.error('[SessionBridge] Error processing bridge data:', error);
      router.push('/auth/signin');
    }
  }, [router]);

  // Get bridge data for form
  let token = '';
  let redirectUrl = '/dashboard';
  
  if (typeof window !== 'undefined') {
    const bridgeData = sessionStorage.getItem('session_bridge');
    if (bridgeData) {
      try {
        const parsed = JSON.parse(bridgeData);
        token = parsed.token;
        redirectUrl = parsed.redirectUrl;
      } catch (e) {
        // Ignore parse errors
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Securing your session...</p>
        
        {/* Hidden form for POST submission */}
        <form 
          id="session-form"
          method="POST" 
          action="/api/auth/establish-session"
          style={{ display: 'none' }}
        >
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="redirectUrl" value={redirectUrl} />
          <input type="hidden" name="timestamp" value={Date.now()} />
        </form>
      </div>
    </div>
  );
}