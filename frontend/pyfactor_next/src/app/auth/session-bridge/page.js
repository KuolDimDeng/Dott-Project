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
      
      // CRITICAL DEBUG: Log the exact token retrieved
      console.log('🔴 [SessionBridge] CRITICAL: Token retrieved from sessionStorage:', token);
      console.log('🔴 [SessionBridge] Token first 20 chars:', token?.substring(0, 20));
      console.log('🔴 [SessionBridge] Token last 20 chars:', token?.substring(token.length - 20));
      console.log('🔴 [SessionBridge] Token length:', token?.length);
      
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
      
      // Try form submission first as it's more reliable for cookies
      console.log('[SessionBridge] 📝 Attempting form-based session establishment...');
      
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
      
      console.log('[SessionBridge] 📨 Using AJAX instead of form submission for better cookie handling...');
      // Comment out form submission to use AJAX instead
      // form.submit();
      // return;
      
      try {
        console.log('[SessionBridge] 🚀 Sending AJAX request to establish session...');
        console.log('[SessionBridge] 🔍 Token being sent:', token ? `${token.substring(0, 20)}...` : 'MISSING');
        console.log('[SessionBridge] 🔍 Token length:', token?.length);
        console.log('[SessionBridge] 🔍 Current cookies before AJAX:', document.cookie);
        
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
        console.log('[SessionBridge] AJAX response headers:', {
          'content-type': establishResponse.headers.get('content-type'),
          'set-cookie': establishResponse.headers.get('set-cookie'), // This will be null in browser for security
          'all-headers': [...establishResponse.headers.entries()]
        });
        
        const result = await establishResponse.json();
        console.log('[SessionBridge] AJAX response:', result);
        
        if (result.success) {
          console.log('[SessionBridge] ✅ Session established successfully via AJAX');
          console.log('[SessionBridge] 🔄 Redirecting to:', result.redirectUrl);
          
          // Debug: Check cookie status immediately
          console.log('[SessionBridge] 🔍 Checking cookie status immediately after AJAX...');
          console.log('[SessionBridge] 🔍 Document.cookie after AJAX:', document.cookie);
          try {
            const cookieDebugResponse = await fetch('/api/auth/debug-cookies', {
              credentials: 'include',
              headers: {
                'Cache-Control': 'no-cache'
              }
            });
            const cookieDebug = await cookieDebugResponse.json();
            console.log('[SessionBridge] 🔍 Cookie debug info:', cookieDebug);
            console.log('[SessionBridge] 🔍 Session cookies found:', {
              sid: cookieDebug.cookies.session.sid.exists,
              session_token: cookieDebug.cookies.session.session_token.exists,
              totalCookies: cookieDebug.cookies.total
            });
          } catch (debugError) {
            console.error('[SessionBridge] Error checking cookie status:', debugError);
          }
          
          // Verify cookies are set before redirecting
          const verifyCookiesAndRedirect = async () => {
            // Check if cookies are visible to JavaScript (though session cookies are httpOnly)
            const allCookies = document.cookie;
            console.log('[SessionBridge] Cookie check before redirect (document.cookie):', allCookies);
            
            // Double-check with debug endpoint - retry a few times to ensure cookies are set
            console.log('[SessionBridge] 🔍 Verifying cookies are set before redirect...');
            let cookiesSet = false;
            let retries = 0;
            const maxRetries = 3;
            
            while (!cookiesSet && retries < maxRetries) {
              try {
                await new Promise(resolve => setTimeout(resolve, 200)); // Wait 200ms between checks
                
                const finalDebugResponse = await fetch('/api/auth/debug-cookies', {
                  credentials: 'include'
                });
                const finalDebug = await finalDebugResponse.json();
                console.log(`[SessionBridge] 🔍 Cookie check attempt ${retries + 1}:`, {
                  sid: finalDebug.cookies.session.sid,
                  session_token: finalDebug.cookies.session.session_token,
                  totalCookies: finalDebug.cookies.total,
                  allCookieNames: finalDebug.cookies.all.map(c => c.name)
                });
                
                if (finalDebug.cookies.session.sid.exists || finalDebug.cookies.session.session_token.exists) {
                  console.log('[SessionBridge] ✅ Session cookies confirmed!');
                  cookiesSet = true;
                } else {
                  console.log(`[SessionBridge] ⏳ Cookies not yet set, retry ${retries + 1}/${maxRetries}`);
                }
              } catch (finalDebugError) {
                console.error('[SessionBridge] Error in cookie check:', finalDebugError);
              }
              retries++;
            }
            
            if (!cookiesSet) {
              console.error('[SessionBridge] ⚠️ WARNING: Session cookies not found after all retries!');
              console.log('[SessionBridge] ⚠️ Attempting fallback to form submission...');
              
              // Try form submission as last resort
              const form = document.getElementById('session-form');
              if (form) {
                console.log('[SessionBridge] 📋 Submitting form as fallback...');
                form.submit();
                return;
              }
            }
            
            // Proceed with redirect
            console.log('[SessionBridge] Performing redirect to:', result.redirectUrl);
            window.location.href = result.redirectUrl;
          };
          
          await verifyCookiesAndRedirect();
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