'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SessionBridge() {
  const router = useRouter();

  useEffect(() => {
    const processBridge = async () => {
      console.log('[SessionBridge] Component mounted');
      
      // Get session data from sessionStorage (set during login)
      const bridgeData = sessionStorage.getItem('session_bridge');
      console.log('[SessionBridge] Bridge data exists:', !!bridgeData);
      
      if (!bridgeData) {
        console.error('[SessionBridge] No bridge data found in sessionStorage');
        console.log('[SessionBridge] SessionStorage keys:', Object.keys(sessionStorage));
        router.push('/auth/signin?error=no_bridge_data');
        return;
      }

      try {
      const parsed = JSON.parse(bridgeData);
      console.log('[SessionBridge] Parsed bridge data:', {
        hasToken: !!parsed.token,
        tokenLength: parsed.token?.length,
        redirectUrl: parsed.redirectUrl,
        timestamp: parsed.timestamp,
        age: Date.now() - parsed.timestamp
      });
      
      const { token, redirectUrl, timestamp } = parsed;
      
      // Verify the bridge data is recent (within 30 seconds)
      if (Date.now() - timestamp > 30000) {
        console.error('[SessionBridge] Bridge data expired', {
          age: Date.now() - timestamp,
          maxAge: 30000
        });
        sessionStorage.removeItem('session_bridge');
        router.push('/auth/signin?error=bridge_expired');
        return;
      }

      // Clear the bridge data immediately
      sessionStorage.removeItem('session_bridge');
      console.log('[SessionBridge] Bridge data cleared from sessionStorage');

      // First, exchange the bridge token for the actual session token
      console.log('[SessionBridge] Exchanging bridge token for session token...');
      
      try {
        const bridgeResponse = await fetch(`/api/auth/bridge-session?token=${encodeURIComponent(token)}`);
        
        if (!bridgeResponse.ok) {
          console.error('[SessionBridge] Failed to exchange bridge token:', bridgeResponse.status);
          router.push('/auth/signin?error=bridge_exchange_failed');
          return;
        }
        
        const bridgeResult = await bridgeResponse.json();
        console.log('[SessionBridge] Bridge exchange result:', {
          success: bridgeResult.success,
          hasSessionToken: !!bridgeResult.sessionToken,
          email: bridgeResult.email,
          tenantId: bridgeResult.tenantId
        });
        
        if (!bridgeResult.success || !bridgeResult.sessionToken) {
          console.error('[SessionBridge] No session token in bridge response');
          router.push('/auth/signin?error=no_session_token');
          return;
        }
        
        // Now use the actual session token
        const sessionToken = bridgeResult.sessionToken;
        
        // Submit form programmatically with the real session token
        const form = document.getElementById('session-form');
        console.log('[SessionBridge] Form element found:', !!form);
        
        if (form) {
          // Update the token input with the real session token
          const tokenInput = form.querySelector('input[name="token"]');
          if (tokenInput) {
            tokenInput.value = sessionToken;
          }
          
          // Log all form inputs
          const formData = new FormData(form);
          const formEntries = {};
          for (const [key, value] of formData.entries()) {
            formEntries[key] = key === 'token' ? `${value.substring(0, 20)}...` : value;
          }
          
          console.log('[SessionBridge] Submitting form with data:', {
            action: form.action,
            method: form.method,
            tokenLength: sessionToken?.length,
            isUUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionToken),
            formData: formEntries
          });
          
          // Add a small delay to ensure form is ready
          setTimeout(() => {
            console.log('[SessionBridge] Actually submitting form now');
            form.submit();
          }, 100);
        } else {
          console.error('[SessionBridge] Form element not found!');
          router.push('/auth/signin?error=form_not_found');
        }
      } catch (error) {
        console.error('[SessionBridge] Error exchanging bridge token:', error);
        router.push('/auth/signin?error=bridge_error');
      }
    } catch (error) {
      console.error('[SessionBridge] Error processing bridge data:', error);
      router.push('/auth/signin?error=bridge_error');
    }
    };
    
    processBridge();
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