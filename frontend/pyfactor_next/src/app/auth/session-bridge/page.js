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

      // First, exchange the bridge token for the actual session token
      setStatus('Exchanging bridge token...');
      console.log('[SessionBridge] 🔄 Exchanging bridge token for session token...');
      console.log('[SessionBridge] Bridge token:', token?.substring(0, 20) + '...');
      
      try {
        const bridgeUrl = `/api/auth/bridge-session?token=${encodeURIComponent(token)}`;
        console.log('[SessionBridge] Calling bridge URL:', bridgeUrl);
        
        const bridgeResponse = await fetch(bridgeUrl);
        console.log('[SessionBridge] Bridge response status:', bridgeResponse.status);
        
        if (!bridgeResponse.ok) {
          console.error('[SessionBridge] ❌ Failed to exchange bridge token:', bridgeResponse.status);
          const errorText = await bridgeResponse.text();
          console.error('[SessionBridge] Error response:', errorText);
          router.push('/auth/signin?error=bridge_exchange_failed');
          return;
        }
        
        const bridgeResult = await bridgeResponse.json();
        console.log('[SessionBridge] ✅ Bridge exchange successful');
        console.log('[SessionBridge] Bridge exchange result:', {
          success: bridgeResult.success,
          hasSessionToken: !!bridgeResult.sessionToken,
          sessionTokenLength: bridgeResult.sessionToken?.length,
          email: bridgeResult.email,
          tenantId: bridgeResult.tenantId
        });
        
        if (!bridgeResult.success || !bridgeResult.sessionToken) {
          console.error('[SessionBridge] No session token in bridge response');
          router.push('/auth/signin?error=no_session_token');
          return;
        }
        
        // Set the session token in state to update the form
        setStatus('Establishing session...');
        console.log('[SessionBridge] 📝 Setting session token in state...');
        setSessionToken(bridgeResult.sessionToken);
        setRedirectUrl(redirectUrl || '/dashboard');
        
        // Wait for next render cycle to ensure form is updated
        console.log('[SessionBridge] ⏱️  Waiting for form to update...');
        setTimeout(() => {
          console.log('[SessionBridge] 🔍 Looking for form element...');
          const form = document.getElementById('session-form');
          console.log('[SessionBridge] Form element found:', !!form);
          
          if (form) {
            console.log('[SessionBridge] ✅ Form found, preparing submission...');
            
            // Log all form inputs
            const formData = new FormData(form);
            const formEntries = {};
            for (const [key, value] of formData.entries()) {
              formEntries[key] = key === 'token' ? `${value.substring(0, 20)}...` : value;
            }
            
            console.log('[SessionBridge] 📋 Form submission data:', {
              action: form.action,
              method: form.method,
              tokenLength: bridgeResult.sessionToken?.length,
              isUUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bridgeResult.sessionToken),
              formData: formEntries
            });
            
            // Submit the form
            console.log('[SessionBridge] 🚀 Submitting form to establish session...');
            form.submit();
          } else {
            console.error('[SessionBridge] ❌ Form element not found!');
            console.log('[SessionBridge] DOM debug - body innerHTML length:', document.body.innerHTML.length);
            console.log('[SessionBridge] DOM debug - forms in document:', document.forms.length);
            console.log('[SessionBridge] DOM debug - element by ID:', document.getElementById('session-form'));
            
            // As a fallback, try direct navigation with session cookie
            console.log('[SessionBridge] 🔄 Attempting direct navigation as fallback');
            router.push(redirectUrl || '/dashboard');
          }
        }, 200); // Increased delay to ensure state update
      } catch (error) {
        console.error('[SessionBridge] Error exchanging bridge token:', error);
        router.push('/auth/signin?error=bridge_error');
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