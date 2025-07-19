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
      
      // CRITICAL DEBUG: Log the exact token retrieved
      console.log('🔴 [SessionBridge] CRITICAL: Token retrieved from sessionStorage:', token);
      console.log('🔴 [SessionBridge] Token first 20 chars:', token?.substring(0, 20));
      console.log('🔴 [SessionBridge] Token last 20 chars:', token?.substring(token.length - 20));
      console.log('🔴 [SessionBridge] Token length:', token?.length);
      console.log('🔴 [SessionBridge] Token type check:', {
        isUUID: token && token.length === 36 && token.includes('-'),
        isBackendSession: token === 'backend_session',
        tokenValue: token
      });
      console.log('🔴 [SessionBridge] Full bridge data:', parsed);
      
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
      
      // Update state for form submission
      setSessionToken(token);
      setRedirectUrl(redirectUrl || '/dashboard');
      
      // Use form submission as it's more reliable for cookies with Cloudflare
      console.log('[SessionBridge] 📝 Using form-based session establishment for Cloudflare compatibility...');
      
      // Create and submit form programmatically
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = '/api/auth/establish-session-form';
      form.style.display = 'none';
      
      const tokenInput = document.createElement('input');
      tokenInput.type = 'hidden';
      tokenInput.name = 'token';
      tokenInput.value = token;
      form.appendChild(tokenInput);
      
      const redirectInput = document.createElement('input');
      redirectInput.type = 'hidden';
      redirectInput.name = 'redirectUrl';
      redirectInput.value = redirectUrl || '/dashboard';
      form.appendChild(redirectInput);
      
      document.body.appendChild(form);
      
      console.log('[SessionBridge] 📨 Submitting form to establish session...');
      // Use form submission for better cookie handling with Cloudflare
      form.submit();
      return;
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
        action="/api/auth/establish-session-form"
        style={{ display: 'none' }}
      >
        <input type="hidden" name="token" value={sessionToken} />
        <input type="hidden" name="redirectUrl" value={redirectUrl} />
        <input type="hidden" name="timestamp" value={Date.now()} />
      </form>
    </div>
  );
}