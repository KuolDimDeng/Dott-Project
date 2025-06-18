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