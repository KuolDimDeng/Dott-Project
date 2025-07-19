'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import OAuthLoadingScreen from '@/components/auth/OAuthLoadingScreen';

console.log('🚨 SessionBridge PAGE FILE LOADED AT:', new Date().toISOString());
console.log('🚨 Current URL:', typeof window !== 'undefined' ? window.location.href : 'SSR');

export default function SessionBridge() {
  console.log('🔥 SessionBridge component FUNCTION called!');
  console.log('🔥 SessionBridge rendering at:', new Date().toISOString());
  const router = useRouter();
  const [sessionToken, setSessionToken] = useState('');
  const [redirectUrl, setRedirectUrl] = useState('/dashboard');
  const [status, setStatus] = useState('Securing your session...');
  
  console.log('🔥 SessionBridge component variables initialized');

  useEffect(() => {
    const processBridge = async () => {
      console.log('[SessionBridge] ========== COMPONENT MOUNTED ==========');
      console.log('[SessionBridge] Starting bridge processing...');
      
      // Get session data from sessionStorage (set during login)
      const bridgeData = sessionStorage.getItem('session_bridge');
      console.log('[SessionBridge] Bridge data exists:', !!bridgeData);
      console.log('[SessionBridge] Bridge data raw:', bridgeData);
      
      if (!bridgeData) {
        console.error('[SessionBridge] ❌ No bridge data found in sessionStorage');
        console.log('[SessionBridge] SessionStorage keys:', Object.keys(sessionStorage));
        console.log('[SessionBridge] SessionStorage contents:', 
          Object.fromEntries(Object.keys(sessionStorage).map(key => [key, sessionStorage.getItem(key)]))
        );
        console.log('[SessionBridge] Redirecting to signin with no_bridge_data error');
        router.push('/auth/signin?error=no_bridge_data');
        return;
      }

      try {
      const parsed = JSON.parse(bridgeData);
      console.log('[SessionBridge] ✅ Successfully parsed bridge data');
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

      // Skip the bridge-session step and go directly to establish-session
      // The token from sessionStorage is already our session token
      setStatus('Establishing session...');
      console.log('[SessionBridge] 🔄 Preparing to establish session directly...');
      console.log('[SessionBridge] Session token:', token?.substring(0, 20) + '...');
      
      // Use AJAX to establish session instead of form POST
      console.log('[SessionBridge] 📝 Using AJAX to establish session...');
      setSessionToken(token);
      setRedirectUrl(redirectUrl || '/dashboard');
      
      try {
        console.log('[SessionBridge] 🚀 Sending AJAX request to establish session...');
        const establishResponse = await fetch('/api/auth/establish-session-ajax', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token,
            redirectUrl: redirectUrl || '/dashboard'
          }),
          credentials: 'include' // Important for cookies
        });
        
        console.log('[SessionBridge] AJAX response status:', establishResponse.status);
        const result = await establishResponse.json();
        console.log('[SessionBridge] AJAX response:', result);
        
        if (result.success) {
          console.log('[SessionBridge] ✅ Session established successfully via AJAX');
          console.log('[SessionBridge] 🔄 Redirecting to:', result.redirectUrl);
          
          // Verify cookies are set before redirecting
          const verifyCookiesAndRedirect = () => {
            // Check if cookies are visible to JavaScript (though session cookies are httpOnly)
            const allCookies = document.cookie;
            console.log('[SessionBridge] Cookie check before redirect:', allCookies);
            
            // Add a slightly longer delay to ensure cookies are processed
            setTimeout(() => {
              console.log('[SessionBridge] Performing redirect to:', result.redirectUrl);
              window.location.href = result.redirectUrl;
            }, 300);
          };
          
          verifyCookiesAndRedirect();
        } else {
          console.error('[SessionBridge] ❌ AJAX session establishment failed:', result.error);
          router.push('/auth/signin?error=session_establishment_failed');
        }
      } catch (ajaxError) {
        console.error('[SessionBridge] ❌ AJAX request failed:', ajaxError);
        
        // Fallback to form submission
        console.log('[SessionBridge] 🔄 Falling back to form submission...');
        setTimeout(() => {
          const form = document.getElementById('session-form');
          if (form) {
            console.log('[SessionBridge] 📋 Submitting form as fallback...');
            form.submit();
          } else {
            console.error('[SessionBridge] ❌ Form element not found for fallback!');
            router.push('/auth/signin?error=session_bridge_failed');
          }
        }, 200);
      }
    } catch (error) {
      console.error('[SessionBridge] ❌ Error processing bridge data:', error);
      console.error('[SessionBridge] Error stack:', error.stack);
      router.push('/auth/signin?error=bridge_error');
    }
    };
    
    // Add error catching for the entire process
    try {
      processBridge();
    } catch (error) {
      console.error('[SessionBridge] ❌ Critical error in processBridge:', error);
      console.error('[SessionBridge] Critical error stack:', error.stack);
      router.push('/auth/signin?error=critical_error');
    }
  }, [router]);

  return (
    <div>
      <OAuthLoadingScreen status={status} />
      
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
  );
}