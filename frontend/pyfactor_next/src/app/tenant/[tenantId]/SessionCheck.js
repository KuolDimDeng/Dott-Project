'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getSessionFromStorage } from '@/middleware/sessionVerification';

export default function SessionCheck({ children }) {
  const router = useRouter();
  const params = useParams();
  const [isChecking, setIsChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    async function checkSession() {
      try {
        // First check for pending session from recent login
        const pendingSession = getSessionFromStorage();
        if (pendingSession) {
          console.log('[SessionCheck] Found pending session, waiting for cookie propagation...');
          
          // Give cookies time to propagate
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Verify session is now available
          const response = await fetch('/api/auth/session', {
            credentials: 'include'
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.user && data.authenticated) {
              setHasSession(true);
              setIsChecking(false);
              // Clean up pending session
              sessionStorage.removeItem('pendingSession');
              return;
            }
          }
        }
        
        // Check for existing session
        const sessionResponse = await fetch('/api/auth/session', {
          credentials: 'include'
        });
        
        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          if (sessionData.user && sessionData.authenticated) {
            setHasSession(true);
          } else {
            // No valid session, redirect to sign-in
            router.push(`/auth/signin?returnTo=/tenant/${params.tenantId}/dashboard`);
          }
        } else {
          // Session check failed, redirect to sign-in
          router.push(`/auth/signin?returnTo=/tenant/${params.tenantId}/dashboard`);
        }
      } catch (error) {
        console.error('[SessionCheck] Error checking session:', error);
        router.push(`/auth/signin?returnTo=/tenant/${params.tenantId}/dashboard`);
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