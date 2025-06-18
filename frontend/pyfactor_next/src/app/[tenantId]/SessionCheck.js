'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { isAuthenticated } from '@/utils/sessionManager';

export default function SessionCheck({ children }) {
  const router = useRouter();
  const params = useParams();
  const [isChecking, setIsChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    async function checkSession() {
      try {
        // First check if session is being established
        const sessionEstablishing = document.cookie.includes('session_establishing=true');
        
        if (sessionEstablishing) {
          console.log('[SessionCheck] Session is being established, waiting for completion...');
          
          // Wait for session to be established (max 15 seconds)
          const maxAttempts = 30;
          let attempts = 0;
          
          while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Check if session cookies are now available
            const hasDottAuth = document.cookie.includes('dott_auth_session');
            const hasSessionToken = document.cookie.includes('session_token');
            const stillEstablishing = document.cookie.includes('session_establishing=true');
            
            console.log(`[SessionCheck] Attempt ${attempts + 1}: cookies found=${hasDottAuth || hasSessionToken}, still establishing=${stillEstablishing}`);
            
            if ((hasDottAuth || hasSessionToken) && !stillEstablishing) {
              console.log('[SessionCheck] Session cookies detected, verifying with backend...');
              
              // Give it a bit more time for server-side propagation
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              // Now check with session manager
              const authenticated = await isAuthenticated();
              if (authenticated) {
                console.log('[SessionCheck] Session verified successfully');
                setHasSession(true);
                setIsChecking(false);
                return;
              }
            }
            
            attempts++;
          }
          
          console.warn('[SessionCheck] Session establishment timeout after', attempts, 'attempts');
        }
        
        // Use SessionManager to check authentication
        const authenticated = await isAuthenticated();
        
        if (authenticated) {
          console.log('[SessionCheck] User is authenticated');
          setHasSession(true);
        } else {
          // Check if we're in the process of establishing a session
          const pendingSession = sessionStorage.getItem('pendingSession');
          if (pendingSession) {
            console.log('[SessionCheck] Found pending session, waiting...');
            
            // Use sessionManager to wait for session
            const { waitForSession } = await import('@/utils/sessionManager');
            const session = await waitForSession(10, 1000); // Wait up to 10 seconds
            
            if (session && session.authenticated) {
              console.log('[SessionCheck] Session established successfully');
              setHasSession(true);
              sessionStorage.removeItem('pendingSession');
            } else {
              // No valid session, redirect to sign-in
              console.log('[SessionCheck] No valid session found, redirecting...');
              router.push(`/auth/signin?returnTo=/${params.tenantId}/dashboard`);
            }
          } else {
            // Check for any cookies that might indicate a session
            const hasDottAuth = document.cookie.includes('dott_auth_session');
            const hasSessionToken = document.cookie.includes('session_token');
            
            if (hasDottAuth || hasSessionToken) {
              console.log('[SessionCheck] Found session cookies, attempting to verify...');
              // Wait a bit more for server-side propagation
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              // Try one more time
              const finalCheck = await isAuthenticated();
              if (finalCheck) {
                console.log('[SessionCheck] Session verified on retry');
                setHasSession(true);
                setIsChecking(false);
                return;
              }
            }
            
            // No session and no pending session, redirect to sign-in
            console.log('[SessionCheck] No session found, redirecting...');
            router.push(`/auth/signin?returnTo=/${params.tenantId}/dashboard`);
          }
        }
      } catch (error) {
        console.error('[SessionCheck] Error checking session:', error);
        router.push(`/auth/signin?returnTo=/${params.tenantId}/dashboard`);
      } finally {
        setIsChecking(false);
      }
    }

    checkSession();
  }, [router, params.tenantId]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!hasSession) {
    return null; // Will redirect
  }

  return <>{children}</>;
}