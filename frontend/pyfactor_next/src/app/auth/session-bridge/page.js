'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SessionBridge() {
  const router = useRouter();
  const [sessionToken, setSessionToken] = useState('');
  const [redirectUrl, setRedirectUrl] = useState('/dashboard');

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
        
        // Set the session token in state to update the form
        setSessionToken(bridgeResult.sessionToken);
        setRedirectUrl(redirectUrl || '/dashboard');
        
        // Wait for next render cycle to ensure form is updated
        setTimeout(() => {
          const form = document.getElementById('session-form');
          console.log('[SessionBridge] Form element found:', !!form);
          
          if (form) {
            // Log all form inputs
            const formData = new FormData(form);
            const formEntries = {};
            for (const [key, value] of formData.entries()) {
              formEntries[key] = key === 'token' ? `${value.substring(0, 20)}...` : value;
            }
            
            console.log('[SessionBridge] Submitting form with data:', {
              action: form.action,
              method: form.method,
              tokenLength: bridgeResult.sessionToken?.length,
              isUUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bridgeResult.sessionToken),
              formData: formEntries
            });
            
            // Submit the form
            console.log('[SessionBridge] Actually submitting form now');
            form.submit();
          } else {
            console.error('[SessionBridge] Form element not found!');
            // As a fallback, try direct navigation with session cookie
            console.log('[SessionBridge] Attempting direct navigation as fallback');
            router.push(redirectUrl || '/dashboard');
          }
        }, 200); // Increased delay to ensure state update
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Securing your session...</p>
        
        {/* Hidden form for POST submission - uses state values */}
        <form 
          id="session-form"
          method="POST" 
          action="/api/auth/establish-session"
          style={{ display: 'none' }}
        >
          <input type="hidden" name="token" value={sessionToken} />
          <input type="hidden" name="redirectUrl" value={redirectUrl} />
          <input type="hidden" name="timestamp" value={Date.now()} />
        </form>
      </div>
    </div>
  );
}